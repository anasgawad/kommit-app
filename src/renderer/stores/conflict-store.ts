// ============================================================
// Kommit — Conflict Store (Zustand)
// ============================================================

import { create } from 'zustand'
import type { ConflictFile, ConflictFileContent } from '@shared/types'

interface ConflictState {
  conflictedFiles: ConflictFile[]
  selectedFile: ConflictFile | null
  fileContent: ConflictFileContent | null
  resolvedResult: string
  isLoading: boolean
  isContentLoading: boolean
  error: string | null

  // Actions
  setSelectedFile: (file: ConflictFile | null) => void
  setResolvedResult: (result: string) => void
  setError: (error: string | null) => void

  // Async actions
  loadConflictedFiles: (repoPath: string) => Promise<void>
  loadFileContent: (repoPath: string, filePath: string) => Promise<void>
  markResolved: (repoPath: string, filePath: string) => Promise<void>
  writeResolved: (repoPath: string, filePath: string, content: string) => Promise<void>
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  conflictedFiles: [],
  selectedFile: null,
  fileContent: null,
  resolvedResult: '',
  isLoading: false,
  isContentLoading: false,
  error: null,

  setSelectedFile: (file) => {
    set({ selectedFile: file, fileContent: null, resolvedResult: '' })
  },

  setResolvedResult: (result) => set({ resolvedResult: result }),

  setError: (error) => set({ error }),

  loadConflictedFiles: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      const files = await window.api.git.getConflictedFiles(repoPath)
      set({ conflictedFiles: files, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load conflicted files',
        isLoading: false
      })
    }
  },

  loadFileContent: async (repoPath, filePath) => {
    set({ isContentLoading: true, error: null })
    try {
      const content = await window.api.git.getConflictFileContent(repoPath, filePath)
      set({ fileContent: content, resolvedResult: content.result, isContentLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load file content',
        isContentLoading: false
      })
    }
  },

  markResolved: async (repoPath, filePath) => {
    set({ isLoading: true, error: null })
    try {
      // First write the resolved result
      const { resolvedResult } = get()
      await window.api.git.writeResolvedFile(repoPath, filePath, resolvedResult)
      await window.api.git.markResolved(repoPath, filePath)
      // Reload conflicted files
      const files = await window.api.git.getConflictedFiles(repoPath)
      set({ conflictedFiles: files, isLoading: false, selectedFile: null, fileContent: null })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to mark file as resolved',
        isLoading: false
      })
      throw err
    }
  },

  writeResolved: async (repoPath, filePath, content) => {
    try {
      await window.api.git.writeResolvedFile(repoPath, filePath, content)
      set({ resolvedResult: content })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to write resolved content' })
      throw err
    }
  }
}))
