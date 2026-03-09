// ============================================================
// Kommit — Git Service Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError, GitNotFoundError, NotARepositoryError } from '../../../src/shared/types'

// Mock the entire node:child_process module and node:util
vi.mock('node:child_process')
vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  return {
    ...actual,
    promisify: (fn: (...args: unknown[]) => void) => {
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          fn(...args, (error: Error | null, stdout?: string, stderr?: string) => {
            if (error) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      }
    }
  }
})

import { execFile } from 'node:child_process'

const mockExecFile = vi.mocked(execFile)

type ExecFileCallback = (error: Error | null, stdout?: string, stderr?: string) => void

function mockExecSuccess(stdout: string, stderr = '') {
  mockExecFile.mockImplementation(
    (_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
      const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
      if (cb) {
        process.nextTick(() => cb(null, stdout, stderr))
      }
      return {} as ReturnType<typeof execFile>
    }
  )
}

function mockExecFailure(stderr: string, exitCode = 1, code?: string) {
  mockExecFile.mockImplementation(
    (_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
      const error: Record<string, unknown> = new Error(stderr)
      error.stderr = stderr
      error.exitCode = exitCode
      if (code) error.code = code
      const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
      if (cb) {
        process.nextTick(() => cb(error))
      }
      return {} as ReturnType<typeof execFile>
    }
  )
}

