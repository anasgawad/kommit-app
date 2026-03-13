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
      edges: []
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
    // Column 2 * 20px LANE_WIDTH + 10px offset = 50px
    expect(circle?.getAttribute('cx')).toBe('50')
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
          color: '#4EC9B0'
        }
      ]
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
    expect(line?.getAttribute('stroke')).toBe('#4EC9B0')
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
          color: '#569CD6'
        }
      ]
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
    expect(path?.getAttribute('stroke')).toBe('#569CD6')
  })

  it('should render ref labels for branches', () => {
    const graphRow: GraphRowType = {
      commit: createCommit({ refs: ['main', 'origin/main'] }),
      column: 0,
      edges: []
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
      edges: []
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
      edges: []
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
    const classes = row.className.split(' ')
    // When not selected, should only have hover:bg-kommit-bg-tertiary, not bg-kommit-bg-tertiary
    expect(classes.includes('bg-kommit-bg-tertiary')).toBe(false)

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

    const classesAfter = row.className.split(' ')
    // When selected, should have bg-kommit-bg-tertiary class
    expect(classesAfter.includes('bg-kommit-bg-tertiary')).toBe(true)
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
          color: '#CE9178' // Salmon color
        }
      ]
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
    expect(line?.getAttribute('stroke')).toBe('#CE9178')
  })

  it('should truncate long commit messages', () => {
    const longMessage = 'A'.repeat(200)
    const graphRow: GraphRowType = {
      commit: createCommit({ subject: longMessage }),
      column: 0,
      edges: []
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
