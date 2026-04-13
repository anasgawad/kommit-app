// ============================================================
// Kommit — Staging Service Unit Tests
// Tests for stageFile, unstageFile, stageFiles, discardChanges, stageHunk
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError } from '../../../src/shared/types'

vi.mock('node:child_process')
vi.mock('node:fs/promises')
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

import { execFile, spawn } from 'node:child_process'
import * as fsp from 'node:fs/promises'

const mockExecFile = vi.mocked(execFile)
const mockSpawn = vi.mocked(spawn)
const mockRm = vi.mocked(fsp.rm)

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

describe('GitService — Staging', () => {
  let git: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    git = new GitService()
  })

  // -------------------------------------------------------
  // stageFile()
  // -------------------------------------------------------
  describe('stageFile()', () => {
    it('should run git add with the given file path', async () => {
      mockExecSuccess('')
      await git.stageFile('/repo', 'src/foo.ts')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['add', '--', 'src/foo.ts']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should throw GitError when git add fails', async () => {
      mockExecFailure('pathspec error', 128)
      await expect(git.stageFile('/repo', 'nonexistent.ts')).rejects.toBeInstanceOf(GitError)
    })
  })

  // -------------------------------------------------------
  // unstageFile()
  // -------------------------------------------------------
  describe('unstageFile()', () => {
    it('should run git restore --staged for the file', async () => {
      mockExecSuccess('')
      await git.unstageFile('/repo', 'src/foo.ts')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['restore', '--staged', '--', 'src/foo.ts']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should fall back to git rm --cached when restore fails (initial commit)', async () => {
      // First call (restore --staged) fails, second call (rm --cached) succeeds
      mockExecFile
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          const error: Record<string, unknown> = new Error('no HEAD')
          error.stderr = 'error: no HEAD'
          error.exitCode = 1
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) process.nextTick(() => cb(error))
          return {} as ReturnType<typeof execFile>
        })
        .mockImplementationOnce((_file, _args, _opts, callback?: ExecFileCallback | undefined) => {
          const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback
          if (cb) process.nextTick(() => cb(null, '', ''))
          return {} as ReturnType<typeof execFile>
        })

      await git.unstageFile('/repo', 'src/foo.ts')
      expect(mockExecFile).toHaveBeenCalledTimes(2)
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        expect.arrayContaining(['rm', '--cached', '--', 'src/foo.ts']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // stageFiles()
  // -------------------------------------------------------
  describe('stageFiles()', () => {
    it('should stage multiple files in a single git add call', async () => {
      mockExecSuccess('')
      await git.stageFiles('/repo', ['a.ts', 'b.ts', 'c.ts'])
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['add', '--', 'a.ts', 'b.ts', 'c.ts']),
        expect.anything(),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------
  // discardChanges()
  // -------------------------------------------------------
  describe('discardChanges()', () => {
    it('should run git checkout -- for the file', async () => {
      mockExecSuccess('')
      await git.discardChanges('/repo', 'src/foo.ts')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['checkout', '--', 'src/foo.ts']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should delete an untracked file using rm when git does not know it', async () => {
      mockExecFailure('did not match any file(s) known to git', 1)
      mockRm.mockResolvedValue(undefined)
      await git.discardChanges('/repo', 'untracked.ts')
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('untracked.ts'),
        expect.objectContaining({ recursive: true, force: true })
      )
    })

    it('should delete an untracked directory using rm with recursive when git does not know it', async () => {
      mockExecFailure('did not match any file(s) known to git', 1)
      mockRm.mockResolvedValue(undefined)
      await git.discardChanges('/repo', 'untracked-dir')
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('untracked-dir'),
        expect.objectContaining({ recursive: true, force: true })
      )
    })

    it('should propagate rm error when deletion fails for an untracked path', async () => {
      mockExecFailure('did not match any file(s) known to git', 1)
      mockRm.mockRejectedValue(new Error('EPERM: permission denied'))
      await expect(git.discardChanges('/repo', 'locked.ts')).rejects.toThrow('EPERM')
    })
  })

  // -------------------------------------------------------
  // stageHunk()
  // -------------------------------------------------------
  describe('stageHunk()', () => {
    it('should pipe the patch to git apply --cached via stdin', async () => {
      const mockStdin = { write: vi.fn(), end: vi.fn() }
      const mockChild = {
        stderr: { on: vi.fn() },
        stdin: mockStdin,
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') process.nextTick(() => cb(0))
        })
      }
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const patch = '--- a/foo.ts\n+++ b/foo.ts\n@@ -1,1 +1,2 @@\n context\n+added\n'
      await git.stageHunk('/repo', patch)

      expect(mockSpawn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['apply', '--cached']),
        expect.anything()
      )
      expect(mockStdin.write).toHaveBeenCalledWith(patch)
      expect(mockStdin.end).toHaveBeenCalled()
    })

    it('should throw GitError when git apply fails', async () => {
      const mockStdin = { write: vi.fn(), end: vi.fn() }
      const mockChild = {
        stderr: {
          on: vi.fn((event: string, cb: (data: Buffer) => void) => {
            if (event === 'data') cb(Buffer.from('patch does not apply'))
          })
        },
        stdin: mockStdin,
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') process.nextTick(() => cb(1))
        })
      }
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      await expect(git.stageHunk('/repo', 'bad patch')).rejects.toBeInstanceOf(GitError)
    })
  })
})
