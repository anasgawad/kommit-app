// ============================================================
// Kommit — Stash Store (Zustand)
// ============================================================

import { create } from 'zustand'
import type { StashEntry, StashOptions } from '@shared/types'

interface StashState {
  stashes: StashEntry[]
  selectedIndex: number | null
  stashDiff: string | null
  isLoading: boolean
  isDiffLoading: boolean
  error: string | null

  // Actions
  setSelectedIndex: (index: number | null) => void
  setError: (error: string | null) => void

  // Async actions
  loadStashes: (repoPath: string) => Promise<void>
  stashSave: (repoPath: string, options?: StashOptions) => Promise<void>
  stashApply: (repoPath: string, index: number) => Promise<void>
  stashPop: (repoPath: string, index: number) => Promise<void>
  stashDrop: (repoPath: string, index: number) => Promise<void>
  loadStashDiff: (repoPath: string, index: number) => Promise<void>
}

export const useStashStore = create<StashState>((set, _get) => ({
  stashes: [],
  selectedIndex: null,
  stashDiff: null,
  isLoading: false,
  isDiffLoading: false,
  error: null,

  setSelectedIndex: (index) => set({ selectedIndex: index, stashDiff: null }),
  setError: (error) => set({ error }),

  loadStashes: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      const stashes = await window.api.git.stashList(repoPath)
      set({ stashes, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to list stashes',
        isLoading: false
      })
    }
  },

  stashSave: async (repoPath, options) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.stashSave(repoPath, options)
      const stashes = await window.api.git.stashList(repoPath)
      set({ stashes, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to stash changes',
        isLoading: false
      })
      throw err
    }
  },

  stashApply: async (repoPath, index) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.stashApply(repoPath, index)
      set({ isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to apply stash', isLoading: false })
      throw err
    }
  },

  stashPop: async (repoPath, index) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.stashPop(repoPath, index)
      const stashes = await window.api.git.stashList(repoPath)
      set({ stashes, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to pop stash', isLoading: false })
      throw err
    }
  },

  stashDrop: async (repoPath, index) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.git.stashDrop(repoPath, index)
      const stashes = await window.api.git.stashList(repoPath)
      set({ stashes, isLoading: false, selectedIndex: null, stashDiff: null })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to drop stash', isLoading: false })
      throw err
    }
  },

  loadStashDiff: async (repoPath, index) => {
    set({ isDiffLoading: true, error: null, stashDiff: null })
    try {
      const diff = await window.api.git.stashShow(repoPath, index)
      set({ stashDiff: diff, isDiffLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load stash diff',
        isDiffLoading: false
      })
    }
  }
}))
