// ============================================================
// Kommit — Graph Row Component
// Renders a single commit row with SVG graph visualization
// GitKraken-inspired professional styling
// ============================================================

import type { GraphRow as GraphRowType } from '@shared/types'
import { formatDistanceToNow } from 'date-fns'
import { getInitials, getAvatarColor } from '../../utils/avatar'

// Enhanced sizing for better visual clarity (GitKraken-inspired)
export const LANE_WIDTH = 24
export const ROW_HEIGHT = 36
export const NODE_RADIUS = 5
export const MERGE_NODE_RADIUS = 6
export const STROKE_WIDTH = 2.5

interface GraphRowProps {
  graphRow: GraphRowType
  rowIndex: number
  isSelected: boolean
  maxColumns: number
  onSelect: (hash: string) => void
  onContextMenu: (hash: string, event: React.MouseEvent) => void
}

/**
 * Small inline SVG icons for ref badges
 */
const BranchIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0">
    <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z" />
  </svg>
)

const TagIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0">
    <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25v5.025zM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
)

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

  // Detect merge commit (has more than 1 parent)
  const isMerge = commit.parents.length > 1

  // Get the node color from edges
  const nodeColor =
    edges.length > 0
      ? edges[0].color
      : incomingEdges.length > 0
        ? incomingEdges[0].color
        : '#3498DB' // default bright blue

  const handleClick = () => {
    onSelect(commit.hash)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu(commit.hash, e)
  }

  // Render curved path for cross-column edges (smoother S-curve)
  const renderCurvedEdge = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    key: string
  ) => {
    // Create a smooth S-curve using cubic Bezier
    // Control points create a natural flow from node to destination
    const midY = y1 + (y2 - y1) * 0.6
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`

    return (
      <path
        key={key}
        d={d}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )
  }

  return (
    <div
      className={`
        graph-row flex items-center cursor-pointer transition-colors duration-150
        border-l-3 border-transparent
        ${isSelected ? 'bg-kommit-accent/10 border-l-kommit-accent' : 'hover:bg-kommit-bg-tertiary/50'}
      `}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* SVG graph section */}
      <svg
        width={svgWidth}
        height={ROW_HEIGHT}
        className="flex-shrink-0"
        style={{ width: `${Math.min(svgWidth, 260)}px` }}
      >
        {/* 1. Draw pass-through edges (full height vertical lines) with slight opacity for depth */}
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
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              opacity={0.7}
            />
          )
        })}

        {/* 2. Draw incoming edges (from top of row to commit node) */}
        {incomingEdges.map((edge, i) => {
          const x2 = column * LANE_WIDTH + LANE_WIDTH / 2
          const y2 = ROW_HEIGHT / 2

          // Always draw straight line from top to node center
          return (
            <line
              key={`in-${i}`}
              x1={x2}
              y1={0}
              x2={x2}
              y2={y2}
              stroke={edge.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          )
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
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
            )
          } else {
            // Cross-column edge: smooth curved path
            return renderCurvedEdge(x1, y1, x2, ROW_HEIGHT, edge.color, `out-${i}`)
          }
        })}

        {/* 4. Draw commit node (circle) on top of all lines */}
        <circle
          cx={column * LANE_WIDTH + LANE_WIDTH / 2}
          cy={ROW_HEIGHT / 2}
          r={isMerge ? MERGE_NODE_RADIUS : NODE_RADIUS}
          fill={nodeColor}
          className="graph-node"
        />

        {/* Merge indicator: inner ring for merge commits */}
        {isMerge && (
          <circle
            cx={column * LANE_WIDTH + LANE_WIDTH / 2}
            cy={ROW_HEIGHT / 2}
            r={NODE_RADIUS - 1.5}
            fill="#1e1e2e"
            className="graph-node-inner"
          />
        )}
      </svg>

      {/* Commit info section - columnar layout */}
      <div className="flex-1 flex items-center gap-2 px-3 overflow-hidden min-w-0">
        {/* Subject + Badges column */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
          <span
            className={`text-sm font-mono truncate ${
              isSelected ? 'text-kommit-text font-medium' : 'text-kommit-text'
            }`}
          >
            {commit.subject}
          </span>

          {/* Ref badges (branches, tags) - pill style with icons */}
          {commit.refs.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {commit.refs.slice(0, 3).map((ref, i) => {
                const trimmed = ref.trim()
                if (!trimmed || trimmed === 'HEAD') return null

                const isTag = trimmed.startsWith('tag:')
                const isHead = trimmed.startsWith('HEAD ->')
                const isBranch = !isTag && !isHead

                if (!isBranch && !isTag && !isHead) return null

                const label = isTag
                  ? trimmed.replace('tag: ', '')
                  : isHead
                    ? trimmed.replace('HEAD -> ', '')
                    : trimmed

                return (
                  <span
                    key={i}
                    className={`
                      inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                      ${
                        isTag
                          ? 'bg-kommit-warning/15 text-kommit-warning'
                          : isHead
                            ? 'bg-kommit-accent/20 text-kommit-accent font-semibold'
                            : 'bg-kommit-success/15 text-kommit-success'
                      }
                    `}
                    title={ref}
                  >
                    {isTag ? <TagIcon /> : <BranchIcon />}
                    <span className="truncate max-w-24">{label}</span>
                  </span>
                )
              })}
              {commit.refs.length > 3 && (
                <span className="text-xs text-kommit-text-secondary px-1">
                  +{commit.refs.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Author column - avatar + name */}
        <div className="flex items-center gap-2 flex-shrink-0 w-36">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(commit.author) }}
            title={commit.author}
          >
            {getInitials(commit.author)}
          </div>
          <span className="text-xs text-kommit-text-secondary truncate">{commit.author}</span>
        </div>

        {/* Hash column */}
        <span className="text-xs font-mono text-kommit-text-secondary flex-shrink-0 w-16">
          {commit.abbreviatedHash}
        </span>

        {/* Date column */}
        <span className="text-xs text-kommit-text-secondary flex-shrink-0 w-24 text-right">
          {formatDistanceToNow(commit.authorDate, { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
