// ============================================================
// Kommit — Graph Row Component
// Renders a single commit row with SVG graph visualization
// ============================================================

import type { GraphRow } from '@shared/types'
import { formatDistanceToNow } from 'date-fns'

const LANE_WIDTH = 20
const ROW_HEIGHT = 32
const NODE_RADIUS = 4

interface GraphRowProps {
  graphRow: GraphRow
  rowIndex: number
  isSelected: boolean
  maxColumns: number
  onSelect: (hash: string) => void
  onContextMenu: (hash: string, event: React.MouseEvent) => void
}

export function GraphRow({
  graphRow,
  rowIndex,
  isSelected,
  maxColumns,
  onSelect,
  onContextMenu
}: GraphRowProps) {
  const { commit, column, edges, passThroughEdges, incomingEdges } = graphRow
  // Cap the SVG width to prevent it from taking too much space
  const effectiveMaxColumns = Math.min(maxColumns, 10)
  const svgWidth = (effectiveMaxColumns + 1) * LANE_WIDTH + 10

  // Debug logging for first few rows
  if (rowIndex < 5) {
    console.log(`[GraphRow ${rowIndex}]`, {
      hash: commit.hash.substring(0, 8),
      column,
      edgeCount: edges.length,
      passThroughCount: passThroughEdges.length,
      incomingCount: incomingEdges.length,
      passThrough: passThroughEdges.map((p) => ({ col: p.column, color: p.color })),
      incoming: incomingEdges.map((e) => ({
        from: `col${e.fromColumn}row${e.fromRow}`,
        to: `col${e.toColumn}row${e.toRow}`,
        color: e.color
      })),
      outgoing: edges.map((e) => ({
        from: `col${e.fromColumn}row${e.fromRow}`,
        to: `col${e.toColumn}row${e.toRow}`,
        color: e.color
      }))
    })
  }

  const handleClick = () => {
    onSelect(commit.hash)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu(commit.hash, e)
  }

  return (
    <div
      className={`flex items-center border-b border-kommit-border hover:bg-kommit-bg-tertiary cursor-pointer ${
        isSelected ? 'bg-kommit-bg-tertiary' : ''
      }`}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* SVG graph section */}
      <svg
        width={svgWidth}
        height={ROW_HEIGHT}
        className="flex-shrink-0"
        style={{ width: `${Math.min(svgWidth, 240)}px` }}
      >
        {/* DEBUG: Always draw a test line in column 0 for first 5 rows */}
        {rowIndex < 5 && (
          <line x1={10} y1={0} x2={10} y2={ROW_HEIGHT} stroke="red" strokeWidth="3" opacity="0.5" />
        )}

        {/* 1. Draw pass-through edges (full height vertical lines) */}
        {passThroughEdges.map((passThrough, i) => {
          const x = passThrough.column * LANE_WIDTH + LANE_WIDTH / 2
          return (
            <line
              key={`pass-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={ROW_HEIGHT}
              stroke={passThrough.color}
              strokeWidth="2"
            />
          )
        })}

        {/* 2. Draw incoming edges (from top of row to commit node) */}
        {incomingEdges.map((edge, i) => {
          const x2 = column * LANE_WIDTH + LANE_WIDTH / 2
          const y2 = ROW_HEIGHT / 2
          const x1 = edge.fromColumn * LANE_WIDTH + LANE_WIDTH / 2

          if (edge.fromColumn === edge.toColumn) {
            // Straight line from top to node (same column)
            return (
              <line
                key={`in-${i}`}
                x1={x2}
                y1={0}
                x2={x2}
                y2={y2}
                stroke={edge.color}
                strokeWidth="2"
              />
            )
          } else {
            // Cross-column edge: always draw straight line from top of destination column to node
            // The curve was drawn in the outgoing edge of the child row
            return (
              <line
                key={`in-${i}`}
                x1={x2}
                y1={0}
                x2={x2}
                y2={y2}
                stroke={edge.color}
                strokeWidth="2"
              />
            )
          }
        })}

        {/* 3. Draw outgoing edges (from commit node to bottom of row or towards parent column) */}
        {edges.map((edge, i) => {
          const x1 = column * LANE_WIDTH + LANE_WIDTH / 2
          const y1 = ROW_HEIGHT / 2
          const x2 = edge.toColumn * LANE_WIDTH + LANE_WIDTH / 2

          if (edge.fromColumn === edge.toColumn) {
            // Straight line from node to bottom (same column)
            return (
              <line
                key={`out-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={ROW_HEIGHT}
                stroke={edge.color}
                strokeWidth="2"
              />
            )
          } else {
            // Cross-column edge: draw curve from node toward destination column
            // The curve should reach the destination column by the bottom of this row
            // Use a bezier curve that smoothly transitions horizontally
            const controlY1 = y1 + (ROW_HEIGHT - y1) * 0.5
            const controlY2 = ROW_HEIGHT

            return (
              <path
                key={`out-${i}`}
                d={`M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${ROW_HEIGHT}`}
                stroke={edge.color}
                strokeWidth="2"
                fill="none"
              />
            )
          }
        })}

        {/* 4. Draw commit node (circle) on top of all lines */}
        <circle
          cx={column * LANE_WIDTH + LANE_WIDTH / 2}
          cy={ROW_HEIGHT / 2}
          r={NODE_RADIUS}
          fill={
            edges.length > 0
              ? edges[0].color
              : incomingEdges.length > 0
                ? incomingEdges[0].color
                : '#569CD6'
          }
          stroke="#1e1e2e"
          strokeWidth="1.5"
        />
      </svg>

      {/* Commit info section */}
      <div className="flex-1 flex items-center gap-3 px-3 overflow-hidden min-w-0">
        {/* Commit message and refs */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
          <span
            className={`text-sm font-mono truncate ${
              isSelected ? 'text-kommit-text font-medium' : 'text-kommit-text'
            }`}
          >
            {commit.subject}
          </span>

          {/* Ref badges (branches, tags) */}
          {commit.refs.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {commit.refs.map((ref, i) => {
                const trimmed = ref.trim()
                if (!trimmed || trimmed === 'HEAD') return null

                const isTag = trimmed.startsWith('tag:')
                const isBranch = !isTag && !trimmed.startsWith('HEAD ->')
                const isHead = trimmed.startsWith('HEAD ->')

                if (!isBranch && !isTag && !isHead) return null

                const label = isTag
                  ? trimmed.replace('tag: ', '')
                  : isHead
                    ? trimmed.replace('HEAD -> ', '')
                    : trimmed

                return (
                  <span
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      isTag
                        ? 'bg-kommit-warning/20 text-kommit-warning'
                        : isHead
                          ? 'bg-kommit-accent/20 text-kommit-accent font-bold'
                          : 'bg-kommit-success/20 text-kommit-success'
                    }`}
                    title={ref}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Abbreviated hash */}
        <span className="text-xs font-mono text-kommit-text-secondary flex-shrink-0">
          {commit.abbreviatedHash}
        </span>

        {/* Author */}
        <span className="text-xs text-kommit-text-secondary flex-shrink-0 max-w-32 truncate">
          {commit.author}
        </span>

        {/* Relative time */}
        <span className="text-xs text-kommit-text-secondary flex-shrink-0 w-20 text-right">
          {formatDistanceToNow(commit.authorDate, { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
