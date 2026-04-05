// ============================================================
// Kommit — Changes Store (Zustand)
// Manages working tree state, diff view, and staging operations
// ============================================================

import { create } from 'zustand'
import type { DiffFile, FileStatus } from '@shared/types'
import { parseDiff } from '@shared/diff-parser'

export type DiffViewMode = 'inline' | 'side-by-side'

interface ChangesState {
  // Selected file in the working tree panel
  selectedFile: FileStatus | null
  // Whether the selected file is staged (affects which diff to load)
  selectedIsStaged: boolean
  // Current parsed diff for the selected file
  currentDiff: DiffFile[]
  // Loading state for diff fetch
  isDiffLoading: boolean
  // Diff view mode
  diffViewMode: DiffViewMode
  // Error message
  error: string | null

  // Actions
  setSelectedFile: (file: FileStatus | null, isStaged: boolean) => void
  setDiffViewMode: (mode: DiffViewMode) => void
  setError: (error: string | null) => void

  // Async actions
  loadDiff: (repoPath: string, file: FileStatus, isStaged: boolean) => Promise<void>
  stageFile: (repoPath: string, filePath: string) => Promise<void>
  unstageFile: (repoPath: string, filePath: string) => Promise<void>
  stageAll: (repoPath: string, files: FileStatus[]) => Promise<void>
  unstageAll: (repoPath: string, files: FileStatus[]) => Promise<void>
  discardFile: (repoPath: string, filePath: string) => Promise<void>
  stageHunk: (repoPath: string, patch: string) => Promise<void>
  clearSelection: () => void
}

export const useChangesStore = create<ChangesState>((set, _get) => ({
  selectedFile: null,
  selectedIsStaged: false,
  currentDiff: [],
  isDiffLoading: false,
  diffViewMode: 'inline',
  error: null,

  setSelectedFile: (file, isStaged) => {
    set({ selectedFile: file, selectedIsStaged: isStaged })
  },

  setDiffViewMode: (mode) => set({ diffViewMode: mode }),

  setError: (error) => set({ error }),

  loadDiff: async (repoPath, file, isStaged) => {
    set({ isDiffLoading: true, error: null, currentDiff: [] })
    try {
      let raw: string
      if (isStaged) {
        raw = await window.api.git.diffStaged(repoPath, file.path)
      } else if (file.workTreeStatus === '?') {
        // Untracked file: compare against /dev/null to get a fully-added diff
        raw = await window.api.git.diffUntracked(repoPath, file.path)
      } else {
        raw = await window.api.git.diff(repoPath, file.path)
      }
      const parsed = parseDiff(raw)
      set({ currentDiff: parsed, isDiffLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load diff',
        isDiffLoading: false
      })
    }
  },

  stageFile: async (repoPath, filePath) => {
    try {
      await window.api.git.stage(repoPath, filePath)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to stage file' })
      throw err
    }
  },

  unstageFile: async (repoPath, filePath) => {
    try {
      await window.api.git.unstage(repoPath, filePath)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to unstage file' })
      throw err
    }
  },

  stageAll: async (repoPath, files) => {
    try {
      await Promise.all(files.map((f) => window.api.git.stage(repoPath, f.path)))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to stage all files' })
      throw err
    }
  },

  unstageAll: async (repoPath, files) => {
    try {
      await Promise.all(files.map((f) => window.api.git.unstage(repoPath, f.path)))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to unstage all files' })
      throw err
    }
  },

  discardFile: async (repoPath, filePath) => {
    try {
      await window.api.git.discard(repoPath, filePath)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to discard changes' })
      throw err
    }
  },

  stageHunk: async (repoPath, patch) => {
    try {
      await window.api.git.stageHunk(repoPath, patch)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to stage hunk' })
      throw err
    }
  },

  clearSelection: () => {
    set({ selectedFile: null, selectedIsStaged: false, currentDiff: [], error: null })
  }
}))
