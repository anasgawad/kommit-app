// ============================================================
// Kommit — WelcomeScreen Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from '../../../src/renderer/components/repo/WelcomeScreen'

// Mock the window.api
const mockApi = {
  git: {
    status: vi.fn(),
    isRepo: vi.fn(),
    log: vi.fn(),
    branches: vi.fn()
  },
  repo: {
    init: vi.fn(),
    clone: vi.fn(),
    getRecent: vi.fn().mockResolvedValue([]),
    addRecent: vi.fn(),
    removeRecent: vi.fn()
  },
  dialog: {
    openDirectory: vi.fn()
  }
}

// Mock zustand store
vi.mock('../../../src/renderer/stores/repo-store', () => ({
  useRepoStore: vi.fn(() => ({
    recentRepos: [],
    openRepo: vi.fn(),
    isLoading: false,
    error: null
  }))
}))

import { useRepoStore } from '../../../src/renderer/stores/repo-store'

const mockUseRepoStore = vi.mocked(useRepoStore)

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as unknown as { api: typeof mockApi }).api = mockApi

    mockUseRepoStore.mockReturnValue({
      recentRepos: [],
      openRepo: vi.fn(),
      isLoading: false,
      error: null,
      activeRepo: null,
      status: null,
      setActiveRepo: vi.fn(),
      setRecentRepos: vi.fn(),
      setStatus: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      refreshStatus: vi.fn(),
      loadRecentRepos: vi.fn()
    })
  })

  it('should display Kommit heading', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('heading', { name: 'Kommit' })).toBeInTheDocument()
  })

  it('should show "Open Repository" button', () => {
    render(<WelcomeScreen />)
    expect(screen.getByText('Open Repository')).toBeInTheDocument()
  })

  it('should show "Clone Repository" button', () => {
    render(<WelcomeScreen />)
    expect(screen.getByText('Clone Repository')).toBeInTheDocument()
  })

  it('should show "Init Repository" button', () => {
    render(<WelcomeScreen />)
    expect(screen.getByText('Init Repository')).toBeInTheDocument()
  })

  it('should call openRepo when selecting a recent repository', () => {
    const mockOpenRepo = vi.fn()
    mockUseRepoStore.mockReturnValue({
      recentRepos: [{ path: '/home/user/project', name: 'project', lastOpened: Date.now() }],
      openRepo: mockOpenRepo,
      isLoading: false,
      error: null,
      activeRepo: null,
      status: null,
      setActiveRepo: vi.fn(),
      setRecentRepos: vi.fn(),
      setStatus: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      refreshStatus: vi.fn(),
      loadRecentRepos: vi.fn()
    })

    render(<WelcomeScreen />)

    const repoButton = screen.getByText('project')
    fireEvent.click(repoButton)

    expect(mockOpenRepo).toHaveBeenCalledWith('/home/user/project')
  })

  it('should display list of recent repositories', () => {
    mockUseRepoStore.mockReturnValue({
      recentRepos: [
        { path: '/repo1', name: 'repo1', lastOpened: Date.now() },
        { path: '/repo2', name: 'repo2', lastOpened: Date.now() - 1000 }
      ],
      openRepo: vi.fn(),
      isLoading: false,
      error: null,
      activeRepo: null,
      status: null,
      setActiveRepo: vi.fn(),
      setRecentRepos: vi.fn(),
      setStatus: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      refreshStatus: vi.fn(),
      loadRecentRepos: vi.fn()
    })

    render(<WelcomeScreen />)

    expect(screen.getByText('repo1')).toBeInTheDocument()
    expect(screen.getByText('repo2')).toBeInTheDocument()
    expect(screen.getByText('Recent Repositories')).toBeInTheDocument()
  })

  it('should show clone form when Clone button is clicked', () => {
    render(<WelcomeScreen />)

    fireEvent.click(screen.getByText('Clone Repository'))

    expect(screen.getByPlaceholderText(/Repository URL/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Target directory/i)).toBeInTheDocument()
  })

  it('should validate clone form requires URL and target', () => {
    render(<WelcomeScreen />)

    fireEvent.click(screen.getByText('Clone Repository'))

    const cloneButton = screen.getByText('Clone')
    expect(cloneButton).toBeDisabled()
  })

  it('should show error message when error exists', () => {
    mockUseRepoStore.mockReturnValue({
      recentRepos: [],
      openRepo: vi.fn(),
      isLoading: false,
      error: 'Not a git repository: /some/path',
      activeRepo: null,
      status: null,
      setActiveRepo: vi.fn(),
      setRecentRepos: vi.fn(),
      setStatus: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      refreshStatus: vi.fn(),
      loadRecentRepos: vi.fn()
    })

    render(<WelcomeScreen />)
    expect(screen.getByText(/Not a git repository/)).toBeInTheDocument()
  })

  it('should disable buttons when loading', () => {
    mockUseRepoStore.mockReturnValue({
      recentRepos: [],
      openRepo: vi.fn(),
      isLoading: true,
      error: null,
      activeRepo: null,
      status: null,
      setActiveRepo: vi.fn(),
      setRecentRepos: vi.fn(),
      setStatus: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      refreshStatus: vi.fn(),
      loadRecentRepos: vi.fn()
    })

    render(<WelcomeScreen />)

    const openButton = screen.getByText('Open Repository').closest('button')
    expect(openButton).toBeDisabled()
  })
})
