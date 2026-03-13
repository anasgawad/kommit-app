// ============================================================
// Kommit — Graph Store Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGraphStore } from '../../../src/renderer/stores/graph-store'
import type { Commit, CommitDetail } from '../../../src/shared/types'

// Mock window.api
const mockLog = vi.fn()
const mockShow = vi.fn()

global.window = {
  api: {
    git: {
      log: mockLog,
      show: mockShow
    }
  }
} as any

// Helper to create test commits
function createCommit(hash: string, parents: string[] = []): Commit {
  return {
    hash,
    abbreviatedHash: hash.substring(0, 7),
    parents,
    author: 'Test Author',
    authorEmail: 'test@example.com',
    authorDate: new Date('2024-01-01'),
    subject: 'Test commit',
    refs: []
  }
}

describe('GraphStore', () => {
  beforeEach(() => {
    // Clear mocks first
    mockLog.mockReset()
    mockShow.mockReset()
    // Reset store state
    const store = useGraphStore.getState()
    store.reset()
    store.setRepoPath(null)
  })

  it('should load initial batch of commits', async () => {
    const testCommits = [createCommit('aaa', ['bbb']), createCommit('bbb', [])]
    mockLog.mockResolvedValue(testCommits)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    // Wait for async load
    await vi.waitFor(() => {
      const state = useGraphStore.getState()
      return state.commits.length > 0
    })

    const state = useGraphStore.getState()
    expect(state.commits).toHaveLength(2)
    expect(state.graphRows).toHaveLength(2)
    expect(state.isLoading).toBe(false)
    expect(mockLog).toHaveBeenCalledWith('/test/repo', expect.any(Object))
  })

  it('should append commits on loadMore', async () => {
    // Create a full page of commits to ensure hasMore=true
    const initialCommits = Array.from({ length: 200 }, (_, i) =>
      createCommit(`commit${i}`, i < 199 ? [`commit${i + 1}`] : [])
    )
    const moreCommits = [createCommit('ddd', ['ccc']), createCommit('ccc', [])]

    // Queue both responses
    mockLog.mockResolvedValueOnce(initialCommits).mockResolvedValueOnce(moreCommits)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    // Wait for initial load
    await vi.waitFor(() => {
      const state = useGraphStore.getState()
      return state.commits.length === 200 && !state.isLoading
    })

    // Verify hasMore is true
    expect(useGraphStore.getState().hasMore).toBe(true)

    // Load more
    await store.loadMore()

    // Wait for loadMore to complete
    await vi.waitFor(() => {
      const state = useGraphStore.getState()
      return state.commits.length === 202 && !state.isLoading
    })

    const state = useGraphStore.getState()
    expect(state.commits).toHaveLength(202)
    expect(state.graphRows).toHaveLength(202)
    expect(mockLog).toHaveBeenCalledTimes(2)
    // Second call should have skip parameter
    expect(mockLog).toHaveBeenNthCalledWith(2, '/test/repo', expect.objectContaining({ skip: 200 }))
  })

  it('should rebuild graph rows on data change', async () => {
    const commits = [createCommit('bbb', ['aaa']), createCommit('aaa', [])]
    mockLog.mockResolvedValue(commits)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    await vi.waitFor(() => {
      const state = useGraphStore.getState()
      return state.commits.length === 2 && !state.isLoading
    })

    const state = useGraphStore.getState()
    // Graph rows should be created with columns assigned
    expect(state.graphRows).toHaveLength(2)
    expect(state.graphRows[0].column).toBeDefined()
    // Commits should match (order preserved from assignLanes)
    const commitHashes = state.graphRows.map((r) => r.commit.hash)
    expect(commitHashes).toContain('aaa')
    expect(commitHashes).toContain('bbb')
  })

  it('should set selected commit', async () => {
    const testCommits = [createCommit('aaa', ['bbb']), createCommit('bbb', [])]
    const testDetail: CommitDetail = {
      commit: testCommits[0],
      changedFiles: [{ path: 'file.txt', status: 'modified' }]
    }

    mockLog.mockResolvedValue(testCommits)
    mockShow.mockResolvedValue(testDetail)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    await vi.waitFor(() => useGraphStore.getState().commits.length === 2)

    await store.selectCommit('aaa')

    await vi.waitFor(() => useGraphStore.getState().selectedCommitDetail !== null)

    const state = useGraphStore.getState()
    expect(state.selectedCommitHash).toBe('aaa')
    expect(state.selectedCommitDetail).toEqual(testDetail)
    expect(mockShow).toHaveBeenCalledWith('/test/repo', 'aaa')
  })

  it('should apply branch filter', async () => {
    const commits = [createCommit('aaa', [])]
    mockLog.mockResolvedValue(commits)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    await vi.waitFor(() => useGraphStore.getState().commits.length === 1)

    mockLog.mockClear()
    mockLog.mockResolvedValue([createCommit('bbb', [])])

    store.setBranchFilter('feature-branch')

    await vi.waitFor(() => mockLog.mock.calls.length > 0)

    expect(mockLog).toHaveBeenCalledWith(
      '/test/repo',
      expect.objectContaining({
        branch: 'feature-branch',
        all: false // Should not use --all when filtering by branch
      })
    )
  })

  it('should apply search filter', async () => {
    const commits = [createCommit('aaa', [])]
    mockLog.mockResolvedValue(commits)

    const store = useGraphStore.getState()
    store.setRepoPath('/test/repo')

    await vi.waitFor(() => useGraphStore.getState().commits.length === 1)

    mockLog.mockClear()
    mockLog.mockResolvedValue([createCommit('bbb', [])])

    store.setSearchQuery('bugfix')

    await vi.waitFor(() => mockLog.mock.calls.length > 0)

    expect(mockLog).toHaveBeenCalledWith(
      '/test/repo',
      expect.objectContaining({
        search: 'bugfix'
      })
    )
  })
})
