// ============================================================
// Kommit — Rebase Store (Zustand)
// ============================================================

import { create } from 'zustand'
import type { RebaseAction, RebaseStatus } from '@shared/types'

interface RebaseState {
  actions: RebaseAction[]
  baseHash: string
  status: RebaseStatus | null
  isLoading: boolean
  error: string | null

  // Actions
  setActions: (actions: RebaseAction[]) => void
  setBaseHash: (hash: string) => void
  updateAction: (hash: string, action: RebaseAction['action']) => void
  setError: (error: string | null) => void
  resetSetup: () => void

  // Async actions
  loadStatus: (repoPath: string) => Promise<void>
  startRebase: (repoPath: string, baseHash: string, actions: RebaseAction[]) => Promise<void>
  continueRebase: (repoPath: string) => Promise<void>
  abortRebase: (repoPath: string) => Promise<void>
  skipRebase: (repoPath: string) => Promise<void>
}

export const useRebaseStore = create<RebaseState>((set, get) => ({
  actions: [],
  baseHash: '',
  status: null,
  isLoading: false,
  error: null,

  setActions: (actions) => set({ actions }),
  setBaseHash: (hash) => set({ baseHash: hash }),

  updateAction: (hash, action) => {
    const actions = get().actions.map((a) => (a.hash === hash ? { ...a, action } : a))
    set({ actions })
  },

  setError: (error) => set({ error }),

  resetSetup: () => set({ actions: [], baseHash: '' }),

  loadStatus: async (repoPath) => {
    try {
      const status = await window.api.git.rebaseStatus(repoPath)
      set({ status })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to get rebase status' })
    }
  },

  startRebase: async (repoPath, baseHash, actions) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.rebaseInteractive(repoPath, baseHash, actions)
      const status = await window.api.git.rebaseStatus(repoPath)
      // On clean completion (not paused) clear the setup fields so the panel
      // reflects the finished state rather than appearing unchanged.
      if (!status?.inProgress) {
        set({ status, isLoading: false, actions: [], baseHash: '' })
      } else {
        set({ status, isLoading: false })
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to start rebase',
        isLoading: false
      })
      throw err
    }
  },

  continueRebase: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.rebaseContinue(repoPath)
      const status = await window.api.git.rebaseStatus(repoPath)
      set({ status, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to continue rebase',
        isLoading: false
      })
      throw err
    }
  },

  abortRebase: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.rebaseAbort(repoPath)
      set({ status: null, actions: [], isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to abort rebase',
        isLoading: false
      })
      throw err
    }
  },

  skipRebase: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.rebaseSkip(repoPath)
      const status = await window.api.git.rebaseStatus(repoPath)
      set({ status, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to skip rebase step',
        isLoading: false
      })
      throw err
    }
  }
}))
