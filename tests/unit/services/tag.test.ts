// ============================================================
// Kommit — Tag Service Unit Tests
// Tests for listTags, createTag (lightweight & annotated), deleteTag
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

// Tab-delimited for-each-ref output format:
// name\tobjecttype\tobjecthash\tderefhash\tmessage\tdate
// derefhash is empty for lightweight tags, commit hash for annotated tags (%(*objectname))
const LIGHTWEIGHT_TAG_OUTPUT = 'v1.0.0\tcommit\tabc1234\t\t\t2024-01-15T10:00:00+00:00\n'
const ANNOTATED_TAG_OUTPUT =
  'v2.0.0\ttag\ttaghash1\tcommit123\tRelease 2.0\t2024-06-01T12:00:00+00:00\n'

describe('GitService — Tags', () => {
  let git: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    git = new GitService()
  })

  // -------------------------------------------------------
  // listTags()
  // -------------------------------------------------------
  describe('listTags()', () => {
    it('should return empty array when there are no tags', async () => {
      mockExecSuccess('')
      const tags = await git.listTags('/repo')
      expect(tags).toEqual([])
    })

    it('should parse a lightweight tag correctly', async () => {
      mockExecSuccess(LIGHTWEIGHT_TAG_OUTPUT)
      const tags = await git.listTags('/repo')
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('v1.0.0')
      expect(tags[0].hash).toBe('abc1234')
      expect(tags[0].isAnnotated).toBe(false)
      expect(tags[0].message).toBeUndefined()
    })

    it('should parse an annotated tag correctly', async () => {
      mockExecSuccess(ANNOTATED_TAG_OUTPUT)
      const tags = await git.listTags('/repo')
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('v2.0.0')
      expect(tags[0].isAnnotated).toBe(true)
      expect(tags[0].message).toBe('Release 2.0')
      // For annotated tags, hash should be the dereferenced commit hash
      expect(tags[0].hash).toBe('commit123')
    })

    it('should return empty array when for-each-ref fails', async () => {
      mockExecFailure('fatal: not a git repository', 128)
      const tags = await git.listTags('/repo')
      expect(tags).toEqual([])
    })
  })

  // -------------------------------------------------------
  // createTag()
  // -------------------------------------------------------
  describe('createTag()', () => {
    it('should create a lightweight tag with just the name', async () => {
      mockExecSuccess('')
      await git.createTag('/repo', 'v1.0.0')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['tag', 'v1.0.0']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should create an annotated tag when message is provided', async () => {
      mockExecSuccess('')
      await git.createTag('/repo', 'v1.0.0', { message: 'Release 1.0.0' })
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['tag', '-a', 'v1.0.0', '-m', 'Release 1.0.0']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should pass a specific commit hash when provided', async () => {
      mockExecSuccess('')
      await git.createTag('/repo', 'v1.0.0', { hash: 'abc1234' })
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['tag', 'v1.0.0', 'abc1234']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should throw GitError when tag already exists', async () => {
      mockExecFailure('fatal: tag v1.0.0 already exists', 128)
      await expect(git.createTag('/repo', 'v1.0.0')).rejects.toBeInstanceOf(GitError)
    })
  })

  // -------------------------------------------------------
  // deleteTag()
  // -------------------------------------------------------
  describe('deleteTag()', () => {
    it('should run git tag -d to delete a tag locally', async () => {
      mockExecSuccess('')
      await git.deleteTag('/repo', 'v1.0.0')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['tag', '-d', 'v1.0.0']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should also push deletion to remote when remote is specified', async () => {
      mockExecSuccess('')
      await git.deleteTag('/repo', 'v1.0.0', 'origin')
      // First call: local delete; second call: remote delete
      expect(mockExecFile).toHaveBeenCalledTimes(2)
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        expect.arrayContaining(['push', 'origin', '--delete', 'v1.0.0']),
        expect.anything(),
        expect.anything()
      )
    })

    it('should throw GitError when tag does not exist', async () => {
      mockExecFailure("error: tag 'nonexistent' not found", 1)
      await expect(git.deleteTag('/repo', 'nonexistent')).rejects.toBeInstanceOf(GitError)
    })
  })
})
