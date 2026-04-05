// ============================================================
// Kommit — CommitForm Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitForm } from '../../../src/renderer/components/commits/CommitForm'
import { useRepoStore } from '../../../src/renderer/stores/repo-store'

// Mock zustand store
vi.mock('../../../src/renderer/stores/repo-store', () => ({
  useRepoStore: vi.fn()
}))

const mockUseRepoStore = vi.mocked(useRepoStore)

// Mock window.api
const mockApi = {
  git: {
    commit: vi.fn()
  }
}

function setupStore(stagedCount = 1) {
  mockUseRepoStore.mockReturnValue({
    status: {
      branch: 'main',
      isDetachedHead: false,
      tracking: null,
      staged: Array.from({ length: stagedCount }, (_, i) => ({
        path: `file${i}.ts`,
        indexStatus: 'M' as const,
        workTreeStatus: '.' as const,
        isStaged: true,
        isConflicted: false
      })),
      unstaged: [],
      untracked: [],
      conflicted: [],
      isClean: false
    },
    refreshStatus: vi.fn().mockResolvedValue(undefined)
  } as unknown as ReturnType<typeof useRepoStore>)
}

describe('CommitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as unknown as { api: typeof mockApi }).api = mockApi
    setupStore()
  })

  it('should render the subject input, body textarea, amend checkbox, and commit button', () => {
    render(<CommitForm repoPath="/repo" onCommit={vi.fn()} />)
    expect(screen.getByPlaceholderText('Summary (required)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument()
    expect(screen.getByText('Amend last commit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /commit/i })).toBeInTheDocument()
  })

  it('should disable commit button when subject is empty and amend is off', () => {
    render(<CommitForm repoPath="/repo" onCommit={vi.fn()} />)
    const button = screen.getByRole('button', { name: /commit/i })
    expect(button).toBeDisabled()
  })

  it('should enable commit button when a subject is typed and staged changes exist', async () => {
    const user = userEvent.setup()
    render(<CommitForm repoPath="/repo" onCommit={vi.fn()} />)
    const input = screen.getByPlaceholderText('Summary (required)')
    await user.type(input, 'Add feature')
    const button = screen.getByRole('button', { name: /commit/i })
    expect(button).not.toBeDisabled()
  })

  it('should show a character warning when subject exceeds 72 characters', async () => {
    const user = userEvent.setup()
    render(<CommitForm repoPath="/repo" onCommit={vi.fn()} />)
    const input = screen.getByPlaceholderText('Summary (required)')
    const longSubject = 'A'.repeat(73)
    await user.type(input, longSubject)
    expect(screen.getByText(/exceeds 72 characters/i)).toBeInTheDocument()
  })

  it('should call window.api.git.commit and onCommit callback on successful commit', async () => {
    const onCommit = vi.fn()
    mockApi.git.commit.mockResolvedValue('abc1234')
    const user = userEvent.setup()
    render(<CommitForm repoPath="/repo" onCommit={onCommit} />)

    const input = screen.getByPlaceholderText('Summary (required)')
    await user.type(input, 'Fix bug')
    const button = screen.getByRole('button', { name: /commit/i })
    await user.click(button)

    await waitFor(() => {
      expect(mockApi.git.commit).toHaveBeenCalledWith('/repo', 'Fix bug', { amend: false })
      expect(onCommit).toHaveBeenCalled()
    })
  })
})
