// ============================================================
// Kommit — CommitDetail Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitDetail } from '../../../src/renderer/components/commits/CommitDetail'
import { useGraphStore } from '../../../src/renderer/stores/graph-store'
import type { Commit, CommitDetail as CommitDetailType } from '../../../src/shared/types'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
})

// Helper to create test commit
function createCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    hash: 'abc123def456',
    abbreviatedHash: 'abc123d',
    parents: [],
    author: 'John Doe',
    authorEmail: 'john@example.com',
    authorDate: new Date('2024-01-15T10:30:00Z'),
    subject: 'Fix critical bug',
    body: 'This fixes the issue with...',
    refs: [],
    ...overrides
  }
}

describe('CommitDetail', () => {
  beforeEach(() => {
    useGraphStore.getState().reset()
  })

  it('should display commit hash (abbreviated + full)', () => {
    const commit = createCommit()
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    expect(screen.getByText('abc123d')).toBeInTheDocument()
    expect(screen.getByText('abc123def456')).toBeInTheDocument()
  })

  it('should display author name and email', () => {
    const commit = createCommit()
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should display formatted date', () => {
    const commit = createCommit()
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    // Date should be formatted (PPpp format from date-fns)
    // Exact format depends on locale, but should contain date elements
    expect(screen.getByText(/Jan|January/i)).toBeInTheDocument()
  })

  it('should display full commit message', () => {
    const commit = createCommit({
      subject: 'Fix critical bug',
      body: 'This fixes the issue with memory leaks'
    })
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    expect(screen.getByText('Fix critical bug')).toBeInTheDocument()
    expect(screen.getByText('This fixes the issue with memory leaks')).toBeInTheDocument()
  })

  it('should list parent commit hashes as links', () => {
    const commit = createCommit({
      parents: ['parent1abc123', 'parent2def456']
    })
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    expect(screen.getByText('Parents (2)')).toBeInTheDocument()
    // Parent hashes are now abbreviated (first 7 chars)
    expect(screen.getByText('parent1')).toBeInTheDocument()
    expect(screen.getByText('parent2')).toBeInTheDocument()
  })

  it('should list changed files with correct status icons', () => {
    const commit = createCommit()
    const detail: CommitDetailType = {
      commit,
      changedFiles: [
        { path: 'added.txt', status: 'added' },
        { path: 'modified.txt', status: 'modified' },
        { path: 'deleted.txt', status: 'deleted' },
        { path: 'renamed.txt', status: 'renamed' }
      ]
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    // Section label is now separate from count (badge)
    expect(screen.getByText('Changed Files')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('added.txt')).toBeInTheDocument()
    expect(screen.getByText('modified.txt')).toBeInTheDocument()
    expect(screen.getByText('deleted.txt')).toBeInTheDocument()
    expect(screen.getByText('renamed.txt')).toBeInTheDocument()

    // Status icons are now SVGs, not text characters
    // We verify the files are rendered with their status via title attribute
    expect(screen.getByTitle('Added: added.txt')).toBeInTheDocument()
    expect(screen.getByTitle('Modified: modified.txt')).toBeInTheDocument()
    expect(screen.getByTitle('Deleted: deleted.txt')).toBeInTheDocument()
    expect(screen.getByTitle('Renamed: renamed.txt')).toBeInTheDocument()
  })

  it('should handle merge commits (multiple parents)', () => {
    const commit = createCommit({
      parents: ['parent1abc123', 'parent2def456', 'parent3ghi789']
    })
    const detail: CommitDetailType = {
      commit,
      changedFiles: []
    }

    useGraphStore.setState({ selectedCommitDetail: detail })

    render(<CommitDetail />)

    expect(screen.getByText('Parents (3)')).toBeInTheDocument()
    // Parent hashes are now abbreviated (first 7 chars)
    expect(screen.getByText('parent1')).toBeInTheDocument()
    expect(screen.getByText('parent2')).toBeInTheDocument()
    expect(screen.getByText('parent3')).toBeInTheDocument()
  })
})
