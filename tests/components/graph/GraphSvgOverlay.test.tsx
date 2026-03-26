// ============================================================
// Kommit — GraphSvgOverlay Component Tests
// Tests for the single SVG overlay that renders all branch paths
// ============================================================

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  GraphSvgOverlay,
  LANE_WIDTH,
  ROW_HEIGHT,
  NODE_RADIUS,
  MERGE_NODE_RADIUS
} from '../../../src/renderer/components/graph/GraphSvgOverlay'
import type { Commit, GraphRow, GraphEdge } from '../../../src/shared/types'

// Helper to create a test commit
function createCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    hash: 'abc123def456',
    abbreviatedHash: 'abc123d',
    parents: [],
    author: 'Test Author',
    authorEmail: 'test@example.com',
    authorDate: new Date('2024-01-01T12:00:00Z'),
    subject: 'Test commit',
    refs: [],
    ...overrides
  }
}

// Helper to create a graph row
function createGraphRow(overrides: Partial<GraphRow> = {}): GraphRow {
  return {
    commit: createCommit(),
    column: 0,
    color: '#3498DB',
    edges: [],
    passThroughEdges: [],
    incomingEdges: [],
    ...overrides
  }
}

// Default props for convenience
function defaultProps(overrides: Partial<Parameters<typeof GraphSvgOverlay>[0]> = {}) {
  return {
    graphRows: [],
    maxColumn: 2,
    totalHeight: 1000,
    scrollTop: 0,
    viewportHeight: 500,
    selectedCommitHash: null,
    ...overrides
  }
}

