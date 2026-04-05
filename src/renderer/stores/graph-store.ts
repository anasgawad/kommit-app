// ============================================================
// Kommit — Graph Store (Zustand)
// Manages commit history, graph layout, and selection state
// ============================================================

import { create } from 'zustand'
import type { Commit, GraphRow, CommitDetail } from '@shared/types'
import { assignLanes } from '../graph/lane-algorithm'

interface GraphState {
  // Data
  commits: Commit[]
  graphRows: GraphRow[]

  // Selection
  selectedCommitHash: string | null
  selectedCommitDetail: CommitDetail | null

  // Filters
  branchFilter: string | null
  authorFilter: string | null
  searchQuery: string | null

  // Pagination
  pageSize: number
  hasMore: boolean

  // UI state
  isLoading: boolean
  error: string | null

  // Active repo path (needed for API calls)
  repoPath: string | null

  // Actions
  setRepoPath: (path: string | null) => void
  loadCommits: () => Promise<void>
  loadMore: () => Promise<void>
  selectCommit: (hash: string) => Promise<void>
  clearSelection: () => void
  setBranchFilter: (branch: string | null) => void
  setAuthorFilter: (author: string | null) => void
  setSearchQuery: (query: string | null) => void
  clearFilters: () => void
  reset: () => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  // Initial state
  commits: [],
  graphRows: [],
  selectedCommitHash: null,
  selectedCommitDetail: null,
  branchFilter: null,
  authorFilter: null,
  searchQuery: null,
  pageSize: 200,
  hasMore: true,
  isLoading: false,
  error: null,
  repoPath: null,

  // Set repository path
  setRepoPath: (path) => {
    // Always reset state (filters, selection, commits) when changing repos
    get().reset()
    set({ repoPath: path })
    if (path) {
      get().loadCommits()
    }
  },

  // Load initial batch of commits
  loadCommits: async () => {
    const { repoPath, pageSize, branchFilter, authorFilter, searchQuery } = get()
    if (!repoPath) return

    set({ isLoading: true, error: null })

    try {
      const commits = await window.api.git.log(repoPath, {
        maxCount: pageSize,
        all: !branchFilter, // if filtering by branch, don't use --all
        branch: branchFilter || undefined,
        author: authorFilter || undefined,
        search: searchQuery || undefined
      })

      const graphRows = assignLanes(commits)

      set({
        commits,
        graphRows,
        hasMore: commits.length === pageSize,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load commits',
        isLoading: false
      })
    }
  },

  // Load more commits (pagination)
  loadMore: async () => {
    const {
      repoPath,
      commits,
      pageSize,
      hasMore,
      isLoading,
      branchFilter,
      authorFilter,
      searchQuery
    } = get()
    if (!repoPath || !hasMore || isLoading) return

    set({ isLoading: true })

    try {
      const newCommits = await window.api.git.log(repoPath, {
        maxCount: pageSize,
        skip: commits.length,
        all: !branchFilter,
        branch: branchFilter || undefined,
        author: authorFilter || undefined,
        search: searchQuery || undefined
      })

      const allCommits = [...commits, ...newCommits]
      const graphRows = assignLanes(allCommits)

      set({
        commits: allCommits,
        graphRows,
        hasMore: newCommits.length === pageSize,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more commits',
        isLoading: false
      })
    }
  },

  // Select a commit and fetch its details
  selectCommit: async (hash) => {
    const { repoPath, selectedCommitHash } = get()
    if (!repoPath) return

    // If already selected, do nothing
    if (selectedCommitHash === hash) return

    set({ selectedCommitHash: hash, selectedCommitDetail: null })

    try {
      const detail = await window.api.git.show(repoPath, hash)
      // Only update if this is still the selected commit (user might have clicked another)
      if (get().selectedCommitHash === hash) {
        set({ selectedCommitDetail: detail })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load commit details'
      })
    }
  },

  // Clear commit selection
  clearSelection: () => {
    set({ selectedCommitHash: null, selectedCommitDetail: null })
  },

  // Set branch filter
  setBranchFilter: (branch) => {
    set({ branchFilter: branch })
    get().loadCommits()
  },

  // Set author filter
  setAuthorFilter: (author) => {
    set({ authorFilter: author })
    get().loadCommits()
  },

  // Set search query
  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().loadCommits()
  },

  // Clear all filters
  clearFilters: () => {
    set({ branchFilter: null, authorFilter: null, searchQuery: null })
    get().loadCommits()
  },

  // Reset store to initial state
  reset: () => {
    set({
      commits: [],
      graphRows: [],
      selectedCommitHash: null,
      selectedCommitDetail: null,
      branchFilter: null,
      authorFilter: null,
      searchQuery: null,
      hasMore: true,
      isLoading: false,
      error: null
    })
  }
}))
