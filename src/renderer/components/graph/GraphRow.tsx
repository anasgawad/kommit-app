// ============================================================
// Kommit — Graph Row Component
// Renders commit info text for a single row (text only)
// Graph lines/nodes are rendered by the GraphSvgOverlay
// ============================================================

import type { GraphRow as GraphRowType } from '@shared/types'
import { formatDistanceToNow } from 'date-fns'
import { getInitials, getAvatarColor } from '../../utils/avatar'
import { ROW_HEIGHT } from './GraphSvgOverlay'

// Re-export ROW_HEIGHT for backward compatibility
export { ROW_HEIGHT }

interface GraphRowProps {
  graphRow: GraphRowType
  rowIndex: number
  isSelected: boolean
  graphColumnWidth: number
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
  isSelected,
  graphColumnWidth,
  onSelect,
  onContextMenu
}: GraphRowProps) {
  const { commit } = graphRow

  const handleClick = () => {
    onSelect(commit.hash)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu(commit.hash, e)
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
      {/* Graph column spacer — the SVG overlay draws over this area */}
      <div className="flex-shrink-0" style={{ width: `${graphColumnWidth}px` }} />

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
