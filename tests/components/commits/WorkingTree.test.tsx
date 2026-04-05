// ============================================================
// Kommit — WorkingTree Component Tests
// Covers discard confirmation dialog behavior
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkingTree } from '../../../src/renderer/components/commits/WorkingTree'
import { useChangesStore } from '../../../src/renderer/stores/changes-store'

vi.mock('../../../src/renderer/stores/changes-store', () => ({
  useChangesStore: vi.fn()
}))

const mockUseChangesStore = vi.mocked(useChangesStore)

const mockDiscardFile = vi.fn()
const mockStageFile = vi.fn()
const mockUnstageFile = vi.fn()
const mockSetSelectedFile = vi.fn()
const mockLoadDiff = vi.fn()
const mockStageAll = vi.fn()
const mockUnstageAll = vi.fn()

function setupStore() {
  mockUseChangesStore.mockReturnValue({
    selectedFile: null,
    selectedIsStaged: false,
    setSelectedFile: mockSetSelectedFile,
    loadDiff: mockLoadDiff,
    stageFile: mockStageFile,
    unstageFile: mockUnstageFile,
    discardFile: mockDiscardFile,
    stageAll: mockStageAll,
    unstageAll: mockUnstageAll
  } as unknown as ReturnType<typeof useChangesStore>)
}

const unstagedFile = {
  path: 'src/foo.ts',
  indexStatus: '.' as const,
  workTreeStatus: 'M' as const,
  isStaged: false,
  isConflicted: false
}

const baseStatus = {
  branch: 'main',
  isDetachedHead: false,
  tracking: null,
  staged: [],
  unstaged: [unstagedFile],
  untracked: [],
  conflicted: [],
  isClean: false
}

describe('WorkingTree — discard confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStore()
  })

  it('should NOT call discardFile immediately when discard button is clicked', async () => {
    const user = userEvent.setup()
    render(<WorkingTree repoPath="/repo" status={baseStatus} onRefresh={vi.fn()} />)

    // Hover to reveal the discard button
    const row = screen.getByText('src/foo.ts').closest('div[class*="group"]')!
    fireEvent.mouseEnter(row)

    const discardBtn = screen.getByTitle('Discard changes')
    await user.click(discardBtn)

    expect(mockDiscardFile).not.toHaveBeenCalled()
  })

  it('should show a confirmation dialog when discard button is clicked', async () => {
    const user = userEvent.setup()
    render(<WorkingTree repoPath="/repo" status={baseStatus} onRefresh={vi.fn()} />)

    const row = screen.getByText('src/foo.ts').closest('div[class*="group"]')!
    fireEvent.mouseEnter(row)

    await user.click(screen.getByTitle('Discard changes'))

    expect(screen.getByText('Discard changes?')).toBeInTheDocument()
    expect(screen.getByText(/permanently lost/i)).toBeInTheDocument()
  })

  it('should call discardFile after confirming in the dialog', async () => {
    const user = userEvent.setup()
    mockDiscardFile.mockResolvedValue(undefined)
    const onRefresh = vi.fn()
    render(<WorkingTree repoPath="/repo" status={baseStatus} onRefresh={onRefresh} />)

    const row = screen.getByText('src/foo.ts').closest('div[class*="group"]')!
    fireEvent.mouseEnter(row)

    await user.click(screen.getByTitle('Discard changes'))
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    await waitFor(() => {
      expect(mockDiscardFile).toHaveBeenCalledWith('/repo', 'src/foo.ts')
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  it('should NOT call discardFile when cancel is clicked in the dialog', async () => {
    const user = userEvent.setup()
    render(<WorkingTree repoPath="/repo" status={baseStatus} onRefresh={vi.fn()} />)

    const row = screen.getByText('src/foo.ts').closest('div[class*="group"]')!
    fireEvent.mouseEnter(row)

    await user.click(screen.getByTitle('Discard changes'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockDiscardFile).not.toHaveBeenCalled()
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument()
  })

  it('should dismiss the dialog when clicking the backdrop', async () => {
    const user = userEvent.setup()
    render(<WorkingTree repoPath="/repo" status={baseStatus} onRefresh={vi.fn()} />)

    const row = screen.getByText('src/foo.ts').closest('div[class*="group"]')!
    fireEvent.mouseEnter(row)

    await user.click(screen.getByTitle('Discard changes'))
    expect(screen.getByText('Discard changes?')).toBeInTheDocument()

    // Click backdrop (the fixed overlay div, not the inner box)
    const backdrop = screen.getByText('Discard changes?').closest('div[class*="fixed"]')!
    await user.click(backdrop)

    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument()
    expect(mockDiscardFile).not.toHaveBeenCalled()
  })
})
