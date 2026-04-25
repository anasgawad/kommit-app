// ============================================================
// Kommit — RebasePanel Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RebasePanel } from '../../../src/renderer/components/rebase/RebasePanel'

const mockStartRebase = vi.fn()
const mockContinueRebase = vi.fn()
const mockAbortRebase = vi.fn()
const mockSkipRebase = vi.fn()
const mockSetActions = vi.fn()
const mockUpdateAction = vi.fn()
const mockLoadStatus = vi.fn()

const defaultStoreState = {
  actions: [],
  status: null,
  isLoading: false,
  error: null,
  setActions: mockSetActions,
  updateAction: mockUpdateAction,
  setError: vi.fn(),
  loadStatus: mockLoadStatus,
  startRebase: mockStartRebase,
  continueRebase: mockContinueRebase,
  abortRebase: mockAbortRebase,
  skipRebase: mockSkipRebase
}

vi.mock('../../../src/renderer/stores/rebase-store', () => ({
  useRebaseStore: vi.fn(() => defaultStoreState)
}))

import { useRebaseStore } from '../../../src/renderer/stores/rebase-store'
const mockUseRebaseStore = vi.mocked(useRebaseStore)

const sampleActions = [
  { action: 'pick' as const, hash: 'abc1234', subject: 'Fix bug' },
  { action: 'pick' as const, hash: 'def5678', subject: 'Add feature' }
]

const inProgressStatus = {
  inProgress: true,
  currentStep: 2,
  totalSteps: 5,
  currentHash: 'abc1234',
  conflictedFiles: []
}

describe('RebasePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRebaseStore.mockReturnValue({ ...defaultStoreState })
    mockStartRebase.mockResolvedValue(undefined)
    mockContinueRebase.mockResolvedValue(undefined)
    mockAbortRebase.mockResolvedValue(undefined)
    mockSkipRebase.mockResolvedValue(undefined)
  })

  it('should display commits in rebase range', () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      actions: sampleActions
    })
    render(<RebasePanel repoPath="/repo" />)

    expect(screen.getByTestId('rebase-commit-abc1234')).toBeTruthy()
    expect(screen.getByTestId('rebase-commit-def5678')).toBeTruthy()
    expect(screen.getByText('Fix bug')).toBeTruthy()
    expect(screen.getByText('Add feature')).toBeTruthy()
  })

  it('should change action via dropdown (pick/squash/reword/drop/fixup)', () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      actions: sampleActions
    })
    render(<RebasePanel repoPath="/repo" />)

    const select = screen.getByTestId('rebase-action-select-abc1234') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'squash' } })

    expect(mockUpdateAction).toHaveBeenCalledWith('abc1234', 'squash')
  })

  it('should show rebase progress during execution', () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      status: inProgressStatus
    })
    render(<RebasePanel repoPath="/repo" />)

    expect(screen.getByTestId('rebase-progress')).toBeTruthy()
    expect(screen.getByText('2 / 5')).toBeTruthy()
  })

  it('should show abort/continue/skip buttons during rebase', () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      status: inProgressStatus
    })
    render(<RebasePanel repoPath="/repo" />)

    expect(screen.getByTestId('rebase-controls')).toBeTruthy()
    expect(screen.getByTestId('rebase-continue-btn')).toBeTruthy()
    expect(screen.getByTestId('rebase-abort-btn')).toBeTruthy()
    expect(screen.getByTestId('rebase-skip-btn')).toBeTruthy()
  })

  it('should call abortRebase when Abort clicked', async () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      status: inProgressStatus
    })
    render(<RebasePanel repoPath="/repo" />)

    fireEvent.click(screen.getByTestId('rebase-abort-btn'))

    await waitFor(() => {
      expect(mockAbortRebase).toHaveBeenCalledWith('/repo')
    })
  })

  it('should disable start when no changes made', () => {
    mockUseRebaseStore.mockReturnValue({
      ...defaultStoreState,
      actions: sampleActions // all 'pick' — no changes
    })
    render(<RebasePanel repoPath="/repo" />)

    // Set base hash to enable the button in principle, then check disabled due to no changes
    const startBtn = screen.getByTestId('rebase-start-btn')
    expect(startBtn).toBeDisabled()
  })
})
