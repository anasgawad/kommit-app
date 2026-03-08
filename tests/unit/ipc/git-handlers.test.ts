// ============================================================
// Kommit — IPC Handler Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn()
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn()
  }
}))

// Mock git service
vi.mock('../../../src/main/services/git', () => ({
  gitService: {
    status: vi.fn(),
    isRepository: vi.fn(),
    log: vi.fn(),
    branches: vi.fn(),
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
    renameBranch: vi.fn(),
    checkout: vi.fn(),
    stageFile: vi.fn(),
    unstageFile: vi.fn(),
    commit: vi.fn(),
    diff: vi.fn(),
    diffStaged: vi.fn(),
    discardChanges: vi.fn(),
    init: vi.fn(),
    clone: vi.fn()
  }
}))

import { ipcMain } from 'electron'
import { registerGitHandlers } from '../../../src/main/ipc/git-handlers'
import { IPC_CHANNELS } from '../../../src/shared/ipc-channels'
import { gitService } from '../../../src/main/services/git'

const mockIpcHandle = vi.mocked(ipcMain.handle)

describe('Git IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registerGitHandlers()
  })

  it('should register all expected IPC handlers', () => {
    const registeredChannels = mockIpcHandle.mock.calls.map((call) => call[0])

    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_STATUS)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_IS_REPO)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_LOG)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_BRANCHES)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_CREATE_BRANCH)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_DELETE_BRANCH)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_CHECKOUT)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_STAGE)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_UNSTAGE)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_COMMIT)
    expect(registeredChannels).toContain(IPC_CHANNELS.GIT_DIFF)
    expect(registeredChannels).toContain(IPC_CHANNELS.REPO_INIT)
    expect(registeredChannels).toContain(IPC_CHANNELS.REPO_CLONE)
    expect(registeredChannels).toContain(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY)
  })

  it('should validate repoPath argument is a string for GIT_STATUS', async () => {
    const statusHandler = mockIpcHandle.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.GIT_STATUS
    )?.[1]

    expect(statusHandler).toBeDefined()

    // Should reject non-string
    await expect(statusHandler!({} as never, 123 as never)).rejects.toThrow(
      'repoPath must be a non-empty string'
    )

    // Should reject empty string
    await expect(statusHandler!({} as never, '')).rejects.toThrow(
      'repoPath must be a non-empty string'
    )
  })

  it('should return structured data from GIT_STATUS', async () => {
    const mockStatus = {
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      isClean: true
    }
    vi.mocked(gitService.status).mockResolvedValue(mockStatus)

    const statusHandler = mockIpcHandle.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.GIT_STATUS
    )?.[1]

    const result = await statusHandler!({} as never, '/repo')
    expect(result).toEqual(mockStatus)
    expect(result).toHaveProperty('branch')
    expect(result).toHaveProperty('isClean')
  })

  it('should propagate errors with meaningful messages', async () => {
    vi.mocked(gitService.status).mockRejectedValue(new Error('Git operation failed'))

    const statusHandler = mockIpcHandle.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.GIT_STATUS
    )?.[1]

    await expect(statusHandler!({} as never, '/bad-repo')).rejects.toThrow('Git operation failed')
  })

  it('should validate path for GIT_IS_REPO', async () => {
    const handler = mockIpcHandle.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.GIT_IS_REPO
    )?.[1]

    await expect(handler!({} as never, 123 as never)).rejects.toThrow('path must be a string')
  })

  it('should pass options to GIT_LOG handler', async () => {
    vi.mocked(gitService.log).mockResolvedValue([])

    const handler = mockIpcHandle.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.GIT_LOG
    )?.[1]

    const options = { maxCount: 50, branch: 'main' }
    await handler!({} as never, '/repo', options)

    expect(gitService.log).toHaveBeenCalledWith('/repo', options)
  })
})
