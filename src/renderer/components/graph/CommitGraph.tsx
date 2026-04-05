// ============================================================
// Kommit — Commit Graph Component
// Virtualized list of commit history with filtering and search
// GitKraken-inspired professional styling
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useGraphStore } from '../../stores/graph-store'
import { useRepoStore } from '../../stores/repo-store'
import { getMaxColumn } from '../../graph/lane-algorithm'
import { GraphRow } from './GraphRow'
import { GraphSvgOverlay, ROW_HEIGHT, LANE_WIDTH } from './GraphSvgOverlay'

/**
 * SVG Icons for toolbar and context menu
 */
const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="text-kommit-text-secondary"
  >
    <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z" />
  </svg>
)

const BranchFilterIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="text-kommit-text-secondary"
  >
    <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z" />
  </svg>
)

const UserIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="text-kommit-text-secondary"
  >
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5.216 3.858C12.165 9.999 10.243 9 8 9s-4.165.999-5.216 2.858C2.12 13.108 3.19 14 4.5 14h7c1.31 0 2.38-.892 1.716-2.142z" />
  </svg>
)

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
  </svg>
)

// Context menu icons
const CheckoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
  </svg>
)

const CherryPickIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13.5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75z" />
  </svg>
)

const RevertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0zM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.28 5.78a.751.751 0 0 0-1.042-.018.751.751 0 0 0-.018 1.042L11.69 8l-1.47 1.22a.751.751 0 0 0 .326 1.275.749.749 0 0 0 .734-.215l2-1.75a.75.75 0 0 0 0-1.06z" />
  </svg>
)

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3a5 5 0 0 0-4.546 2.914.75.75 0 0 1-1.36-.628A6.5 6.5 0 0 1 14.5 8a6.5 6.5 0 0 1-12.98.738.75.75 0 1 1 1.46-.338A5 5 0 1 0 8 3z" />
    <path d="M2.5 1.75v3.5h3.25a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0z" />
  </svg>
)

