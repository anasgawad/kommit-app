// ============================================================
// Kommit — Unit Tests: GitService Rebase Operations
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError } from '../../../src/shared/types'

vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn()
}))

import * as fsPromises from 'node:fs/promises'

const mockReadFile = vi.mocked(fsPromises.readFile)
const mockAccess = vi.mocked(fsPromises.access)

function makeActions(list: Array<{ action: string; hash: string; subject: string }>) {
  return list.map((a) => ({
    action: a.action as any,
    hash: a.hash,
    subject: a.subject
  }))
}

describe('GitService.rebaseInteractive()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
    // Default: exec returns success
    vi.spyOn(service as any, 'exec').mockResolvedValue('')
    vi.spyOn(service as any, 'execWithEnv').mockResolvedValue('')
    vi.spyOn(service as any, 'getGitDir').mockResolvedValue('/repo/.git')
    vi.spyOn(service as any, 'getRebaseStatus').mockResolvedValue(null)
    vi.spyOn(service as any, 'status').mockResolvedValue({
      conflicted: [],
      staged: [],
      unstaged: [],
      untracked: [],
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      isClean: true
    })
    ;(fsPromises.writeFile as any).mockResolvedValue(undefined)
    ;(fsPromises.rm as any).mockResolvedValue(undefined)
  })

  it('should generate todo list from commit range', async () => {
    const actions = makeActions([
      { action: 'pick', hash: 'abc1234', subject: 'first commit' },
      { action: 'pick', hash: 'def5678', subject: 'second commit' }
    ])
    const result = await service.rebaseInteractive('/repo', 'main~2', actions)
    expect(result.success).toBe(true)
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('kommit-rebase-todo'),
      expect.stringContaining('pick abc1234 first commit'),
      'utf8'
    )
  })

  it('should apply reordered commits', async () => {
    const actions = makeActions([
      { action: 'pick', hash: 'def5678', subject: 'second first now' },
      { action: 'pick', hash: 'abc1234', subject: 'first second now' }
    ])
    const result = await service.rebaseInteractive('/repo', 'HEAD~2', actions)
    expect(result.success).toBe(true)
  })

  it('should squash consecutive commits', async () => {
    const actions = makeActions([
      { action: 'pick', hash: 'abc1234', subject: 'base commit' },
      { action: 'squash', hash: 'def5678', subject: 'squash into previous' }
    ])
    const result = await service.rebaseInteractive('/repo', 'HEAD~2', actions)
    expect(result.success).toBe(true)
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('squash def5678'),
      'utf8'
    )
  })

  it('should reword commit message', async () => {
    const actions = makeActions([{ action: 'reword', hash: 'abc1234', subject: 'new message' }])
    const result = await service.rebaseInteractive('/repo', 'HEAD~1', actions)
    expect(result.success).toBe(true)
  })

  it('should drop specified commits', async () => {
    const actions = makeActions([
      { action: 'pick', hash: 'abc1234', subject: 'keep this' },
      { action: 'drop', hash: 'def5678', subject: 'drop this' }
    ])
    const result = await service.rebaseInteractive('/repo', 'HEAD~2', actions)
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('drop def5678'),
      'utf8'
    )
  })

  it('should handle fixup action', async () => {
    const actions = makeActions([
      { action: 'pick', hash: 'abc1234', subject: 'main commit' },
      { action: 'fixup', hash: 'def5678', subject: 'fixup no message' }
    ])
    const result = await service.rebaseInteractive('/repo', 'HEAD~2', actions)
    expect(result.success).toBe(true)
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('fixup def5678'),
      'utf8'
    )
  })
})

describe('GitService.rebaseContinue()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
    vi.spyOn(service as any, 'execWithEnv').mockResolvedValue('')
  })

  it('should continue after conflict resolution', async () => {
    vi.spyOn(service as any, 'status').mockResolvedValue({
      conflicted: [],
      staged: [{ path: 'file.txt' }],
      unstaged: [],
      untracked: [],
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      isClean: false
    })
    await expect(service.rebaseContinue('/repo')).resolves.not.toThrow()
  })

  it('should reject if conflicts remain', async () => {
    vi.spyOn(service as any, 'status').mockResolvedValue({
      conflicted: [{ path: 'file.txt' }],
      staged: [],
      unstaged: [],
      untracked: [],
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      isClean: false
    })
    await expect(service.rebaseContinue('/repo')).rejects.toThrow('conflict')
  })
})

describe('GitService.rebaseAbort()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should restore original branch state', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    await service.rebaseAbort('/repo')
    expect(execSpy).toHaveBeenCalledWith(['rebase', '--abort'], '/repo')
  })
})

describe('GitService.rebaseSkip()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should skip current commit and continue', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    await service.rebaseSkip('/repo')
    expect(execSpy).toHaveBeenCalledWith(['rebase', '--skip'], '/repo')
  })
})

describe('GitService.getRebaseStatus()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
    vi.spyOn(service as any, 'exec').mockResolvedValue('.git')
    vi.spyOn(service as any, 'status').mockResolvedValue({
      conflicted: [],
      staged: [],
      unstaged: [],
      untracked: [],
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      isClean: true
    })
  })

  it('should return null if no rebase in progress', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    vi.spyOn(service as any, 'getGitDir').mockResolvedValue('/repo/.git')
    const result = await service.getRebaseStatus('/repo')
    expect(result).toBeNull()
  })

  it('should return status when rebase is in progress', async () => {
    vi.spyOn(service as any, 'getGitDir').mockResolvedValue('/repo/.git')
    mockAccess.mockResolvedValue(undefined)
    mockReadFile.mockImplementation((path: any) => {
      if (String(path).endsWith('msgnum')) return Promise.resolve('3')
      if (String(path).endsWith('end')) return Promise.resolve('7')
      if (String(path).endsWith('stopped-sha')) return Promise.resolve('abc1234')
      return Promise.reject(new Error('not found'))
    })

    const result = await service.getRebaseStatus('/repo')
    expect(result).not.toBeNull()
    expect(result?.inProgress).toBe(true)
    expect(result?.currentStep).toBe(3)
    expect(result?.totalSteps).toBe(7)
  })
})
