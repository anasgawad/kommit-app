// ============================================================
// Kommit — StashPanel Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StashPanel } from '../../../src/renderer/components/stash/StashPanel'

// Mock the stash store
const mockLoadStashes = vi.fn()
const mockStashApply = vi.fn()
const mockStashPop = vi.fn()
const mockStashDrop = vi.fn()
const mockLoadStashDiff = vi.fn()
const mockSetSelectedIndex = vi.fn()
const mockStashSave = vi.fn()

const defaultStoreState = {
  stashes: [],
  selectedIndex: null,
  stashDiff: null,
  isLoading: false,
  isDiffLoading: false,
  error: null,
  loadStashes: mockLoadStashes,
  stashApply: mockStashApply,
  stashPop: mockStashPop,
  stashDrop: mockStashDrop,
  loadStashDiff: mockLoadStashDiff,
  setSelectedIndex: mockSetSelectedIndex,
  stashSave: mockStashSave,
  setError: vi.fn()
}

vi.mock('../../../src/renderer/stores/stash-store', () => ({
  useStashStore: vi.fn(() => defaultStoreState)
}))

import { useStashStore } from '../../../src/renderer/stores/stash-store'
const mockUseStashStore = vi.mocked(useStashStore)

const sampleStashes = [
  {
    index: 0,
    message: 'WIP on main: fix bug',
    branch: 'main',
    date: new Date('2024-01-15'),
    hash: 'abc1234'
  },
  {
    index: 1,
    message: 'WIP on feature: add login',
    branch: 'feature/login',
    date: new Date('2024-01-14'),
    hash: 'def5678'
  }
]

describe('StashPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStashStore.mockReturnValue({ ...defaultStoreState })
    mockLoadStashes.mockResolvedValue(undefined)
    mockStashApply.mockResolvedValue(undefined)
    mockStashPop.mockResolvedValue(undefined)
    mockStashDrop.mockResolvedValue(undefined)
    mockLoadStashDiff.mockResolvedValue(undefined)
    mockStashSave.mockResolvedValue(undefined)
  })

  it('should display stash list with messages', () => {
    mockUseStashStore.mockReturnValue({
      ...defaultStoreState,
      stashes: sampleStashes
    })
    render(<StashPanel repoPath="/repo" />)

    expect(screen.getByText('WIP on main: fix bug')).toBeTruthy()
    expect(screen.getByText('WIP on feature: add login')).toBeTruthy()
  })

  it('should show empty state when no stashes', () => {
    render(<StashPanel repoPath="/repo" />)
    expect(screen.getByTestId('stash-empty')).toBeTruthy()
  })

  it('should call apply when Apply button clicked', async () => {
    mockUseStashStore.mockReturnValue({
      ...defaultStoreState,
      stashes: sampleStashes
    })
    render(<StashPanel repoPath="/repo" />)

    const applyBtn = screen.getByTestId('stash-apply-0')
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(mockStashApply).toHaveBeenCalledWith('/repo', 0)
    })
  })

  it('should call pop when Pop button clicked', async () => {
    mockUseStashStore.mockReturnValue({
      ...defaultStoreState,
      stashes: sampleStashes
    })
    render(<StashPanel repoPath="/repo" />)

    const popBtn = screen.getByTestId('stash-pop-0')
    fireEvent.click(popBtn)

    await waitFor(() => {
      expect(mockStashPop).toHaveBeenCalledWith('/repo', 0)
    })
  })

  it('should confirm before dropping stash', async () => {
    mockUseStashStore.mockReturnValue({
      ...defaultStoreState,
      stashes: sampleStashes
    })
    render(<StashPanel repoPath="/repo" />)

    // Click drop — should show confirmation dialog
    const dropBtn = screen.getByTestId('stash-drop-0')
    fireEvent.click(dropBtn)

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByTestId('drop-confirm-btn')).toBeTruthy()
    })

    // Confirm drop
    fireEvent.click(screen.getByTestId('drop-confirm-btn'))

    await waitFor(() => {
      expect(mockStashDrop).toHaveBeenCalledWith('/repo', 0)
    })
  })

  it('should show diff preview when selecting stash', async () => {
    mockUseStashStore.mockReturnValue({
      ...defaultStoreState,
      stashes: sampleStashes,
      selectedIndex: 0,
      stashDiff: 'diff --git a/file.ts b/file.ts\n+added line'
    })
    render(<StashPanel repoPath="/repo" />)

    expect(screen.getByTestId('stash-diff-preview')).toBeTruthy()
    expect(screen.getByText(/added line/)).toBeTruthy()
  })
})
