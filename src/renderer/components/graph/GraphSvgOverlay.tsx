// ============================================================
// Kommit — Graph SVG Overlay
// Single SVG element rendering all branch paths as continuous lines
// Inspired by VS Code Git Graph's proven architecture
// ============================================================

import { useMemo } from 'react'
import type { GraphRow } from '@shared/types'

// Shared constants (must match GraphRow component)
export const LANE_WIDTH = 24
export const ROW_HEIGHT = 36
export const NODE_RADIUS = 5
export const MERGE_NODE_RADIUS = 6
export const STROKE_WIDTH = 2

// Overscan in rows — render edges slightly outside the viewport
const OVERSCAN_ROWS = 15

interface GraphSvgOverlayProps {
  graphRows: GraphRow[]
  maxColumn: number
  totalHeight: number
  scrollTop: number
  viewportHeight: number
  selectedCommitHash: string | null
}

/**
 * Convert a column index to an x pixel coordinate (center of lane).
 */
function colToX(column: number): number {
  return column * LANE_WIDTH + LANE_WIDTH / 2
}

/**
 * Convert a row index to a y pixel coordinate (center of row).
 */
function rowToY(rowIndex: number): number {
  return rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
}

/**
 * Build an SVG path string for an edge between two commits.
 *
 * Same-column: straight vertical line.
 * Cross-column: cubic Bezier curve matching VS Code Git Graph style.
 *
 * The curve uses control points offset vertically by 80% of ROW_HEIGHT,
 * creating smooth S-curves that exit the source node vertically and
 * enter the target node vertically — exactly like VS Code Git Graph.
 */
function buildEdgePath(fromCol: number, fromRow: number, toCol: number, toRow: number): string {
  const x1 = colToX(fromCol)
  const y1 = rowToY(fromRow)
  const x2 = colToX(toCol)
  const y2 = rowToY(toRow)

  if (fromCol === toCol) {
    // Straight vertical line
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  // Cross-column: cubic Bezier S-curve (VS Code Git Graph style)
  // d = 80% of row height, matching Git Graph's config.grid.y * 0.8
  const d = ROW_HEIGHT * 0.8

  // Control points:
  // CP1 at (x1, y1 + d) — exits source node going straight down
  // CP2 at (x2, y2 - d) — enters target node going straight down
  // This creates a smooth S-curve that transitions columns in the middle
  return `M ${x1} ${y1} C ${x1} ${y1 + d}, ${x2} ${y2 - d}, ${x2} ${y2}`
}

export function GraphSvgOverlay({
  graphRows,
  maxColumn,
  totalHeight,
  scrollTop,
  viewportHeight,
  selectedCommitHash
}: GraphSvgOverlayProps) {
  // Determine visible row range (with overscan)
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS)
  const lastVisibleRow = Math.min(
    graphRows.length - 1,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS
  )

  // Visible pixel range for edge culling
  const visibleTop = firstVisibleRow * ROW_HEIGHT
  const visibleBottom = (lastVisibleRow + 1) * ROW_HEIGHT

  // Calculate SVG width — dynamic, no hard cap
  const svgWidth = (maxColumn + 1) * LANE_WIDTH + 10

  // Collect all visible edges and nodes
  const { edgePaths, nodes } = useMemo(() => {
    const edges: { d: string; color: string; key: string }[] = []
    const commitNodes: {
      x: number
      y: number
      color: string
      isMerge: boolean
      hash: string
      key: string
    }[] = []

    // Set to track which edges we've already drawn (avoid duplicates)
    const drawnEdges = new Set<string>()

    for (let i = firstVisibleRow; i <= lastVisibleRow; i++) {
      const row = graphRows[i]
      if (!row) continue

      // Collect commit node — use the row's lane color
      commitNodes.push({
        x: colToX(row.column),
        y: rowToY(i),
        color: row.color,
        isMerge: row.commit.parents.length > 1,
        hash: row.commit.hash,
        key: `node-${row.commit.hash}`
      })

      // Collect outgoing edges from this row
      for (let j = 0; j < row.edges.length; j++) {
        const edge = row.edges[j]
        const edgeKey = `edge-${edge.fromRow}-${edge.fromColumn}-${edge.toRow}-${edge.toColumn}`

        if (drawnEdges.has(edgeKey)) continue
        drawnEdges.add(edgeKey)

        // Only draw if some part of the edge is in the visible range
        const edgeTop = rowToY(edge.fromRow)
        const edgeBottom = rowToY(edge.toRow)
        if (edgeBottom < visibleTop || edgeTop > visibleBottom) continue

        edges.push({
          d: buildEdgePath(edge.fromColumn, edge.fromRow, edge.toColumn, edge.toRow),
          color: edge.color,
          key: edgeKey
        })
      }

      // Collect incoming edges that start from above the visible range
      for (let j = 0; j < row.incomingEdges.length; j++) {
        const edge = row.incomingEdges[j]
        const edgeKey = `edge-${edge.fromRow}-${edge.fromColumn}-${edge.toRow}-${edge.toColumn}`

        if (drawnEdges.has(edgeKey)) continue
        drawnEdges.add(edgeKey)

        const edgeTop = rowToY(edge.fromRow)
        const edgeBottom = rowToY(edge.toRow)
        if (edgeBottom < visibleTop || edgeTop > visibleBottom) continue

        edges.push({
          d: buildEdgePath(edge.fromColumn, edge.fromRow, edge.toColumn, edge.toRow),
          color: edge.color,
          key: edgeKey
        })
      }
    }

    // Also check edges from rows ABOVE the visible range that extend INTO it
    for (let i = 0; i < firstVisibleRow; i++) {
      const row = graphRows[i]
      if (!row) continue

      for (const edge of row.edges) {
        const edgeBottom = rowToY(edge.toRow)
        if (edgeBottom < visibleTop) continue

        const edgeKey = `edge-${edge.fromRow}-${edge.fromColumn}-${edge.toRow}-${edge.toColumn}`
        if (drawnEdges.has(edgeKey)) continue
        drawnEdges.add(edgeKey)

        edges.push({
          d: buildEdgePath(edge.fromColumn, edge.fromRow, edge.toColumn, edge.toRow),
          color: edge.color,
          key: edgeKey
        })
      }
    }

    return { edgePaths: edges, nodes: commitNodes }
  }, [graphRows, firstVisibleRow, lastVisibleRow, visibleTop, visibleBottom])

  if (graphRows.length === 0) return null

  return (
    <svg
      className="graph-svg-overlay absolute top-0 left-0 pointer-events-none"
      width={svgWidth}
      height={totalHeight}
      style={{
        width: `${svgWidth}px`,
        height: `${totalHeight}px`
      }}
    >
      {/* Layer 1: Edge paths (connections between commits) */}
      {edgePaths.map((edge) => (
        <path
          key={edge.key}
          d={edge.d}
          stroke={edge.color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {/* Layer 2: Commit nodes (circles on top) */}
      {nodes.map((node) => (
        <g key={node.key}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS}
            fill={node.color}
            className="graph-node"
          />
          {node.isMerge && (
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS - 1.5}
              fill="#1e1e2e"
              className="graph-node-inner"
            />
          )}
          {node.hash === selectedCommitHash && (
            <circle
              cx={node.x}
              cy={node.y}
              r={(node.isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS) + 3}
              fill="none"
              stroke={node.color}
              strokeWidth={1.5}
              opacity={0.6}
            />
          )}
        </g>
      ))}
    </svg>
  )
}
