// ============================================================
// Kommit — Unit Tests: GitService Stash Operations
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError } from '../../../src/shared/types'

// Mock execFile so no real processes are spawned
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  spawn: vi.fn()
}))
vi.mock('node:util', () => ({
  promisify: vi.fn(() => vi.fn())
}))
vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn()
}))

import * as childProcess from 'node:child_process'
import * as fsPromises from 'node:fs/promises'

// Helper: make exec succeed with given stdout
function mockExecSuccess(stdout: string) {
  const mock = vi.fn().mockResolvedValue({ stdout, stderr: '' })
  vi.spyOn(GitService.prototype as any, 'exec').mockResolvedValue(stdout)
  return mock
}

function mockExecFailure(message: string, stderr = '', exitCode = 1) {
  vi.spyOn(GitService.prototype as any, 'exec').mockRejectedValue(
    new GitError(message, 'git stash', exitCode, stderr)
  )
}

describe('GitService.stashSave()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should stash changes with default message', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('Saved working directory')
    await service.stashSave('/repo')
    expect(execSpy).toHaveBeenCalledWith(['stash', 'push'], '/repo')
  })

  it('should stash with custom message', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('Saved working directory')
    await service.stashSave('/repo', { message: 'my stash' })
    expect(execSpy).toHaveBeenCalledWith(['stash', 'push', '-m', 'my stash'], '/repo')
  })

  it('should stash including untracked files (-u)', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('Saved working directory')
    await service.stashSave('/repo', { includeUntracked: true })
    expect(execSpy).toHaveBeenCalledWith(['stash', 'push', '--include-untracked'], '/repo')
  })

  it('should stash with --keep-index', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('Saved working directory')
    await service.stashSave('/repo', { keepIndex: true })
    expect(execSpy).toHaveBeenCalledWith(['stash', 'push', '--keep-index'], '/repo')
  })

  it('should report error if working tree is clean', async () => {
    vi.spyOn(service as any, 'exec').mockResolvedValue('No local changes to save')
    await expect(service.stashSave('/repo')).rejects.toThrow('No local changes to save')
  })
})

describe('GitService.stashList()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should parse stash list with index, branch, message', async () => {
    const raw =
      'stash@{0}|abc1234|On main: my stash message|2024-01-15T10:00:00+00:00\n' +
      'stash@{1}|def5678|WIP on feature: old changes|2024-01-14T09:00:00+00:00\n'
    vi.spyOn(service as any, 'exec').mockResolvedValue(raw)

    const entries = await service.stashList('/repo')
    expect(entries).toHaveLength(2)
    expect(entries[0].index).toBe(0)
    expect(entries[0].hash).toBe('abc1234')
    expect(entries[0].message).toBe('my stash message')
    expect(entries[0].branch).toBe('main')
    expect(entries[1].index).toBe(1)
    expect(entries[1].branch).toBe('feature')
  })

  it('should handle empty stash list', async () => {
    vi.spyOn(service as any, 'exec').mockResolvedValue('')
    const entries = await service.stashList('/repo')
    expect(entries).toHaveLength(0)
  })

  it('should parse stash entry dates', async () => {
    const raw = 'stash@{0}|abc1234|On main: test|2024-06-15T12:30:00+00:00\n'
    vi.spyOn(service as any, 'exec').mockResolvedValue(raw)

    const entries = await service.stashList('/repo')
    expect(entries[0].date).toBeInstanceOf(Date)
    expect(entries[0].date.getFullYear()).toBe(2024)
  })
})

describe('GitService.stashApply()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should apply stash and keep it in list', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    await service.stashApply('/repo', 0)
    expect(execSpy).toHaveBeenCalledWith(['stash', 'apply', 'stash@{0}'], '/repo')
  })

  it('should report conflicts on apply', async () => {
    vi.spyOn(service as any, 'exec').mockRejectedValue(
      new GitError('conflict', 'git stash apply', 1, 'CONFLICT (content): ...')
    )
    await expect(service.stashApply('/repo', 0)).rejects.toThrow('conflict')
  })
})

describe('GitService.stashPop()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should apply and remove stash from list', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    await service.stashPop('/repo', 0)
    expect(execSpy).toHaveBeenCalledWith(['stash', 'pop', 'stash@{0}'], '/repo')
  })

  it('should keep stash in list if conflicts occur', async () => {
    vi.spyOn(service as any, 'exec').mockRejectedValue(
      new GitError('conflict', 'git stash pop', 1, 'CONFLICT (content): Merge conflict in file.txt')
    )
    await expect(service.stashPop('/repo', 0)).rejects.toThrow('conflicts')
  })
})

describe('GitService.stashDrop()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should remove specific stash entry', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    await service.stashDrop('/repo', 2)
    expect(execSpy).toHaveBeenCalledWith(['stash', 'drop', 'stash@{2}'], '/repo')
  })

  it('should reject invalid stash index', async () => {
    vi.spyOn(service as any, 'exec').mockRejectedValue(
      new GitError('refs/stash@{99} is not a valid reference', 'git stash drop', 128, '')
    )
    await expect(service.stashDrop('/repo', 99)).rejects.toThrow()
  })
})

describe('GitService.stashShow()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should return diff of stash contents', async () => {
    const diff =
      'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new'
    vi.spyOn(service as any, 'exec').mockResolvedValue(diff)
    const result = await service.stashShow('/repo', 0)
    expect(result).toContain('diff --git')
  })

  it('should show stat summary', async () => {
    const stat = ' file.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)'
    vi.spyOn(service as any, 'exec').mockResolvedValue(stat)
    const result = await service.stashShow('/repo', 0)
    expect(result).toBeTruthy()
    expect(result).toContain('file.txt')
  })
})
