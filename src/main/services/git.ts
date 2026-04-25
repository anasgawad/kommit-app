// ============================================================
// Kommit — Git CLI Service
// Wraps child_process.execFile for safe, structured Git access
// ============================================================

import { execFile, spawn, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { rm, readFile, writeFile, access } from 'node:fs/promises'
import {
  GitStatus,
  Commit,
  Branch,
  LogOptions,
  CommitDetail,
  CommitChangedFile,
  MergeResult,
  ResetMode,
  TagOptions,
  Tag,
  StashEntry,
  StashOptions,
  RebaseAction,
  RebaseStatus,
  RebaseResult,
  ConflictFile,
  ConflictFileContent,
  GitError,
  GitNotFoundError,
  NotARepositoryError
} from '@shared/types'
import { parseStatus, parseLog, parseBranches } from './git-parser'

const execFileAsync = promisify(execFile)

export interface GitExecOptions {
  cwd: string
  maxBuffer?: number
  timeout?: number
}

export interface CloneProgress {
  phase: string
  percent: number
}

export class GitService {
  private gitPath: string = 'git'

  /**
   * Execute a raw git command and return stdout.
   * All git operations go through this method.
   */
  async exec(args: string[], cwd: string, maxBuffer?: number): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.gitPath, args, {
        cwd,
        maxBuffer: maxBuffer ?? 10 * 1024 * 1024, // 10MB default
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0', // prevent interactive prompts
          GIT_ASKPASS: '', // prevent GUI credential helpers from hanging
          LANG: 'en_US.UTF-8' // consistent output language
        },
        windowsHide: true
      })
      return stdout
    } catch (error: unknown) {
      const err = error as { code?: string; exitCode?: number; stderr?: string; message?: string }

      if (err.code === 'ENOENT') {
        throw new GitNotFoundError()
      }

      const stderr = err.stderr ?? ''
      const exitCode = err.exitCode ?? 1

      if (stderr.includes('not a git repository')) {
        throw new NotARepositoryError(cwd)
      }

      throw new GitError(
        `Git command failed: git ${args.join(' ')}\n${stderr}`,
        `git ${args.join(' ')}`,
        exitCode,
        stderr
      )
    }
  }

  /**
   * Check if git is installed and accessible.
   */
  async isGitInstalled(): Promise<boolean> {
    try {
      await this.exec(['--version'], process.cwd())
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if a directory is a git repository.
   */
  async isRepository(path: string): Promise<boolean> {
    try {
      await this.exec(['rev-parse', '--is-inside-work-tree'], path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the repository root directory from any subdirectory.
   */
  async getRepoRoot(path: string): Promise<string> {
    const root = await this.exec(['rev-parse', '--show-toplevel'], path)
    return root.trim()
  }

  /**
   * Get the current repository status (branch, staged, unstaged, untracked, conflicts).
   * Uses porcelain v2 for machine-readable output.
   */
  async status(repoPath: string): Promise<GitStatus> {
    const raw = await this.exec(
      ['status', '--porcelain=v2', '--branch', '--untracked-files=all'],
      repoPath
    )
    return parseStatus(raw)
  }

  /**
   * Get commit log with structured format.
   * Returns commits in topological order by default.
   */
  async log(repoPath: string, options: LogOptions = {}): Promise<Commit[]> {
    const { maxCount = 200, skip = 0, branch, all = true, author, search } = options

    // NUL-delimited fields for unambiguous parsing
    const format = [
      '%H', // hash
      '%h', // abbreviated hash
      '%P', // parent hashes (space-separated)
      '%an', // author name
      '%ae', // author email
      '%aI', // author date (ISO 8601)
      '%s', // subject
      '%D' // ref names
    ].join('%x00')

    const args = ['log', `--format=${format}%x00%x00`, '--topo-order', `--max-count=${maxCount}`]

    if (skip > 0) {
      args.push(`--skip=${skip}`)
    }

    if (all && !branch) {
      args.push('--all')
    }

    if (branch) {
      args.push(branch)
    }

    if (author) {
      args.push(`--author=${author}`)
    }

    if (search) {
      args.push(`--grep=${search}`)
    }

    try {
      const raw = await this.exec(args, repoPath)
      return parseLog(raw)
    } catch (error) {
      if (error instanceof GitError) {
        // Empty repo (no commits yet) returns an error
        if (error.stderr.includes('does not have any commits')) {
          return []
        }
        // Branch filter typed a partial/non-existent ref — return empty instead of throwing
        if (error.stderr.includes('unknown revision or path not in the working tree')) {
          return []
        }
      }
      throw error
    }
  }

  /**
   * Get detailed commit info including changed files.
   * Uses git show to get commit metadata and git diff-tree for file list.
   */
  async show(repoPath: string, hash: string): Promise<CommitDetail> {
    // Get full commit metadata (including body)
    const format = [
      '%H', // hash
      '%h', // abbreviated hash
      '%P', // parent hashes
      '%an', // author name
      '%ae', // author email
      '%aI', // author date (ISO 8601)
      '%s', // subject
      '%b', // body
      '%D' // ref names
    ].join('%x00')

    const logArgs = ['log', '-1', `--format=${format}%x00%x00`, hash]
    const logRaw = await this.exec(logArgs, repoPath)
    const commits = parseLog(logRaw)

    if (commits.length === 0) {
      throw new GitError(`Commit not found: ${hash}`, `git log -1 ${hash}`, 128, '')
    }

    const commit = commits[0]

    // Get changed files using diff-tree
    // --no-commit-id: suppress commit ID output
    // -r: recursive into subtrees
    // --name-status: show file names with status (A/M/D/R)
    const diffArgs = ['diff-tree', '--no-commit-id', '-r', '--name-status', hash]

    let changedFiles: CommitChangedFile[] = []
    try {
      const diffRaw = await this.exec(diffArgs, repoPath)
      changedFiles = this.parseChangedFiles(diffRaw)
    } catch (error) {
      // Root commits have no parent, diff-tree fails
      // Try diff against empty tree instead
      if (error instanceof GitError) {
        try {
          const emptyTreeArgs = [
            'diff-tree',
            '--no-commit-id',
            '-r',
            '--name-status',
            '--root',
            hash
          ]
          const diffRaw = await this.exec(emptyTreeArgs, repoPath)
          changedFiles = this.parseChangedFiles(diffRaw)
        } catch {
          // If still fails, return empty list
          changedFiles = []
        }
      }
    }

    return { commit, changedFiles }
  }

  /**
   * Parse git diff-tree --name-status output into CommitChangedFile array.
   * Format: <status>\t<path>
   */
  private parseChangedFiles(raw: string): CommitChangedFile[] {
    const lines = raw
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
    const files: CommitChangedFile[] = []

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length < 2) continue

      const statusCode = parts[0]
      const path = parts[1]

      let status: CommitChangedFile['status']
      if (statusCode === 'A') status = 'added'
      else if (statusCode === 'M') status = 'modified'
      else if (statusCode === 'D') status = 'deleted'
      else if (statusCode.startsWith('R')) status = 'renamed'
      else continue // Skip unknown statuses

      files.push({ path, status })
    }

    return files
  }

  /**
   * Get the diff of a specific file at a given commit.
   * Uses `git show <hash>:<path>` vs parent to produce a unified diff.
   * For root commits (no parent) uses `git diff 4b825dc...<hash> -- <path>` (empty tree).
   */
  async diffCommitFile(repoPath: string, hash: string, filePath: string): Promise<string> {
    try {
      return await this.exec(['diff', `${hash}^`, hash, '--', filePath], repoPath)
    } catch {
      // Root commit has no parent — diff against the empty tree
      const emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
      return await this.exec(['diff', emptyTree, hash, '--', filePath], repoPath)
    }
  }

  /**
   * List all branches (local and remote).
   */
  /**
   * List branches (local and remote).
   * Uses tab delimiter (%09) instead of NUL (%x00) due to Git for Windows limitations.
   */
  async branches(repoPath: string): Promise<Branch[]> {
    const format = [
      '%(refname:short)', // branch name
      '%(objectname:short)', // last commit hash
      '%(upstream:short)', // upstream tracking branch
      '%(upstream:track)', // [ahead N, behind M]
      '%(HEAD)', // * if current
      '%(subject)' // last commit subject
    ].join('%09')

    const localRaw = await this.exec(['branch', `--format=${format}`, '--list'], repoPath)

    let remoteRaw = ''
    try {
      remoteRaw = await this.exec(['branch', '-r', `--format=${format}`, '--list'], repoPath)
    } catch {
      // No remotes is fine
    }

    return parseBranches(localRaw, remoteRaw)
  }

  /**
   * Initialize a new git repository.
   */
  async init(dir: string): Promise<void> {
    await this.exec(['init'], dir)
  }

  /**
   * Clone a repository. Returns a ChildProcess for progress tracking.
   */
  cloneWithProgress(
    url: string,
    targetDir: string,
    onProgress?: (progress: CloneProgress) => void
  ): ChildProcess {
    const child = spawn(this.gitPath, ['clone', '--progress', url, targetDir], {
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0'
      },
      windowsHide: true
    })

    if (onProgress) {
      child.stderr?.on('data', (data: Buffer) => {
        const line = data.toString()
        // Parse progress lines like "Receiving objects:  42% (420/1000)"
        const match = line.match(/([\w\s]+):\s+(\d+)%/)
        if (match) {
          onProgress({ phase: match[1].trim(), percent: parseInt(match[2], 10) })
        }
      })
    }

    return child
  }

  /**
   * Clone a repository (simple, waits for completion).
   * Clones into a subdirectory named after the repository.
   * @param url - Git repository URL
   * @param parentDir - Parent directory where the repo folder will be created
   * @returns The full path to the cloned repository
   */
  async clone(url: string, parentDir: string): Promise<string> {
    // Extract repository name from URL
    // Examples:
    // https://github.com/user/repo.git -> repo
    // https://github.com/user/repo -> repo
    // git@github.com:user/repo.git -> repo
    const repoName =
      url
        .split('/')
        .pop()
        ?.replace(/\.git$/, '') || 'repository'

    // Clone into parent directory - git will create the repo folder
    await this.exec(['clone', url], parentDir, 500 * 1024 * 1024)

    // Return the full path to the cloned repo
    return join(parentDir, repoName)
  }

  /**
   * Stage a file for commit.
   */
  async stageFile(repoPath: string, filePath: string): Promise<void> {
    await this.exec(['add', '--', filePath], repoPath)
  }

  /**
   * Stage multiple files for commit.
   */
  async stageFiles(repoPath: string, filePaths: string[]): Promise<void> {
    await this.exec(['add', '--', ...filePaths], repoPath)
  }

  /**
   * Unstage a file.
   */
  async unstageFile(repoPath: string, filePath: string): Promise<void> {
    try {
      await this.exec(['restore', '--staged', '--', filePath], repoPath)
    } catch {
      // For initial commit (no HEAD), use rm --cached
      await this.exec(['rm', '--cached', '--', filePath], repoPath)
    }
  }

  /**
   * Discard working tree changes for a file.
   *
   * Three cases:
   * 1. Tracked modified/deleted file  → `git checkout -- <file>` (restore from index)
   * 2. Conflicted (unmerged) file     → `git checkout HEAD -- <file>` (restore from HEAD,
   *                                     clears the unmerged state)
   * 3. Untracked file                 → delete the file from disk (git doesn't track it,
   *                                     so there is nothing to restore)
   */
  async discardChanges(repoPath: string, filePath: string): Promise<void> {
    try {
      await this.exec(['checkout', '--', filePath], repoPath)
    } catch (error) {
      if (error instanceof GitError) {
        if (error.stderr.includes('is unmerged')) {
          // Conflicted file — restore from HEAD (discards both sides of the conflict)
          await this.exec(['checkout', 'HEAD', '--', filePath], repoPath)
          return
        }
        if (
          error.stderr.includes('did not match any file') ||
          error.stderr.includes('pathspec') ||
          error.stderr.includes('unknown to git')
        ) {
          // Untracked file — delete it from disk (works for both files and directories)
          await rm(join(repoPath, filePath), { recursive: true, force: true })
          return
        }
      }
      throw error
    }
  }

  /**
   * Create a new commit.
   */
  async commit(repoPath: string, message: string, options?: { amend?: boolean }): Promise<string> {
    const isAmend = options?.amend === true
    // When amending with no new message, preserve the existing commit message via --no-edit
    const args =
      isAmend && message.trim().length === 0
        ? ['commit', '--amend', '--no-edit']
        : ['commit', '-m', message]
    if (isAmend && message.trim().length > 0) {
      args.push('--amend')
    }
    const output = await this.exec(args, repoPath)
    // Extract commit hash from output
    const match = output.match(/\[[\w\s/]+\s([a-f0-9]+)\]/)
    return match ? match[1] : ''
  }

  /**
   * Create a new branch.
   */
  async createBranch(repoPath: string, name: string, startPoint?: string): Promise<void> {
    const args = ['branch', name]
    if (startPoint) {
      args.push(startPoint)
    }
    await this.exec(args, repoPath)
  }

  /**
   * Delete a branch.
   */
  async deleteBranch(repoPath: string, name: string, force = false): Promise<void> {
    await this.exec(['branch', force ? '-D' : '-d', name], repoPath)
  }

  /**
   * Rename a branch.
   */
  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    await this.exec(['branch', '-m', oldName, newName], repoPath)
  }

  /**
   * Checkout a branch or commit.
   */
  async checkout(
    repoPath: string,
    ref: string,
    options?: { createBranch?: boolean }
  ): Promise<void> {
    const args = ['checkout']
    if (options?.createBranch) {
      args.push('-b')
    }
    args.push(ref)
    await this.exec(args, repoPath)
  }

  /**
   * Get diff for unstaged changes.
   */
  async diff(repoPath: string, filePath?: string): Promise<string> {
    const args = ['diff']
    if (filePath) {
      args.push('--', filePath)
    }
    return this.exec(args, repoPath)
  }

  /**
   * Get diff for an untracked file by comparing against /dev/null.
   * git diff --no-index always exits 1 when differences are found, so we
   * catch the GitError and return stdout when the exit code is 1.
   */
  async diffUntracked(repoPath: string, filePath: string): Promise<string> {
    const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'
    try {
      return await this.exec(['diff', '--no-index', nullDevice, filePath], repoPath)
    } catch (error) {
      // git diff --no-index exits with code 1 when differences exist (always for new files).
      // The execFileAsync rejection includes stdout in some versions; reconstruct by
      // catching and re-running via execFile directly so we can read stdout.
      const err = error as { exitCode?: number; stderr?: string }
      if (err.exitCode === 1) {
        // Re-exec capturing stdout despite non-zero exit
        const { execFile } = await import('node:child_process')
        return new Promise<string>((resolve, reject) => {
          execFile(
            this.gitPath,
            ['diff', '--no-index', nullDevice, filePath],
            {
              cwd: repoPath,
              maxBuffer: 10 * 1024 * 1024,
              env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
                GIT_ASKPASS: '',
                LANG: 'en_US.UTF-8'
              },
              windowsHide: true
            },
            (execError, stdout) => {
              // exitCode 1 is expected — return stdout regardless
              if (
                execError &&
                (execError as NodeJS.ErrnoException & { code?: number }).code !== 1
              ) {
                reject(execError)
              } else {
                resolve(stdout)
              }
            }
          )
        })
      }
      throw error
    }
  }

  /**
   * Get diff for staged changes.
   */
  async diffStaged(repoPath: string, filePath?: string): Promise<string> {
    const args = ['diff', '--cached']
    if (filePath) {
      args.push('--', filePath)
    }
    return this.exec(args, repoPath)
  }

  /**
   * Merge a branch into the current branch.
   * Returns MergeResult indicating success or list of conflicted files.
   */
  async merge(
    repoPath: string,
    branch: string,
    options?: { noFf?: boolean }
  ): Promise<MergeResult> {
    const args = ['merge']
    if (options?.noFf) {
      args.push('--no-ff')
    }
    args.push(branch)

    try {
      await this.exec(args, repoPath)
      return { success: true, conflictedFiles: [] }
    } catch (error) {
      if (error instanceof GitError) {
        // Merge conflict — get conflicted files from status
        try {
          const status = await this.status(repoPath)
          const conflictedFiles = status.conflicted.map((f) => f.path)
          return { success: false, conflictedFiles }
        } catch {
          return { success: false, conflictedFiles: [] }
        }
      }
      throw error
    }
  }

  /**
   * Cherry-pick a commit onto the current branch.
   */
  async cherryPick(repoPath: string, hash: string): Promise<void> {
    try {
      await this.exec(['cherry-pick', hash], repoPath)
    } catch (err) {
      if (err instanceof GitError) {
        if (err.stderr.includes('unmerged files')) {
          throw new GitError(
            'Cannot cherry-pick: you have unmerged files. Resolve all conflicts first, then stage the resolved files with "git add" before retrying.',
            err.command,
            err.exitCode,
            err.stderr
          )
        }
        if (err.stderr.includes('conflict')) {
          throw new GitError(
            `Cherry-pick conflict: the commit could not be applied cleanly. Resolve the conflicts, stage the changes, then run "git cherry-pick --continue".`,
            err.command,
            err.exitCode,
            err.stderr
          )
        }
      }
      throw err
    }
  }

  /**
   * Revert a commit (creates a new revert commit).
   */
  async revert(repoPath: string, hash: string): Promise<void> {
    await this.exec(['revert', '--no-edit', hash], repoPath)
  }

  /**
   * Reset HEAD to a specific ref.
   * @param mode - 'soft' (keep staged), 'mixed' (unstage), 'hard' (discard all)
   */
  async reset(repoPath: string, ref: string, mode: ResetMode = 'mixed'): Promise<void> {
    await this.exec(['reset', `--${mode}`, ref], repoPath)
  }

  /**
   * Stage a single hunk via `git apply --cached`.
   * The patch must be a valid unified diff including the file header.
   */
  async stageHunk(repoPath: string, patch: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(this.gitPath, ['apply', '--cached', '--unidiff-zero', '-'], {
        cwd: repoPath,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '',
          LANG: 'en_US.UTF-8'
        },
        windowsHide: true
      })

      let stderr = ''
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(
            new GitError(
              `git apply failed: ${stderr}`,
              'git apply --cached --unidiff-zero -',
              code ?? 1,
              stderr
            )
          )
        }
      })

      child.on('error', (err) => {
        reject(err)
      })

      child.stdin?.write(patch)
      child.stdin?.end()
    })
  }

  /**
   * List all tags in the repository.
   */
  async listTags(repoPath: string): Promise<Tag[]> {
    // Use for-each-ref for structured output
    const format = [
      '%(refname:short)', // tag name
      '%(objecttype)', // tag or commit (annotated vs lightweight)
      '%(objectname)', // full hash of the tag object (or commit for lightweight)
      '%(*objectname)', // dereferenced commit hash for annotated tags (empty for lightweight)
      '%(contents:subject)', // tag message subject
      '%(creatordate:iso-strict)' // date
    ].join('%09')

    try {
      const raw = await this.exec(
        ['for-each-ref', '--sort=-creatordate', `--format=${format}`, 'refs/tags'],
        repoPath
      )
      return this.parseTags(raw)
    } catch {
      return []
    }
  }

  private parseTags(raw: string): Tag[] {
    if (!raw || raw.trim().length === 0) return []

    const tags: Tag[] = []
    const lines = raw.split('\n').filter((l) => l.trim().length > 0)

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length < 6) continue

      const [name, objectType, objectHash, derefHash, message, dateStr] = parts
      const isAnnotated = objectType === 'tag'
      // For annotated tags, %(*objectname) gives the dereferenced commit hash.
      // For lightweight tags, %(*objectname) is empty — use objectname directly.
      const hash = isAnnotated
        ? derefHash?.trim() || objectHash?.trim() || ''
        : objectHash?.trim() || ''

      tags.push({
        name: name.trim(),
        hash: hash.trim(),
        isAnnotated,
        message: message && message.trim().length > 0 ? message.trim() : undefined,
        taggerDate: dateStr && dateStr.trim().length > 0 ? new Date(dateStr.trim()) : undefined
      })
    }

    return tags
  }

  /**
   * Create a tag (lightweight or annotated).
   */
  async createTag(repoPath: string, name: string, options?: TagOptions): Promise<void> {
    const args = ['tag']
    if (options?.message) {
      // Annotated tag
      args.push('-a', name, '-m', options.message)
    } else {
      args.push(name)
    }
    if (options?.hash) {
      args.push(options.hash)
    }
    await this.exec(args, repoPath)
  }

  /**
   * Delete a tag locally (and optionally from remote).
   */
  async deleteTag(repoPath: string, name: string, remote?: string): Promise<void> {
    await this.exec(['tag', '-d', name], repoPath)
    if (remote) {
      await this.exec(['push', remote, '--delete', name], repoPath)
    }
  }

  // ============================================================
  // Phase 4.1 — Stash Management
  // ============================================================

  /**
   * Save current changes to the stash.
   */
  async stashSave(repoPath: string, options?: StashOptions): Promise<void> {
    const args = ['stash', 'push']
    if (options?.includeUntracked) {
      args.push('--include-untracked')
    }
    if (options?.keepIndex) {
      args.push('--keep-index')
    }
    if (options?.message) {
      args.push('-m', options.message)
    }
    try {
      const output = await this.exec(args, repoPath)
      if (output.includes('No local changes to save')) {
        throw new GitError(
          'No local changes to save',
          `git ${args.join(' ')}`,
          0,
          'No local changes to save'
        )
      }
    } catch (error) {
      if (error instanceof GitError && error.stderr.includes('No local changes to save')) {
        throw error
      }
      if (error instanceof GitError && error.message.includes('No local changes to save')) {
        throw error
      }
      throw error
    }
  }

  /**
   * List all stash entries.
   * Format: <index>|<hash>|<message>|<branch>|<date>
   */
  async stashList(repoPath: string): Promise<StashEntry[]> {
    try {
      const raw = await this.exec(['stash', 'list', '--format=%gd|%H|%gs|%gi'], repoPath)
      if (!raw || raw.trim().length === 0) return []
      return this.parseStashList(raw)
    } catch {
      return []
    }
  }

  private parseStashList(raw: string): StashEntry[] {
    const entries: StashEntry[] = []
    const lines = raw
      .trim()
      .split('\n')
      .filter((l) => l.trim().length > 0)

    for (const line of lines) {
      // Format: stash@{0}|<hash>|On branch: <msg>|<isodate>
      const parts = line.split('|')
      if (parts.length < 4) continue

      const ref = parts[0].trim() // e.g. stash@{0}
      const hash = parts[1].trim()
      const subject = parts[2].trim() // e.g. "On main: my message" or "WIP on main: abc123 subject"
      const dateStr = parts[3].trim()

      // Extract index from stash@{N}
      const indexMatch = ref.match(/stash@\{(\d+)\}/)
      const index = indexMatch ? parseInt(indexMatch[1], 10) : 0

      // Extract branch and message from subject
      // Subject formats:
      //   "On main: my message"
      //   "WIP on main: abc123 commit subject"
      let branch = ''
      let message = subject
      const onMatch = subject.match(/^(?:WIP )?[Oo]n ([^:]+):\s*(.*)$/)
      if (onMatch) {
        branch = onMatch[1].trim()
        message = onMatch[2].trim()
      }

      const date = dateStr ? new Date(dateStr) : new Date()

      entries.push({ index, hash, message, branch, date })
    }

    return entries
  }

  /**
   * Apply a stash entry (keeps it in the list).
   */
  async stashApply(repoPath: string, index?: number): Promise<void> {
    const ref = index !== undefined ? `stash@{${index}}` : 'stash@{0}'
    try {
      await this.exec(['stash', 'apply', ref], repoPath)
    } catch (error) {
      if (error instanceof GitError && error.stderr.includes('conflict')) {
        throw new GitError(
          `Stash apply resulted in conflicts. Resolve conflicts and then stage the files.`,
          `git stash apply ${ref}`,
          error.exitCode,
          error.stderr
        )
      }
      throw error
    }
  }

  /**
   * Pop a stash entry (apply and remove from list).
   * If conflicts occur, the stash is kept in the list.
   */
  async stashPop(repoPath: string, index?: number): Promise<void> {
    const ref = index !== undefined ? `stash@{${index}}` : 'stash@{0}'
    try {
      await this.exec(['stash', 'pop', ref], repoPath)
    } catch (error) {
      if (error instanceof GitError && error.stderr.includes('conflict')) {
        throw new GitError(
          `Stash pop resulted in conflicts. The stash was kept. Resolve conflicts and then stage the files.`,
          `git stash pop ${ref}`,
          error.exitCode,
          error.stderr
        )
      }
      throw error
    }
  }

  /**
   * Drop a stash entry.
   */
  async stashDrop(repoPath: string, index: number): Promise<void> {
    const ref = `stash@{${index}}`
    await this.exec(['stash', 'drop', ref], repoPath)
  }

  /**
   * Show the diff of a stash entry.
   */
  async stashShow(repoPath: string, index: number): Promise<string> {
    const ref = `stash@{${index}}`
    return this.exec(['stash', 'show', '-p', ref], repoPath)
  }

  // ============================================================
  // Phase 4.2 — Interactive Rebase
  // ============================================================

  /**
   * Start an interactive rebase with the given actions.
   * Writes the rebase todo list and executes the rebase non-interactively.
   */
  async rebaseInteractive(
    repoPath: string,
    onto: string,
    actions: RebaseAction[]
  ): Promise<RebaseResult> {
    // Serialize actions to todo format
    const todo = actions.map((a) => `${a.action} ${a.hash} ${a.subject}`).join('\n')

    // Write todo to a temp file in the repo's git dir
    const gitDir = await this.getGitDir(repoPath)
    const todoPath = join(gitDir, 'kommit-rebase-todo')
    await writeFile(todoPath, todo + '\n', 'utf8')

    // Use a sequence editor that simply copies our pre-written todo
    const seqEditorScript =
      process.platform === 'win32'
        ? `@echo off && copy /y "${todoPath}" %1`
        : `cp "${todoPath}" "$1"`

    // Write the sequence editor script
    const seqEditorPath = join(gitDir, 'kommit-seq-editor')
    const scriptContent =
      process.platform === 'win32'
        ? `@echo off\ncopy /y "${todoPath.replace(/\//g, '\\')}" %1`
        : `#!/bin/sh\ncp "${todoPath}" "$1"`
    await writeFile(seqEditorPath, scriptContent, { mode: 0o755 })

    const seqEditor =
      process.platform === 'win32' ? `cmd /c "${seqEditorPath}"` : `sh "${seqEditorPath}"`

    try {
      await this.execWithEnv(['rebase', '-i', '--autostash', onto], repoPath, {
        GIT_SEQUENCE_EDITOR: seqEditor
      })
      // Clean up temp files
      await rm(todoPath, { force: true })
      await rm(seqEditorPath, { force: true })
      return { success: true, needsContinue: false, conflictedFiles: [] }
    } catch (error) {
      // Clean up temp files (best effort)
      await rm(todoPath, { force: true }).catch(() => {})
      await rm(seqEditorPath, { force: true }).catch(() => {})

      if (error instanceof GitError) {
        // Check if rebase stopped for conflicts or reword/edit
        const status = await this.status(repoPath)
        const conflictedFiles = status.conflicted.map((f) => f.path)
        if (conflictedFiles.length > 0) {
          return { success: false, needsContinue: true, conflictedFiles }
        }
        // Check if stopped for editing
        const rebaseStatus = await this.getRebaseStatus(repoPath)
        if (rebaseStatus?.inProgress) {
          return { success: false, needsContinue: true, conflictedFiles: [] }
        }
      }
      throw error
    }
  }

  /**
   * Get the git directory path (.git or submodule gitdir).
   */
  private async getGitDir(repoPath: string): Promise<string> {
    const raw = await this.exec(['rev-parse', '--git-dir'], repoPath)
    const gitDir = raw.trim()
    // If absolute, use as-is; otherwise resolve relative to repoPath
    if (gitDir.startsWith('/') || gitDir.match(/^[A-Za-z]:\\/)) {
      return gitDir
    }
    return join(repoPath, gitDir)
  }

  /**
   * Execute git command with additional environment variables.
   */
  private async execWithEnv(
    args: string[],
    cwd: string,
    extraEnv: Record<string, string>
  ): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.gitPath, args, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '',
          LANG: 'en_US.UTF-8',
          ...extraEnv
        },
        windowsHide: true
      })
      return stdout
    } catch (error: unknown) {
      const err = error as { code?: string; exitCode?: number; stderr?: string; message?: string }
      if (err.code === 'ENOENT') throw new GitNotFoundError()
      const stderr = err.stderr ?? ''
      const exitCode = err.exitCode ?? 1
      if (stderr.includes('not a git repository')) throw new NotARepositoryError(cwd)
      throw new GitError(
        `Git command failed: git ${args.join(' ')}\n${stderr}`,
        `git ${args.join(' ')}`,
        exitCode,
        stderr
      )
    }
  }

  /**
   * Continue a rebase after resolving conflicts.
   */
  async rebaseContinue(repoPath: string): Promise<void> {
    // Verify no unresolved conflicts remain
    const status = await this.status(repoPath)
    if (status.conflicted.length > 0) {
      throw new GitError(
        `Cannot continue rebase: ${status.conflicted.length} file(s) still have conflicts`,
        'git rebase --continue',
        1,
        'You must resolve all conflicts first'
      )
    }
    await this.execWithEnv(['rebase', '--continue'], repoPath, {
      GIT_EDITOR: 'true' // prevent editor opening for reword
    })
  }

  /**
   * Abort the current rebase and restore the original branch state.
   */
  async rebaseAbort(repoPath: string): Promise<void> {
    await this.exec(['rebase', '--abort'], repoPath)
  }

  /**
   * Skip the current commit during a rebase.
   */
  async rebaseSkip(repoPath: string): Promise<void> {
    await this.exec(['rebase', '--skip'], repoPath)
  }

  /**
   * Get the current rebase status by inspecting .git/rebase-merge/.
   * Returns null if no rebase is in progress.
   */
  async getRebaseStatus(repoPath: string): Promise<RebaseStatus | null> {
    try {
      const gitDir = await this.getGitDir(repoPath)
      const rebaseMergeDir = join(gitDir, 'rebase-merge')

      // Check if rebase-merge directory exists
      try {
        await access(rebaseMergeDir)
      } catch {
        return null
      }

      // Read current step and total steps
      let currentStep = 0
      let totalSteps = 0
      let currentHash = ''

      try {
        const msgnum = await readFile(join(rebaseMergeDir, 'msgnum'), 'utf8')
        currentStep = parseInt(msgnum.trim(), 10)
      } catch {
        /* file may not exist yet */
      }

      try {
        const end = await readFile(join(rebaseMergeDir, 'end'), 'utf8')
        totalSteps = parseInt(end.trim(), 10)
      } catch {
        /* file may not exist yet */
      }

      try {
        const stopped = await readFile(join(rebaseMergeDir, 'stopped-sha'), 'utf8')
        currentHash = stopped.trim()
      } catch {
        /* may not exist if not stopped */
      }

      // Get conflicted files from status
      const status = await this.status(repoPath)
      const conflictedFiles = status.conflicted.map((f) => f.path)

      return {
        inProgress: true,
        currentStep,
        totalSteps,
        currentHash,
        conflictedFiles
      }
    } catch {
      return null
    }
  }

  // ============================================================
  // Phase 4.3 — Conflict Resolution
  // ============================================================

  /**
   * Get list of files with merge conflicts.
   * Uses git ls-files -u which lists all unmerged (conflicted) files.
   */
  async getConflictedFiles(repoPath: string): Promise<ConflictFile[]> {
    try {
      const raw = await this.exec(['ls-files', '-u', '--format=%(path)'], repoPath)
      if (!raw || raw.trim().length === 0) return []

      // Deduplicate paths (each conflicted file appears 2-3 times for stages 1/2/3)
      const paths = new Set<string>()
      for (const line of raw.trim().split('\n')) {
        const path = line.trim()
        if (path) paths.add(path)
      }

      // Count conflict markers per file
      const result: ConflictFile[] = []
      for (const path of paths) {
        let conflictCount = 1
        try {
          const content = await readFile(join(repoPath, path), 'utf8')
          const matches = content.match(/^<{7} /gm)
          conflictCount = matches ? matches.length : 1
        } catch {
          /* keep default */
        }
        result.push({ path, conflictCount })
      }
      return result
    } catch {
      return []
    }
  }

  /**
   * Get the three-way content for a conflicted file.
   * Returns base (stage 1), ours (stage 2), theirs (stage 3), and current working tree.
   */
  async getConflictFileContent(repoPath: string, filePath: string): Promise<ConflictFileContent> {
    const getStage = async (stage: number): Promise<string> => {
      try {
        return await this.exec(['show', `:${stage}:${filePath}`], repoPath)
      } catch {
        return ''
      }
    }

    const [base, ours, theirs] = await Promise.all([getStage(1), getStage(2), getStage(3)])

    let result = ''
    try {
      result = await readFile(join(repoPath, filePath), 'utf8')
    } catch {
      /* file may not exist */
    }

    return { base, ours, theirs, result }
  }

  /**
   * Mark a file as resolved by staging it.
   * Throws if the file still contains conflict markers.
   */
  async markResolved(repoPath: string, filePath: string): Promise<void> {
    // Check for remaining conflict markers
    try {
      const content = await readFile(join(repoPath, filePath), 'utf8')
      if (/^<{7} |^={7}$|^>{7} /m.test(content)) {
        throw new GitError(
          `File "${filePath}" still contains conflict markers. Resolve all conflicts before marking as resolved.`,
          `git add ${filePath}`,
          1,
          'conflict markers detected'
        )
      }
    } catch (error) {
      if (error instanceof GitError) throw error
      // File read error — let git add proceed and it will catch issues
    }
    await this.exec(['add', '--', filePath], repoPath)
  }

  /**
   * Write resolved content to a file.
   * Used by the conflict resolution UI to save the merged result.
   */
  async writeResolvedFile(repoPath: string, filePath: string, content: string): Promise<void> {
    await writeFile(join(repoPath, filePath), content, 'utf8')
  }
}

// Export singleton instance
export const gitService = new GitService()
