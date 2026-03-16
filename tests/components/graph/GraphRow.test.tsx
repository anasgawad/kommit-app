// ============================================================
// Kommit — GraphRow Component Tests
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

describe('GraphRow', () => {
  it('should render commit node at correct x position', () => {
    const graphRow: GraphRowType = {
      commit: createCommit(),
      column: 2,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={5}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()

    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    // Column 2 * 24px LANE_WIDTH + 12px offset = 60px
    expect(circle?.getAttribute('cx')).toBe('60')
  })

  it('should render straight line for linear parent', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ hash: 'aaa', parents: ['bbb'] }),
      column: 0,
      edges: [
        {
          fromColumn: 0,
          toColumn: 0,
          fromRow: 0,
          toRow: 1,
          color: '#3498DB'
        }
      ],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const line = container.querySelector('line')
    expect(line).toBeInTheDocument()
    expect(line?.getAttribute('stroke')).toBe('#3498DB')
  })

  it('should render curved line for merge', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ hash: 'merge', parents: ['aaa', 'bbb'] }),
      column: 0,
      edges: [
        {
          fromColumn: 0,
          toColumn: 1, // Different column = merge
          fromRow: 0,
          toRow: 1,
          color: '#9B59B6'
        }
      ],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={3}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const path = container.querySelector('path')
    expect(path).toBeInTheDocument()
    expect(path?.getAttribute('stroke')).toBe('#9B59B6')
  })

  it('should render ref labels for branches', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ refs: ['main', 'origin/main'] }),
      column: 0,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('origin/main')).toBeInTheDocument()
  })

  it('should render ref label for tags', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ refs: ['tag: v1.0.0'] }),
      column: 0,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('should highlight selected commit', () => {
    const graphRow: GraphRowType = {
      commit: createCommit(),
      column: 0,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container, rerender } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const row = container.firstChild as HTMLElement
    // When not selected, should not have the accent background class
    expect(row.className).not.toContain('bg-kommit-accent')

    rerender(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={true}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    // When selected, should have bg-kommit-accent/10 and border-l-kommit-accent classes
    expect(row.className).toContain('bg-kommit-accent')
    expect(row.className).toContain('border-l-kommit-accent')
  })

  it('should apply correct color per branch', () => {
    const graphRow: GraphRowType = {
      commit: createCommit(),
      column: 0,
      edges: [
        {
          fromColumn: 0,
          toColumn: 0,
          fromRow: 0,
          toRow: 1,
          color: '#E74C3C' // Red color from new palette
        }
      ],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const line = container.querySelector('line')
    expect(line?.getAttribute('stroke')).toBe('#E74C3C')
  })

  it('should truncate long commit messages', () => {
    const longMessage = 'A'.repeat(200)
    const graphRow: GraphRowType = {
      commit: createCommit({ subject: longMessage }),
      column: 0,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    }

    const { container } = render(
      <GraphRow
        graphRow={graphRow}
        rowIndex={0}
        isSelected={false}
        maxColumns={2}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const messageSpan = container.querySelector('.truncate')
    expect(messageSpan).toBeInTheDocument()
    expect(messageSpan?.textContent).toBe(longMessage)
  })
})
