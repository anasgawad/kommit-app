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
  const { commit, column, edges } = graphRow
  const svgWidth = (maxColumns + 1) * LANE_WIDTH + 10

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
        style={{ minWidth: `${svgWidth}px` }}
      >
        {/* Draw edges (lines to parents) */}
        {edges.map((edge, i) => {
          const x1 = edge.fromColumn * LANE_WIDTH + LANE_WIDTH / 2
          const y1 = ROW_HEIGHT / 2

          // Edge goes down to parent (future row)
          const verticalOffset = (edge.toRow - edge.fromRow) * ROW_HEIGHT
          const x2 = edge.toColumn * LANE_WIDTH + LANE_WIDTH / 2

          if (edge.fromColumn === edge.toColumn) {
            // Straight line (same column)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={ROW_HEIGHT}
                stroke={edge.color}
                strokeWidth="2"
              />
            )
          } else {
            // Curved line (merge/branch)
            // Draw partial curve within this row, rest will be drawn by subsequent rows
            const controlY = y1 + Math.min(verticalOffset / 2, ROW_HEIGHT / 2)
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} Q ${x1} ${controlY}, ${x1 + (x2 - x1) / 3} ${ROW_HEIGHT}`}
                stroke={edge.color}
                strokeWidth="2"
                fill="none"
              />
            )
          }
        })}

        {/* Draw commit node (circle) */}
        <circle
          cx={column * LANE_WIDTH + LANE_WIDTH / 2}
          cy={ROW_HEIGHT / 2}
          r={NODE_RADIUS}
          fill={edges.length > 0 ? edges[0].color : '#569CD6'}
          stroke="#1e1e2e"
          strokeWidth="1.5"
        />
      </svg>

      {/* Commit info section */}
      <div className="flex-1 flex items-center gap-3 px-3 overflow-hidden">
        {/* Commit message and refs */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
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
