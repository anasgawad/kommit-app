// ============================================================
// Kommit — GraphRow Component Tests
// Tests for the text-only commit row (SVG is in GraphSvgOverlay)
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraphRow } from '../../../src/renderer/components/graph/GraphRow'
import type { GraphRow as GraphRowType, Commit } from '../../../src/shared/types'

// Helper to create test commit
function createCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    hash: 'abc123',
    abbreviatedHash: 'abc123a',
    parents: [],
    author: 'Test Author',
    authorEmail: 'test@example.com',
    authorDate: new Date('2024-01-01T12:00:00Z'),
    subject: 'Test commit message',
    refs: [],
    ...overrides
  }
}

function renderGraphRow(overrides: Partial<Parameters<typeof GraphRow>[0]> = {}) {
  const graphRow: GraphRowType = {
    commit: createCommit(),
    column: 0,
    color: '#3498DB',
    edges: [],
    passThroughEdges: [],
    incomingEdges: []
  }

  return render(
    <GraphRow
      graphRow={overrides.graphRow ?? graphRow}
      rowIndex={overrides.rowIndex ?? 0}
      isSelected={overrides.isSelected ?? false}
      graphColumnWidth={overrides.graphColumnWidth ?? 130}
      onSelect={overrides.onSelect ?? vi.fn()}
      onContextMenu={overrides.onContextMenu ?? vi.fn()}
    />
  )
}

describe('GraphRow', () => {
  it('should render commit message', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ subject: 'Fix the build' }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow })

    expect(screen.getByText('Fix the build')).toBeInTheDocument()
  })

  it('should render graph column spacer with correct width', () => {
    const { container } = renderGraphRow({ graphColumnWidth: 200 })

    // First child of the row div should be the spacer div
    const row = container.firstChild as HTMLElement
    const spacer = row.children[0] as HTMLElement
    expect(spacer.style.width).toBe('200px')
  })

  it('should render ref labels for branches', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ refs: ['main', 'origin/main'] }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow })

    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('origin/main')).toBeInTheDocument()
  })

  it('should render ref label for tags', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ refs: ['tag: v1.0.0'] }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow })

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('should highlight selected commit', () => {
    const { container, rerender } = renderGraphRow({ isSelected: false })

    const row = container.firstChild as HTMLElement
    expect(row.className).not.toContain('bg-kommit-accent')

    const graphRow: GraphRowType = {
      commit: createCommit(),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    rerender(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={true}
        graphColumnWidth={130}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    expect(row.className).toContain('bg-kommit-accent')
    expect(row.className).toContain('border-l-kommit-accent')
  })

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const graphRow: GraphRowType = {
      commit: createCommit({ hash: 'deadbeef' }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow, onSelect })

    await user.click(screen.getByText('Test commit message'))
    expect(onSelect).toHaveBeenCalledWith('deadbeef')
  })

  it('should render author name', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ author: 'Jane Doe' }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow })

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('should truncate long commit messages', () => {
    const longMessage = 'A'.repeat(200)
    const graphRow: GraphRowType = {
      commit: createCommit({ subject: longMessage }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = renderGraphRow({ graphRow })

    const messageSpan = container.querySelector('.truncate')
    expect(messageSpan).toBeInTheDocument()
    expect(messageSpan?.textContent).toBe(longMessage)
  })

  it('should render abbreviated hash', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ abbreviatedHash: 'abc1234' }),
      column: 0,
      color: '#3498DB',
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    renderGraphRow({ graphRow })

    expect(screen.getByText('abc1234')).toBeInTheDocument()
  })

  it('should not render SVG elements (graph is in overlay)', () => {
    const { container } = renderGraphRow()

    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('path')).toBeNull()
  })
})