describe('GitService', () => {
  let git: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    git = new GitService()
  })

  // -------------------------------------------------------
  // exec()
  // -------------------------------------------------------
  describe('exec()', () => {
    it('should execute git command and return stdout', async () => {
      mockExecSuccess('output text')
      const result = await git.exec(['status'], '/repo')
      expect(result).toBe('output text')
    })

    it('should reject on non-zero exit code with stderr message', async () => {
      mockExecFailure('fatal: something went wrong', 128)
      await expect(git.exec(['bad-command'], '/repo')).rejects.toThrow(GitError)
    })

    it('should set GIT_TERMINAL_PROMPT=0 in env', async () => {
      mockExecSuccess('')
      await git.exec(['status'], '/repo')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['status'])
      expect(callArgs[2]).toMatchObject({
        env: expect.objectContaining({
          GIT_TERMINAL_PROMPT: '0'
        })
      })
    })

    it('should throw GitNotFoundError when git is not installed', async () => {
      mockExecFailure('', 1, 'ENOENT')
      await expect(git.exec(['status'], '/repo')).rejects.toThrow(GitNotFoundError)
    })

    it('should respect maxBuffer setting', async () => {
      mockExecSuccess('')
      await git.exec(['log'], '/repo', 50 * 1024 * 1024)

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['log'])
      expect(callArgs[2]).toMatchObject({
        maxBuffer: 50 * 1024 * 1024
      })
    })

    it('should throw NotARepositoryError for non-repo paths', async () => {
      mockExecFailure('fatal: not a git repository (or any of the parent directories): .git', 128)
      await expect(git.exec(['status'], '/not-a-repo')).rejects.toThrow(NotARepositoryError)
    })
  })

  // -------------------------------------------------------
  // isGitInstalled()
  // -------------------------------------------------------
  describe('isGitInstalled()', () => {
    it('should return true when git is available', async () => {
      mockExecSuccess('git version 2.43.0')
      const result = await git.isGitInstalled()
      expect(result).toBe(true)
    })

    it('should return false when git is not found', async () => {
      mockExecFailure('', 1, 'ENOENT')
      const result = await git.isGitInstalled()
      expect(result).toBe(false)
    })
  })

  // -------------------------------------------------------
  // isRepository()
  // -------------------------------------------------------
  describe('isRepository()', () => {
    it('should return true for a valid repository', async () => {
      mockExecSuccess('true')
      const result = await git.isRepository('/valid-repo')
      expect(result).toBe(true)
    })

    it('should return false for a non-repository', async () => {
      mockExecFailure('fatal: not a git repository', 128)
      const result = await git.isRepository('/not-a-repo')
      expect(result).toBe(false)
    })
  })

  // -------------------------------------------------------
  // status()
  // -------------------------------------------------------
  describe('status()', () => {
    it('should parse clean working tree', async () => {
      mockExecSuccess('# branch.oid abc123\n# branch.head main\n')
      const status = await git.status('/repo')
      expect(status.branch).toBe('main')
      expect(status.isClean).toBe(true)
      expect(status.staged).toHaveLength(0)
      expect(status.unstaged).toHaveLength(0)
      expect(status.untracked).toHaveLength(0)
    })

    it('should parse staged files', async () => {
      mockExecSuccess(
        '# branch.head main\n1 M. N... 100644 100644 100644 abc123 def456 src/file.ts\n'
      )
      const status = await git.status('/repo')
      expect(status.staged).toHaveLength(1)
      expect(status.staged[0].path).toBe('src/file.ts')
      expect(status.staged[0].indexStatus).toBe('M')
      expect(status.staged[0].isStaged).toBe(true)
    })

    it('should parse unstaged changes', async () => {
      mockExecSuccess(
        '# branch.head main\n1 .M N... 100644 100644 100644 abc123 def456 src/file.ts\n'
      )
      const status = await git.status('/repo')
      expect(status.unstaged).toHaveLength(1)
      expect(status.unstaged[0].workTreeStatus).toBe('M')
    })

    it('should parse untracked files', async () => {
      mockExecSuccess('# branch.head main\n? newfile.ts\n')
      const status = await git.status('/repo')
      expect(status.untracked).toHaveLength(1)
      expect(status.untracked[0].path).toBe('newfile.ts')
    })

    it('should parse renamed files', async () => {
      mockExecSuccess(
        '# branch.head main\n2 R. N... 100644 100644 100644 abc123 def456 R100 new.ts\told.ts\n'
      )
      const status = await git.status('/repo')
      expect(status.staged).toHaveLength(1)
      expect(status.staged[0].path).toBe('new.ts')
      expect(status.staged[0].originalPath).toBe('old.ts')
    })

    it('should parse merge conflict states', async () => {
      mockExecSuccess(
        '# branch.head main\nu UU N... 100644 100644 100644 100644 abc123 def456 ghi789 conflicted.ts\n'
      )
      const status = await git.status('/repo')
      expect(status.conflicted).toHaveLength(1)
      expect(status.conflicted[0].isConflicted).toBe(true)
    })

    it('should parse branch tracking info', async () => {
      mockExecSuccess('# branch.head main\n# branch.upstream origin/main\n# branch.ab +3 -1\n')
      const status = await git.status('/repo')
      expect(status.tracking).not.toBeNull()
      expect(status.tracking!.ahead).toBe(3)
      expect(status.tracking!.behind).toBe(1)
      expect(status.tracking!.remoteName).toBe('origin')
      expect(status.tracking!.remoteBranch).toBe('main')
    })

    it('should handle detached HEAD state', async () => {
      mockExecSuccess('# branch.oid abc123\n# branch.head (detached)\n')
      const status = await git.status('/repo')
      expect(status.isDetachedHead).toBe(true)
    })
  })

  // -------------------------------------------------------
  // log()
  // -------------------------------------------------------
  describe('log()', () => {
    it('should parse commits with all fields', async () => {
      const logOutput = [
        'abc123def456\x00abc123d\x00parent1\x00John Doe\x00john@example.com\x002024-01-15T10:30:00+00:00\x00Initial commit\x00HEAD -> main, origin/main\x00\x00'
      ].join('')

      mockExecSuccess(logOutput)
      const commits = await git.log('/repo')

      expect(commits).toHaveLength(1)
      expect(commits[0].hash).toBe('abc123def456')
      expect(commits[0].abbreviatedHash).toBe('abc123d')
      expect(commits[0].parents).toEqual(['parent1'])
      expect(commits[0].author).toBe('John Doe')
      expect(commits[0].authorEmail).toBe('john@example.com')
      expect(commits[0].subject).toBe('Initial commit')
      expect(commits[0].refs).toContain('HEAD -> main')
    })

    it('should parse parent hashes (root commit, normal, merge)', async () => {
      const logOutput = [
        'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Root\x00\x00\x00',
        'hash2\x00h2\x00parent1\x00Author\x00a@b.com\x002024-01-02T00:00:00Z\x00Normal\x00\x00\x00',
        'hash3\x00h3\x00parent1 parent2\x00Author\x00a@b.com\x002024-01-03T00:00:00Z\x00Merge\x00\x00\x00'
      ].join('')

      mockExecSuccess(logOutput)
      const commits = await git.log('/repo')

      expect(commits[0].parents).toEqual([]) // root
      expect(commits[1].parents).toEqual(['parent1']) // normal
      expect(commits[2].parents).toEqual(['parent1', 'parent2']) // merge
    })

    it('should parse ref decorations', async () => {
      const logOutput =
        'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Commit\x00HEAD -> main, tag: v1.0, origin/main\x00\x00'

      mockExecSuccess(logOutput)
      const commits = await git.log('/repo')

      expect(commits[0].refs).toContain('HEAD -> main')
      expect(commits[0].refs).toContain('tag: v1.0')
      expect(commits[0].refs).toContain('origin/main')
    })

    it('should handle empty repo (no commits)', async () => {
      mockExecFailure("fatal: your current branch 'main' does not have any commits yet", 128)
      const commits = await git.log('/repo')
      expect(commits).toEqual([])
    })

    it('should respect --max-count limit', async () => {
      mockExecSuccess('')
      await git.log('/repo', { maxCount: 50 })

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(expect.arrayContaining(['--max-count=50']))
    })

    it('should parse commits with special characters in subject', async () => {
      const logOutput =
        'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00fix: handle "quotes" & <angles>\x00\x00\x00'

      mockExecSuccess(logOutput)
      const commits = await git.log('/repo')
      expect(commits[0].subject).toBe('fix: handle "quotes" & <angles>')
    })
  })

  // -------------------------------------------------------
  // branches()
  // -------------------------------------------------------
  describe('branches()', () => {
    it('should list local branches', async () => {
      mockExecSuccess(
        'main\x00abc123\x00origin/main\x00[ahead 1]\x00*\x00Latest commit\nfeature\x00def456\x00\x00\x00 \x00Feature work\n'
      )
      const branches = await git.branches('/repo')
      const local = branches.filter((b) => !b.isRemote)

      expect(local).toHaveLength(2)
      expect(local[0].name).toBe('main')
      expect(local[1].name).toBe('feature')
    })

    it('should identify current branch', async () => {
      mockExecSuccess(
        'main\x00abc123\x00\x00\x00*\x00Commit\nother\x00def456\x00\x00\x00 \x00Commit\n'
      )
      const branches = await git.branches('/repo')
      const current = branches.find((b) => b.isCurrent)

      expect(current).toBeDefined()
      expect(current!.name).toBe('main')
    })

    it('should parse tracking info for branches', async () => {
      mockExecSuccess('main\x00abc123\x00origin/main\x00[ahead 2, behind 1]\x00*\x00Commit\n')
      const branches = await git.branches('/repo')

      expect(branches[0].tracking).toBeDefined()
      expect(branches[0].tracking!.ahead).toBe(2)
      expect(branches[0].tracking!.behind).toBe(1)
    })

    it('should handle detached HEAD', async () => {
      // First call for local branches, second call for remote branches
      mockExecFile
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) {
            process.nextTick(() =>
              cb(null, '(HEAD detached at abc123)\x00abc123\x00\x00\x00*\x00Commit\n', '')
            )
          }
          return {} as ReturnType<typeof execFile>
        })
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) {
            process.nextTick(() => cb(null, '', ''))
          }
          return {} as ReturnType<typeof execFile>
        })
      const branches = await git.branches('/repo')
      expect(branches).toHaveLength(1)
    })
  })

  // -------------------------------------------------------
  // init()
  // -------------------------------------------------------
  describe('init()', () => {
    it('should initialize a new repository', async () => {
      mockExecSuccess('Initialized empty Git repository in /repo/.git/')
      await expect(git.init('/new-repo')).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------
  // stageFile()
  // -------------------------------------------------------
  describe('stageFile()', () => {
    it('should stage a single file', async () => {
      mockExecSuccess('')
      await git.stageFile('/repo', 'src/file.ts')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['add', '--', 'src/file.ts'])
    })

    it('should handle paths with spaces', async () => {
      mockExecSuccess('')
      await git.stageFile('/repo', 'path with spaces/file.ts')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['add', '--', 'path with spaces/file.ts'])
    })
  })

  // -------------------------------------------------------
  // commit()
  // -------------------------------------------------------
  describe('commit()', () => {
    it('should create commit with message', async () => {
      mockExecSuccess('[main abc1234] My commit message')
      const hash = await git.commit('/repo', 'My commit message')
      expect(hash).toBe('abc1234')
    })

    it('should amend previous commit', async () => {
      mockExecSuccess('[main abc1234] Amended message')
      await git.commit('/repo', 'Amended message', { amend: true })

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['commit', '-m', 'Amended message', '--amend'])
    })
  })

  // -------------------------------------------------------
  // createBranch()
  // -------------------------------------------------------
  describe('createBranch()', () => {
    it('should create branch from HEAD', async () => {
      mockExecSuccess('')
      await git.createBranch('/repo', 'feature-x')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['branch', 'feature-x'])
    })

    it('should create branch from specific commit', async () => {
      mockExecSuccess('')
      await git.createBranch('/repo', 'feature-x', 'abc123')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['branch', 'feature-x', 'abc123'])
    })
  })

  // -------------------------------------------------------
  // checkout()
  // -------------------------------------------------------
  describe('checkout()', () => {
    it('should switch to existing branch', async () => {
      mockExecSuccess("Switched to branch 'main'")
      await git.checkout('/repo', 'main')

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['checkout', 'main'])
    })

    it('should create and switch to new branch with -b', async () => {
      mockExecSuccess("Switched to a new branch 'new-branch'")
      await git.checkout('/repo', 'new-branch', { createBranch: true })

      expect(mockExecFile).toHaveBeenCalled()
      const callArgs = mockExecFile.mock.calls[0]
      expect(callArgs[0]).toBe('git')
      expect(callArgs[1]).toEqual(['checkout', '-b', 'new-branch'])
    })
  })
})
