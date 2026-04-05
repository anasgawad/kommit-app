// ============================================================
// Kommit — Branch & History Operation Unit Tests
// Tests for createBranch, deleteBranch, renameBranch, checkout,
// merge, cherryPick, revert, reset
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError } from '../../../src/shared/types'

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

function mockExecFailure(stderr: string, exitCode = 1) {
  mockExecFile.mockImplementation(
    (_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
      const error: Record<string, unknown> = new Error(stderr)
      error.stderr = stderr
      error.exitCode = exitCode
      const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
      if (cb) {
        process.nextTick(() => cb(error))
      }
      return {} as ReturnType<typeof execFile>
    }
  )
}

describe('GitService — Branch Operations', () => {
  let git: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    git = new GitService()
  })

  // -------------------------------------------------------
  // createBranch()
  // -------------------------------------------------------
  describe('createBranch()', () => {
    it('should run git branch with the branch name', async () => {
      mockExecSuccess('')
      await git.createBranch('/repo', 'feature/my-feature')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', 'feature/my-feature']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should pass start point when provided', async () => {
      mockExecSuccess('')
      await git.createBranch('/repo', 'feature/new', 'main')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', 'feature/new', 'main']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should throw GitError when branch already exists', async () => {
      mockExecFailure('fatal: A branch named feature/my-feature already exists', 128)
      await expect(git.createBranch('/repo', 'feature/my-feature')).rejects.toBeInstanceOf(GitError)
    })
  })

  // -------------------------------------------------------
  // deleteBranch()
  // -------------------------------------------------------
  describe('deleteBranch()', () => {
    it('should use -d flag by default', async () => {
      mockExecSuccess('')
      await git.deleteBranch('/repo', 'old-branch')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', '-d', 'old-branch']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should use -D flag when force is true', async () => {
      mockExecSuccess('')
      await git.deleteBranch('/repo', 'old-branch', true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', '-D', 'old-branch']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // renameBranch()
  // -------------------------------------------------------
  describe('renameBranch()', () => {
    it('should run git branch -m oldName newName', async () => {
      mockExecSuccess('')
      await git.renameBranch('/repo', 'old-name', 'new-name')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['branch', '-m', 'old-name', 'new-name']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // checkout()
  // -------------------------------------------------------
  describe('checkout()', () => {
    it('should run git checkout with the ref', async () => {
      mockExecSuccess('')
      await git.checkout('/repo', 'main')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['checkout', 'main']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should pass -b flag when createBranch option is true', async () => {
      mockExecSuccess('')
      await git.checkout('/repo', 'new-branch', { createBranch: true })
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['checkout', '-b', 'new-branch']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // merge()
  // -------------------------------------------------------
  describe('merge()', () => {
    it('should return success result when merge completes cleanly', async () => {
      mockExecSuccess('Merge made by the recursive strategy')
      const result = await git.merge('/repo', 'feature/branch')
      expect(result.success).toBe(true)
      expect(result.conflictedFiles).toHaveLength(0)
    })

    it('should return failure with conflicted files when merge conflicts', async () => {
      // First call: merge fails; second call: status succeeds with conflicts
      mockExecFile
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          const error: Record<string, unknown> = new Error('CONFLICT')
          error.stderr = 'CONFLICT (content): Merge conflict in src/foo.ts'
          error.exitCode = 1
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) process.nextTick(() => cb(error))
          return {} as ReturnType<typeof execFile>
        })
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          // Return minimal status output with a conflict
          const statusOutput =
            '# branch.oid abc1234\n# branch.head main\nu UU N... 1 2 abc def src/foo.ts\n'
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) process.nextTick(() => cb(null, statusOutput, ''))
          return {} as ReturnType<typeof execFile>
        })

      const result = await git.merge('/repo', 'feature/branch')
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------
  // cherryPick()
  // -------------------------------------------------------
  describe('cherryPick()', () => {
    it('should run git cherry-pick with the commit hash', async () => {
      mockExecSuccess('')
      await git.cherryPick('/repo', 'abc1234')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['cherry-pick', 'abc1234']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should throw GitError when cherry-pick conflicts', async () => {
      mockExecFailure('CONFLICT (content): Merge conflict in foo.ts', 1)
      await expect(git.cherryPick('/repo', 'abc1234')).rejects.toBeInstanceOf(GitError)
    })
  })

  // -------------------------------------------------------
  // revert()
  // -------------------------------------------------------
  describe('revert()', () => {
    it('should run git revert --no-edit with the commit hash', async () => {
      mockExecSuccess('')
      await git.revert('/repo', 'abc1234')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['revert', '--no-edit', 'abc1234']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // reset()
  // -------------------------------------------------------
  describe('reset()', () => {
    it('should use mixed mode by default', async () => {
      mockExecSuccess('')
      await git.reset('/repo', 'HEAD~1')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['reset', '--mixed', 'HEAD~1']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should use soft mode when specified', async () => {
      mockExecSuccess('')
      await git.reset('/repo', 'HEAD~1', 'soft')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['reset', '--soft', 'HEAD~1']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should use hard mode when specified', async () => {
      mockExecSuccess('')
      await git.reset('/repo', 'HEAD~2', 'hard')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['reset', '--hard', 'HEAD~2']),
        expect.anything(),
        expect.anything()
      )
    })
  })
})