describe('GraphSvgOverlay', () => {
  describe('rendering', () => {
    it('should return null when graphRows is empty', () => {
      const { container } = render(<GraphSvgOverlay {...defaultProps()} />)
      expect(container.querySelector('svg')).toBeNull()
    })

    it('should render an SVG element when graphRows has data', () => {
      const rows = [createGraphRow()]
      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg).toHaveClass('graph-svg-overlay')
    })

    it('should set SVG height to totalHeight', () => {
      const rows = [createGraphRow()]
      const { container } = render(
        <GraphSvgOverlay {...defaultProps({ graphRows: rows, totalHeight: 2000 })} />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('height', '2000')
    })

    it('should set SVG width based on maxColumn without hard cap', () => {
      const rows = [createGraphRow()]
      const { container } = render(
        <GraphSvgOverlay {...defaultProps({ graphRows: rows, maxColumn: 3 })} />
      )

      const svg = container.querySelector('svg')
      // Width = (maxColumn + 1) * LANE_WIDTH + 10
      const expectedWidth = (3 + 1) * LANE_WIDTH + 10
      expect(svg).toHaveAttribute('width', String(expectedWidth))
    })

    it('should allow SVG width beyond 260px for wide graphs', () => {
      const rows = [createGraphRow()]
      const { container } = render(
        <GraphSvgOverlay {...defaultProps({ graphRows: rows, maxColumn: 15 })} />
      )

      const svg = container.querySelector('svg')
      const expectedWidth = (15 + 1) * LANE_WIDTH + 10
      expect(svg).toHaveAttribute('width', String(expectedWidth))
      // No longer capped at 260
      expect(Number(svg?.getAttribute('width'))).toBeGreaterThan(260)
    })
  })

  describe('commit nodes', () => {
    it('should render a circle for each visible commit', () => {
      const rows = [
        createGraphRow({ commit: createCommit({ hash: 'aaa' }), column: 0 }),
        createGraphRow({ commit: createCommit({ hash: 'bbb' }), column: 1 })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const nodes = container.querySelectorAll('circle.graph-node')
      expect(nodes.length).toBe(2)
    })

    it('should position commit node at correct coordinates', () => {
      const rows = [createGraphRow({ column: 2 })]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const node = container.querySelector('circle.graph-node')
      expect(node).not.toBeNull()

      // x = column * LANE_WIDTH + LANE_WIDTH / 2
      const expectedX = 2 * LANE_WIDTH + LANE_WIDTH / 2
      // y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
      const expectedY = 0 * ROW_HEIGHT + ROW_HEIGHT / 2

      expect(node).toHaveAttribute('cx', String(expectedX))
      expect(node).toHaveAttribute('cy', String(expectedY))
    })

    it('should render regular commit with NODE_RADIUS', () => {
      const rows = [createGraphRow({ commit: createCommit({ parents: [] }) })]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const node = container.querySelector('circle.graph-node')
      expect(node).toHaveAttribute('r', String(NODE_RADIUS))
    })

    it('should render merge commit with MERGE_NODE_RADIUS and inner circle', () => {
      const rows = [
        createGraphRow({
          commit: createCommit({ parents: ['parent1', 'parent2'] })
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const outerNode = container.querySelector('circle.graph-node')
      expect(outerNode).toHaveAttribute('r', String(MERGE_NODE_RADIUS))

      const innerNode = container.querySelector('circle.graph-node-inner')
      expect(innerNode).not.toBeNull()
      expect(innerNode).toHaveAttribute('r', String(NODE_RADIUS - 1.5))
    })

    it('should use row color for commit node fill', () => {
      const rows = [createGraphRow({ color: '#E74C3C' })]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const node = container.querySelector('circle.graph-node')
      expect(node).toHaveAttribute('fill', '#E74C3C')
    })
  })

  describe('selected commit highlight', () => {
    it('should render highlight ring when commit is selected', () => {
      const hash = 'selected123'
      const rows = [createGraphRow({ commit: createCommit({ hash }), column: 0 })]

      const { container } = render(
        <GraphSvgOverlay {...defaultProps({ graphRows: rows, selectedCommitHash: hash })} />
      )

      // The highlight ring is a circle with stroke and no fill
      const circles = container.querySelectorAll('circle')
      const highlightCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === 'none' && c.getAttribute('stroke-width') === '1.5'
      )
      expect(highlightCircle).not.toBeNull()

      // Radius should be NODE_RADIUS + 3 (non-merge commit)
      expect(highlightCircle).toHaveAttribute('r', String(NODE_RADIUS + 3))
    })

    it('should not render highlight ring when no commit is selected', () => {
      const rows = [createGraphRow({ commit: createCommit({ hash: 'abc' }) })]

      const { container } = render(
        <GraphSvgOverlay {...defaultProps({ graphRows: rows, selectedCommitHash: null })} />
      )

      const circles = container.querySelectorAll('circle')
      const highlightCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === 'none' && c.getAttribute('stroke-width') === '1.5'
      )
      expect(highlightCircle).toBeUndefined()
    })
  })

  describe('edge paths', () => {
    it('should render straight vertical path for same-column edge', () => {
      const edge: GraphEdge = {
        fromColumn: 0,
        toColumn: 0,
        fromRow: 0,
        toRow: 1,
        color: '#ff0000'
      }
      const rows = [
        createGraphRow({
          commit: createCommit({ hash: 'aaa' }),
          column: 0,
          edges: [edge]
        }),
        createGraphRow({
          commit: createCommit({ hash: 'bbb' }),
          column: 0,
          incomingEdges: [edge]
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const paths = container.querySelectorAll('path')
      const edgePaths = Array.from(paths).filter((p) => {
        const d = p.getAttribute('d') || ''
        // Same-column edges use M...L (straight line), not M...C (curve)
        return d.includes('L') && !d.includes('C')
      })

      expect(edgePaths.length).toBeGreaterThanOrEqual(1)

      // Verify the edge has the correct color
      const redEdge = Array.from(paths).find((p) => p.getAttribute('stroke') === '#ff0000')
      expect(redEdge).not.toBeNull()
    })

    it('should render curved path for cross-column edge', () => {
      const edge: GraphEdge = {
        fromColumn: 0,
        toColumn: 2,
        fromRow: 0,
        toRow: 1,
        color: '#00ff00'
      }
      const rows = [
        createGraphRow({
          commit: createCommit({ hash: 'aaa' }),
          column: 0,
          edges: [edge]
        }),
        createGraphRow({
          commit: createCommit({ hash: 'bbb' }),
          column: 2,
          incomingEdges: [edge]
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const paths = container.querySelectorAll('path')
      // Cross-column edges use cubic Bezier: M...C
      const curvedPaths = Array.from(paths).filter((p) => {
        const d = p.getAttribute('d') || ''
        return d.includes('C')
      })

      expect(curvedPaths.length).toBeGreaterThanOrEqual(1)

      const greenEdge = Array.from(paths).find((p) => p.getAttribute('stroke') === '#00ff00')
      expect(greenEdge).not.toBeNull()
    })

    it('should not duplicate edges', () => {
      const edge: GraphEdge = {
        fromColumn: 0,
        toColumn: 0,
        fromRow: 0,
        toRow: 1,
        color: '#0000ff'
      }
      // Both rows reference the same edge object
      const rows = [
        createGraphRow({
          commit: createCommit({ hash: 'aaa' }),
          column: 0,
          edges: [edge]
        }),
        createGraphRow({
          commit: createCommit({ hash: 'bbb' }),
          column: 0,
          edges: [edge],
          incomingEdges: [edge]
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const paths = container.querySelectorAll('path')
      const blueEdges = Array.from(paths).filter((p) => p.getAttribute('stroke') === '#0000ff')

      // Should only render the edge once despite being referenced from two rows
      expect(blueEdges.length).toBe(1)
    })
  })

  describe('no pass-through rendering', () => {
    it('should not render separate pass-through path elements', () => {
      // The overlay no longer renders pass-through edges as separate paths.
      // Full edge paths handle all rendering.
      const rows = [
        createGraphRow({
          commit: createCommit({ hash: 'aaa' }),
          column: 0,
          passThroughEdges: [{ column: 1, color: '#ffaa00' }]
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const paths = container.querySelectorAll('path')
      // There should be no path with the pass-through color (no pass-through rendering)
      const passThroughPath = Array.from(paths).find((p) => p.getAttribute('stroke') === '#ffaa00')
      expect(passThroughPath).toBeUndefined()
    })
  })

  describe('viewport culling', () => {
    it('should not render nodes outside the viewport', () => {
      // Create 100 rows, viewport only shows rows 0-13 (500px / 36px ~ 14)
      const rows = Array.from({ length: 100 }, (_, i) =>
        createGraphRow({
          commit: createCommit({ hash: `hash${i}` }),
          column: 0
        })
      )

      const { container } = render(
        <GraphSvgOverlay
          {...defaultProps({
            graphRows: rows,
            totalHeight: 100 * ROW_HEIGHT,
            scrollTop: 0,
            viewportHeight: 500
          })}
        />
      )

      const nodes = container.querySelectorAll('circle.graph-node')
      // With 15-row overscan, visible range is rows 0 to ~28
      // Should be much less than 100 nodes
      expect(nodes.length).toBeLessThan(50)
      expect(nodes.length).toBeGreaterThan(0)
    })

    it('should render nodes in the viewport when scrolled down', () => {
      const rows = Array.from({ length: 100 }, (_, i) =>
        createGraphRow({
          commit: createCommit({ hash: `hash${i}` }),
          column: 0
        })
      )

      // Scroll to the middle
      const scrollTop = 50 * ROW_HEIGHT

      const { container } = render(
        <GraphSvgOverlay
          {...defaultProps({
            graphRows: rows,
            totalHeight: 100 * ROW_HEIGHT,
            scrollTop,
            viewportHeight: 500
          })}
        />
      )

      const nodes = container.querySelectorAll('circle.graph-node')
      // Should have some nodes rendered, but far less than 100
      expect(nodes.length).toBeGreaterThan(0)
      expect(nodes.length).toBeLessThan(60)
    })
  })

  describe('rendering layers', () => {
    it('should render edges before nodes (correct z-order)', () => {
      const edge: GraphEdge = {
        fromColumn: 0,
        toColumn: 0,
        fromRow: 0,
        toRow: 1,
        color: '#ff0000'
      }

      const rows = [
        createGraphRow({
          commit: createCommit({ hash: 'aaa', parents: ['bbb'] }),
          column: 0,
          edges: [edge]
        }),
        createGraphRow({
          commit: createCommit({ hash: 'bbb' }),
          column: 0,
          incomingEdges: [edge]
        })
      ]

      const { container } = render(<GraphSvgOverlay {...defaultProps({ graphRows: rows })} />)

      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()

      // SVG children should be: edge paths, then <g> (node groups)
      // Verify that <g> elements (node groups) come after <path> elements
      const children = Array.from(svg!.children)
      const lastPathIndex = children.reduce(
        (maxIdx, child, idx) => (child.tagName === 'path' ? idx : maxIdx),
        -1
      )
      const firstGIndex = children.findIndex((child) => child.tagName === 'g')

      if (firstGIndex !== -1 && lastPathIndex !== -1) {
        expect(firstGIndex).toBeGreaterThan(lastPathIndex)
      }
    })
  })

  describe('constants', () => {
    it('should export expected constant values', () => {
      expect(LANE_WIDTH).toBe(24)
      expect(ROW_HEIGHT).toBe(36)
      expect(NODE_RADIUS).toBe(5)
      expect(MERGE_NODE_RADIUS).toBe(6)
    })
  })
})