export function CommitGraph() {
  const {
    graphRows,
    selectedCommitHash,
    isLoading,
    error,
    hasMore,
    branchFilter,
    authorFilter,
    searchQuery,
    selectCommit,
    loadMore,
    setBranchFilter,
    setAuthorFilter,
    setSearchQuery,
    clearFilters
  } = useGraphStore()

  const { activeRepo, refreshStatus } = useRepoStore()

  const parentRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    hash: string
  } | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed')
  const [showResetDialog, setShowResetDialog] = useState<string | null>(null) // hash

  // Scroll tracking for SVG overlay
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: graphRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10
  })

  const maxColumn = getMaxColumn(graphRows)

  // Calculate graph column width for header alignment
  const effectiveMaxColumns = Math.min(maxColumn, 10)
  const graphColumnWidth = Math.min((effectiveMaxColumns + 1) * LANE_WIDTH + 10, 260)

  // Scroll handler — tracks position for SVG overlay and triggers load-more
  const handleScroll = useCallback(() => {
    const parent = parentRef.current
    if (!parent) return

    setScrollTop(parent.scrollTop)
    setViewportHeight(parent.clientHeight)

    const { scrollTop: st, scrollHeight, clientHeight } = parent
    const scrolledPercentage = (st + clientHeight) / scrollHeight
    if (scrolledPercentage > 0.8 && !isLoading && hasMore) {
      loadMore()
    }
  }, [isLoading, hasMore, loadMore])

  // Load more on scroll near bottom + track scroll position
  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    // Initialize viewport height
    setViewportHeight(parent.clientHeight)

    parent.addEventListener('scroll', handleScroll)
    return () => parent.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (graphRows.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = Math.min(focusedIndex + 1, graphRows.length - 1)
        setFocusedIndex(nextIndex)
        if (nextIndex !== focusedIndex && graphRows[nextIndex]) {
          selectCommit(graphRows[nextIndex].commit.hash)
          rowVirtualizer.scrollToIndex(nextIndex, { align: 'center' })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = Math.max(focusedIndex - 1, 0)
        setFocusedIndex(prevIndex)
        if (prevIndex !== focusedIndex && graphRows[prevIndex]) {
          selectCommit(graphRows[prevIndex].commit.hash)
          rowVirtualizer.scrollToIndex(prevIndex, { align: 'center' })
        }
      } else if (e.key === 'Enter' && focusedIndex >= 0 && graphRows[focusedIndex]) {
        selectCommit(graphRows[focusedIndex].commit.hash)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, graphRows, selectCommit, rowVirtualizer])

  // Update focused index when selection changes externally
  useEffect(() => {
    if (selectedCommitHash) {
      const index = graphRows.findIndex((row) => row.commit.hash === selectedCommitHash)
      if (index >= 0) {
        setFocusedIndex(index)
      }
    }
  }, [selectedCommitHash, graphRows])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleSelect = (hash: string) => {
    selectCommit(hash)
  }

  const handleContextMenu = (hash: string, event: React.MouseEvent) => {
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      hash
    })
  }

  const handleContextMenuAction = async (action: string, hash: string) => {
    setContextMenu(null)
    if (!activeRepo) return
    setContextError(null)

    try {
      switch (action) {
        case 'checkout':
          await window.api.git.checkout(activeRepo.path, hash)
          await refreshStatus()
          break
        case 'cherry-pick':
          await window.api.git.cherryPick(activeRepo.path, hash)
          await refreshStatus()
          break
        case 'revert':
          await window.api.git.revert(activeRepo.path, hash)
          await refreshStatus()
          break
        case 'reset':
          setShowResetDialog(hash)
          return
      }
    } catch (err) {
      setContextError(err instanceof Error ? err.message : `${action} failed`)
    }
  }

  const handleResetConfirm = async () => {
    if (!activeRepo || !showResetDialog) return
    setShowResetDialog(null)
    try {
      await window.api.git.reset(activeRepo.path, showResetDialog, resetMode)
      await refreshStatus()
    } catch (err) {
      setContextError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  const hasFilters = branchFilter || authorFilter || searchQuery

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar - redesigned with icons */}
      <div className="h-11 border-b border-kommit-border flex items-center gap-2 px-4 bg-kommit-bg-secondary">
        {/* Search with icon */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search commits..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value || null)}
            className="pl-8 pr-3 py-1.5 text-xs bg-kommit-bg text-kommit-text border border-kommit-border rounded-md focus:outline-none focus:border-kommit-accent focus:ring-1 focus:ring-kommit-accent/30 w-56 transition-colors"
          />
        </div>

        {/* Branch filter with icon */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <BranchFilterIcon />
          </div>
          <input
            type="text"
            placeholder="Branch..."
            value={branchFilter || ''}
            onChange={(e) => setBranchFilter(e.target.value || null)}
            className="pl-8 pr-3 py-1.5 text-xs bg-kommit-bg text-kommit-text border border-kommit-border rounded-md focus:outline-none focus:border-kommit-accent focus:ring-1 focus:ring-kommit-accent/30 w-32 transition-colors"
          />
        </div>

        {/* Author filter with icon */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <UserIcon />
          </div>
          <input
            type="text"
            placeholder="Author..."
            value={authorFilter || ''}
            onChange={(e) => setAuthorFilter(e.target.value || null)}
            className="pl-8 pr-3 py-1.5 text-xs bg-kommit-bg text-kommit-text border border-kommit-border rounded-md focus:outline-none focus:border-kommit-accent focus:ring-1 focus:ring-kommit-accent/30 w-32 transition-colors"
          />
        </div>

        {/* Clear filters button */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-kommit-bg text-kommit-text-secondary hover:text-kommit-text border border-kommit-border rounded-md hover:border-kommit-accent transition-colors"
            title="Clear all filters"
          >
            <ClearIcon />
            <span>Clear</span>
          </button>
        )}

        {/* Active filter indicator */}
        {hasFilters && (
          <div className="flex items-center gap-1 ml-1">
            <span className="w-2 h-2 rounded-full bg-kommit-accent animate-pulse" />
            <span className="text-xs text-kommit-accent">Filtered</span>
          </div>
        )}

        {/* Loading indicator - moved to right */}
        {isLoading && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-kommit-accent/30 border-t-kommit-accent rounded-full animate-spin" />
            <span className="text-xs text-kommit-text-secondary">Loading...</span>
          </div>
        )}

        {/* Commit count */}
        {!isLoading && graphRows.length > 0 && (
          <span className="ml-auto text-xs text-kommit-text-secondary">
            {graphRows.length} commits
          </span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-kommit-danger/10 text-kommit-danger text-xs border-b border-kommit-danger/30 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575zM8 5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5zm1 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Column headers */}
      <div className="h-8 border-b border-kommit-border flex items-center bg-kommit-bg-secondary/50 text-xs text-kommit-text-secondary font-medium">
        <div style={{ width: `${graphColumnWidth}px` }} className="flex-shrink-0 px-2">
          Graph
        </div>
        <div className="flex-1 px-2">Description</div>
        <div className="w-36 px-2 flex-shrink-0">Author</div>
        <div className="w-16 px-2 flex-shrink-0">Commit</div>
        <div className="w-24 px-2 flex-shrink-0 text-right">Date</div>
        <div className="w-3" /> {/* Scrollbar compensation */}
      </div>

      {/* Graph rows (virtualized) */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {graphRows.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-kommit-text-secondary">
            <svg
              width="48"
              height="48"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="opacity-30 mb-4"
            >
              <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z" />
            </svg>
            <span className="text-sm">
              {hasFilters ? 'No commits match the current filters' : 'No commits found'}
            </span>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {/* Single SVG overlay for all graph lines and nodes */}
            <GraphSvgOverlay
              graphRows={graphRows}
              maxColumn={maxColumn}
              totalHeight={rowVirtualizer.getTotalSize()}
              scrollTop={scrollTop}
              viewportHeight={viewportHeight}
              selectedCommitHash={selectedCommitHash}
            />

            {/* Virtualized commit info rows (text only — no per-row SVG) */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const graphRow = graphRows[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <GraphRow
                    graphRow={graphRow}
                    rowIndex={virtualRow.index}
                    isSelected={graphRow.commit.hash === selectedCommitHash}
                    graphColumnWidth={graphColumnWidth}
                    onSelect={handleSelect}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Context menu - polished with icons */}
      {contextMenu && (
        <div
          className="context-menu fixed bg-kommit-bg-secondary border border-kommit-border rounded-lg shadow-xl py-1.5 z-50 min-w-44 animate-in fade-in duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary flex items-center gap-2.5 transition-colors"
            onClick={() => handleContextMenuAction('checkout', contextMenu.hash)}
          >
            <CheckoutIcon />
            <span>Checkout</span>
            <span className="ml-auto text-xs text-kommit-text-secondary">Ctrl+K</span>
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary flex items-center gap-2.5 transition-colors"
            onClick={() => handleContextMenuAction('cherry-pick', contextMenu.hash)}
          >
            <CherryPickIcon />
            <span>Cherry-pick</span>
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary flex items-center gap-2.5 transition-colors"
            onClick={() => handleContextMenuAction('revert', contextMenu.hash)}
          >
            <RevertIcon />
            <span>Revert</span>
          </button>
          <div className="border-t border-kommit-border my-1.5" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-kommit-danger hover:bg-kommit-danger/10 flex items-center gap-2.5 transition-colors"
            onClick={() => handleContextMenuAction('reset', contextMenu.hash)}
          >
            <ResetIcon />
            <span>Reset to here</span>
          </button>
        </div>
      )}

      {/* Context action error banner */}
      {contextError && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-red-200 text-xs px-4 py-2 rounded shadow-lg cursor-pointer max-w-md"
          onClick={() => setContextError(null)}
          title="Click to dismiss"
        >
          {contextError}
        </div>
      )}

      {/* Reset confirmation dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-kommit-bg-secondary border border-kommit-border rounded-lg shadow-xl p-4 min-w-72">
            <h3 className="text-sm font-semibold text-kommit-text mb-3">Reset to commit</h3>
            <p className="text-xs text-kommit-text-secondary mb-3">Select reset mode:</p>
            <div className="flex flex-col gap-1.5 mb-4">
              {(['soft', 'mixed', 'hard'] as const).map((mode) => (
                <label key={mode} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reset-mode"
                    value={mode}
                    checked={resetMode === mode}
                    onChange={() => setResetMode(mode)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-kommit-text font-medium">{mode}</span>
                    <p className="text-xs text-kommit-text-secondary">
                      {mode === 'soft' && 'Move HEAD only; keep staged and working tree'}
                      {mode === 'mixed' && 'Move HEAD and unstage; keep working tree'}
                      {mode === 'hard' && 'Move HEAD, unstage, and discard all changes'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetDialog(null)}
                className="px-3 py-1.5 text-xs text-kommit-text-secondary hover:text-kommit-text"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className={`px-3 py-1.5 text-xs rounded font-medium ${
                  resetMode === 'hard'
                    ? 'bg-kommit-danger text-white hover:opacity-80'
                    : 'bg-kommit-accent text-white hover:opacity-80'
                }`}
              >
                Reset ({resetMode})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
