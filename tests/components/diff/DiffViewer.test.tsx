// ============================================================
// Kommit — DiffViewer Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffViewer } from '../../../src/renderer/components/diff/DiffViewer'
import { useChangesStore } from '../../../src/renderer/stores/changes-store'
import { useRepoStore } from '../../../src/renderer/stores/repo-store'
import { FileStatusCode } from '../../../src/shared/types'
import type { FileStatus, DiffFile } from '../../../src/shared/types'

// Mock Shiki to avoid async loading in tests
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    codeToHtml: vi.fn().mockReturnValue('<span>code</span>')
  })
}))

// Mock zustand stores
vi.mock('../../../src/renderer/stores/changes-store', () => ({
  useChangesStore: vi.fn()
}))

vi.mock('../../../src/renderer/stores/repo-store', () => ({
  useRepoStore: vi.fn()
}))

const mockUseChangesStore = vi.mocked(useChangesStore)
const mockUseRepoStore = vi.mocked(useRepoStore)

const mockSetDiffViewMode = vi.fn()

const SAMPLE_DIFF_FILE: DiffFile = {
  oldPath: 'src/foo.ts',
  newPath: 'src/foo.ts',
  status: 'modified',
  isBinary: false,
  hunks: [
    {
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      header: '@@ -1,3 +1,4 @@',
      lines: [
        { type: 'context', content: 'line one', oldLineNumber: 1, newLineNumber: 1 },
        { type: 'delete', content: 'old line', oldLineNumber: 2 },
        { type: 'add', content: 'new line', newLineNumber: 2 },
        { type: 'add', content: 'extra line', newLineNumber: 3 },
        { type: 'context', content: 'line three', oldLineNumber: 3, newLineNumber: 4 }
      ]
    }
  ]
}

const SELECTED_FILE: FileStatus = {
  path: 'src/foo.ts',
  indexStatus: FileStatusCode.Modified,
  workTreeStatus: '.',
  isStaged: false,
  isConflicted: false
}

function setupStore(overrides: Partial<ReturnType<typeof useChangesStore>> = {}) {
  mockUseChangesStore.mockReturnValue({
    selectedFile: null,
    selectedIsStaged: false,
    currentDiff: [],
    isDiffLoading: false,
    diffViewMode: 'inline',
    error: null,
    setSelectedFile: vi.fn(),
    setDiffViewMode: mockSetDiffViewMode,
    setError: vi.fn(),
    loadDiff: vi.fn(),
    stageFile: vi.fn(),
    unstageFile: vi.fn(),
    stageAll: vi.fn(),
    unstageAll: vi.fn(),
    discardFile: vi.fn(),
    stageHunk: vi.fn(),
    clearSelection: vi.fn(),
    ...overrides
  } as unknown as ReturnType<typeof useChangesStore>)

  mockUseRepoStore.mockReturnValue({
    refreshStatus: vi.fn().mockResolvedValue(undefined)
  } as unknown as ReturnType<typeof useRepoStore>)
}

describe('DiffViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStore()
  })

  it('should show "Select a file to view diff" when no file is selected', () => {
    setupStore({ selectedFile: null })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText('Select a file to view diff')).toBeInTheDocument()
  })

  it('should show loading state when isDiffLoading is true', () => {
    setupStore({ selectedFile: SELECTED_FILE, isDiffLoading: true, currentDiff: [] })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText('Loading diff…')).toBeInTheDocument()
  })

  it('should show "No changes to display" when diff is empty', () => {
    setupStore({ selectedFile: SELECTED_FILE, isDiffLoading: false, currentDiff: [] })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText('No changes to display')).toBeInTheDocument()
  })

  it('should show the file path in the toolbar', () => {
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText('src/foo.ts')).toBeInTheDocument()
  })

  it('should show inline/split toggle buttons', () => {
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByRole('button', { name: 'Inline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Split' })).toBeInTheDocument()
  })

  it('should call setDiffViewMode when toggling between inline and side-by-side', () => {
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    fireEvent.click(screen.getByRole('button', { name: 'Split' }))
    expect(mockSetDiffViewMode).toHaveBeenCalledWith('side-by-side')
  })

  it('should show "Binary file" message for binary diffs', () => {
    const binaryFile: DiffFile = {
      oldPath: 'image.png',
      newPath: 'image.png',
      status: 'binary',
      isBinary: true,
      hunks: []
    }
    setupStore({ selectedFile: SELECTED_FILE, currentDiff: [binaryFile], diffViewMode: 'inline' })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText(/Binary file/i)).toBeInTheDocument()
  })

  it('should render file tabs when multiple files are present', () => {
    const secondFile: DiffFile = {
      oldPath: 'src/bar.ts',
      newPath: 'src/bar.ts',
      status: 'modified',
      isBinary: false,
      hunks: []
    }
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE, secondFile],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    // File tab labels use last path segment
    expect(screen.getByRole('button', { name: /foo\.ts/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bar\.ts/ })).toBeInTheDocument()
  })

  it('should NOT show file tabs when only one file is present', () => {
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    // The toolbar shows the filename as text, not as a tab button
    const buttons = screen.getAllByRole('button')
    // Only the Inline and Split buttons should be present (no tab buttons)
    expect(buttons.map((b) => b.textContent).filter((t) => t === 'foo.ts')).toHaveLength(0)
  })

  it('should show hunk header line in diff content', () => {
    setupStore({
      selectedFile: SELECTED_FILE,
      currentDiff: [SAMPLE_DIFF_FILE],
      diffViewMode: 'inline'
    })
    render(<DiffViewer repoPath="/repo" />)
    expect(screen.getByText('@@ -1,3 +1,4 @@')).toBeInTheDocument()
  })
})
