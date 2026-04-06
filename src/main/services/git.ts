// ============================================================
// Kommit — Git CLI Service
// Wraps child_process.execFile for safe, structured Git access
// ============================================================

import { execFile, spawn, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
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
   */
  async discardChanges(repoPath: string, filePath: string): Promise<void> {
    await this.exec(['checkout', '--', filePath], repoPath)
  }

  /**
   * Create a new commit.
   */
  async commit(repoPath: string, message: string, options?: { amend?: boolean }): Promise<string> {
    const args = ['commit', '-m', message]
    if (options?.amend) {
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
    await this.exec(['cherry-pick', hash], repoPath)
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
      '%(objectname:short)', // hash of the tag object (or commit for lightweight)
      '*%(objectname:short)', // dereferenced commit hash for annotated tags
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
      // For annotated tags, the commit hash is in derefHash (prefixed with *)
      const hash = isAnnotated
        ? (derefHash?.replace(/^\*/, '') ?? objectHash ?? '')
        : (objectHash ?? '')

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
}

// Export singleton instance
export const gitService = new GitService()
