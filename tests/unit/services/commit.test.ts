// ============================================================
// Kommit — Commit Service Unit Tests
// Tests for commit(): basic, amend, empty message, hash extraction, error
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

describe('GitService — commit()', () => {
  let git: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    git = new GitService()
  })

  it('should run git commit with the provided message', async () => {
    mockExecSuccess('[main abc1234] Add new feature\n 1 file changed')
    await git.commit('/repo', 'Add new feature')
    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['commit', '-m', 'Add new feature']),
      expect.anything(),
      expect.anything()
    )
  })

  it('should return the abbreviated commit hash from the output', async () => {
    mockExecSuccess('[main abc1234] Add new feature\n 1 file changed')
    const hash = await git.commit('/repo', 'Add new feature')
    expect(hash).toBe('abc1234')
  })

  it('should return empty string when hash cannot be parsed from output', async () => {
    mockExecSuccess('some unexpected output format')
    const hash = await git.commit('/repo', 'Add feature')
    expect(hash).toBe('')
  })

  it('should pass --amend flag when options.amend is true', async () => {
    mockExecSuccess('[main abc1234] Amended commit\n 1 file changed')
    await git.commit('/repo', 'Amended commit', { amend: true })
    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['commit', '-m', 'Amended commit', '--amend']),
      expect.anything(),
      expect.anything()
    )
  })

  it('should throw GitError when there is nothing to commit', async () => {
    mockExecFailure('nothing to commit, working tree clean', 1)
    await expect(git.commit('/repo', 'Empty commit')).rejects.toBeInstanceOf(GitError)
  })
})
