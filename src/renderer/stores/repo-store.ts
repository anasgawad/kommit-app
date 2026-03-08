// ============================================================
// Kommit — Repository Store (Zustand)
// ============================================================

import { create } from 'zustand'
import type { GitStatus, RepoInfo } from '@shared/types'

interface RepoState {
  // Current repository
  activeRepo: RepoInfo | null
  recentRepos: RepoInfo[]
  status: GitStatus | null
  isLoading: boolean
  error: string | null

  // Actions
  setActiveRepo: (repo: RepoInfo | null) => void
  setRecentRepos: (repos: RepoInfo[]) => void
  setStatus: (status: GitStatus | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async actions
  openRepo: (path: string) => Promise<void>
  refreshStatus: () => Promise<void>
  loadRecentRepos: () => Promise<void>
}

export const useRepoStore = create<RepoState>((set, get) => ({
  activeRepo: null,
  recentRepos: [],
  status: null,
  isLoading: false,
  error: null,

  setActiveRepo: (repo) => set({ activeRepo: repo, error: null }),
  setRecentRepos: (repos) => set({ recentRepos: repos }),
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  openRepo: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const isRepo = await window.api.git.isRepo(path)
      if (!isRepo) {
        set({ error: `Not a git repository: ${path}`, isLoading: false })
        return
      }

      // Extract name from path
      const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
      const name = parts[parts.length - 1] ?? 'unknown'

      const repo: RepoInfo = { path, name, lastOpened: Date.now() }
      set({ activeRepo: repo })

      // Add to recent repos
      await window.api.repo.addRecent(path, name)
      await get().loadRecentRepos()

      // Fetch status
      await get().refreshStatus()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to open repository' })
    } finally {
      set({ isLoading: false })
    }
  },

  refreshStatus: async () => {
    const { activeRepo } = get()
    if (!activeRepo) return

    try {
      const status = await window.api.git.status(activeRepo.path)
      set({ status })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to get status' })
    }
  },

  loadRecentRepos: async () => {
    try {
      const repos = await window.api.repo.getRecent()
      set({ recentRepos: repos })
    } catch {
      // Silently fail — not critical
    }
  }
}))
