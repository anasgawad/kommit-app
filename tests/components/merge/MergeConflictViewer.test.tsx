// ============================================================
// Kommit — MergeConflictViewer Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MergeConflictViewer } from '../../../src/renderer/components/merge/MergeConflictViewer'

const mockLoadConflictedFiles = vi.fn()
const mockLoadFileContent = vi.fn()
const mockMarkResolved = vi.fn()
const mockSetSelectedFile = vi.fn()
const mockSetResolvedResult = vi.fn()
const mockWriteResolved = vi.fn()

const defaultStoreState = {
  conflictedFiles: [],
  selectedFile: null,
  fileContent: null,
  resolvedResult: '',
  isLoading: false,
  isContentLoading: false,
  error: null,
  loadConflictedFiles: mockLoadConflictedFiles,
  loadFileContent: mockLoadFileContent,
  markResolved: mockMarkResolved,
  setSelectedFile: mockSetSelectedFile,
  setResolvedResult: mockSetResolvedResult,
  setError: vi.fn(),
  writeResolved: mockWriteResolved
}

vi.mock('../../../src/renderer/stores/conflict-store', () => ({
  useConflictStore: vi.fn(() => defaultStoreState)
}))

import { useConflictStore } from '../../../src/renderer/stores/conflict-store'
const mockUseConflictStore = vi.mocked(useConflictStore)

const sampleFile = { path: 'src/app.ts', conflictCount: 2 }
const sampleContent = {
  ours: 'const x = 1\nours version',
  base: 'const x = 1\nbase version',
  theirs: 'const x = 1\ntheirs version',
  result: 'const x = 1\n<<<<<<< HEAD\nours version\n=======\ntheirs version\n>>>>>>> branch'
}

describe('MergeConflictViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConflictStore.mockReturnValue({ ...defaultStoreState })
    mockLoadConflictedFiles.mockResolvedValue(undefined)
    mockLoadFileContent.mockResolvedValue(undefined)
    mockMarkResolved.mockResolvedValue(undefined)
  })

  it('should display 3-pane view (ours | base | theirs)', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    expect(screen.getByTestId('conflict-pane-ours')).toBeTruthy()
    expect(screen.getByTestId('conflict-pane-base')).toBeTruthy()
    expect(screen.getByTestId('conflict-pane-theirs')).toBeTruthy()
  })

  it('should display result pane below', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    expect(screen.getByTestId('result-editor')).toBeTruthy()
  })

  it('should highlight conflict regions (show remaining conflicts count)', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result // has 1 conflict marker set
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    expect(screen.getByTestId('remaining-conflicts')).toBeTruthy()
    expect(screen.getByText(/1 conflict remaining/)).toBeTruthy()
  })

  it('should accept "ours" when clicking accept-left', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    fireEvent.click(screen.getByTestId('accept-ours-btn'))
    expect(mockSetResolvedResult).toHaveBeenCalledWith(sampleContent.ours)
  })

  it('should accept "theirs" when clicking accept-right', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    fireEvent.click(screen.getByTestId('accept-theirs-btn'))
    expect(mockSetResolvedResult).toHaveBeenCalledWith(sampleContent.theirs)
  })

  it('should accept both when clicking accept-both', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: sampleContent.result
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    fireEvent.click(screen.getByTestId('accept-both-btn'))
    expect(mockSetResolvedResult).toHaveBeenCalledWith(
      sampleContent.ours + '\n' + sampleContent.theirs
    )
  })

  it('should allow manual editing of result', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: 'clean result'
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    const editor = screen.getByTestId('result-editor') as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: 'manually edited' } })
    expect(mockSetResolvedResult).toHaveBeenCalledWith('manually edited')
  })

  it('should mark file as resolved', async () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult: 'clean result with no markers'
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    const btn = screen.getByTestId('mark-resolved-btn')
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockMarkResolved).toHaveBeenCalledWith('/repo', 'src/app.ts')
    })
  })

  it('should show remaining conflicts count', () => {
    mockUseConflictStore.mockReturnValue({
      ...defaultStoreState,
      conflictedFiles: [sampleFile],
      selectedFile: sampleFile,
      fileContent: sampleContent,
      resolvedResult:
        '<<<<<<< a\nfoo\n=======\nbar\n>>>>>>> b\n<<<<<<< c\nbaz\n=======\nqux\n>>>>>>> d'
    })
    render(<MergeConflictViewer repoPath="/repo" />)

    expect(screen.getByText(/2 conflicts remaining/)).toBeTruthy()
  })

  it('should show empty state when no conflicts', () => {
    render(<MergeConflictViewer repoPath="/repo" />)
    expect(screen.getByTestId('no-conflicts')).toBeTruthy()
  })
})
