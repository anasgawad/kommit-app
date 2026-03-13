// ============================================================
// Kommit — Commit Graph Component
// Virtualized list of commit history with filtering and search
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useGraphStore } from '../../stores/graph-store'
import { getMaxColumn } from '../../graph/lane-algorithm'
import { GraphRow } from './GraphRow'

const ROW_HEIGHT = 32

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

  const parentRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    hash: string
  } | null>(null)

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

  // Load more on scroll near bottom
  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent
      const scrolledPercentage = (scrollTop + clientHeight) / scrollHeight

      // Trigger load more when scrolled past 80%
      if (scrolledPercentage > 0.8 && !isLoading && hasMore) {
        loadMore()
      }
    }

    parent.addEventListener('scroll', handleScroll)
    return () => parent.removeEventListener('scroll', handleScroll)
  }, [isLoading, hasMore, loadMore])

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

  const handleContextMenuAction = (action: string, hash: string) => {
    console.log(`Context menu action: ${action} on ${hash}`)
    // TODO: Phase 3 - implement actual actions
    setContextMenu(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 border-b border-kommit-border flex items-center gap-3 px-4 bg-kommit-bg-secondary">
        {/* Search */}
        <input
          type="text"
          placeholder="Search commits..."
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery(e.target.value || null)}
          className="px-2 py-1 text-xs bg-kommit-bg-tertiary text-kommit-text border border-kommit-border rounded focus:outline-none focus:border-kommit-accent w-64"
        />

        {/* Branch filter */}
        <input
          type="text"
          placeholder="Filter by branch..."
          value={branchFilter || ''}
          onChange={(e) => setBranchFilter(e.target.value || null)}
          className="px-2 py-1 text-xs bg-kommit-bg-tertiary text-kommit-text border border-kommit-border rounded focus:outline-none focus:border-kommit-accent w-40"
        />

        {/* Author filter */}
        <input
          type="text"
          placeholder="Filter by author..."
          value={authorFilter || ''}
          onChange={(e) => setAuthorFilter(e.target.value || null)}
          className="px-2 py-1 text-xs bg-kommit-bg-tertiary text-kommit-text border border-kommit-border rounded focus:outline-none focus:border-kommit-accent w-40"
        />

        {/* Clear filters */}
        {(branchFilter || authorFilter || searchQuery) && (
          <button
            onClick={clearFilters}
            className="px-2 py-1 text-xs bg-kommit-bg-tertiary text-kommit-text-secondary hover:text-kommit-text border border-kommit-border rounded hover:border-kommit-accent"
          >
            Clear
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <span className="text-xs text-kommit-text-secondary ml-auto">Loading...</span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-kommit-danger/10 text-kommit-danger text-xs border-b border-kommit-danger/30">
          {error}
        </div>
      )}

      {/* Graph rows (virtualized) */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {graphRows.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full text-kommit-text-secondary text-sm">
            {branchFilter || authorFilter || searchQuery
              ? 'No commits match the current filters'
              : 'No commits found'}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
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
                    maxColumns={maxColumn}
                    onSelect={handleSelect}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-kommit-bg-secondary border border-kommit-border rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary"
            onClick={() => handleContextMenuAction('checkout', contextMenu.hash)}
          >
            Checkout
          </button>
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary"
            onClick={() => handleContextMenuAction('cherry-pick', contextMenu.hash)}
          >
            Cherry-pick
          </button>
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-kommit-text hover:bg-kommit-bg-tertiary"
            onClick={() => handleContextMenuAction('revert', contextMenu.hash)}
          >
            Revert
          </button>
          <div className="border-t border-kommit-border my-1" />
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-kommit-danger hover:bg-kommit-bg-tertiary"
            onClick={() => handleContextMenuAction('reset', contextMenu.hash)}
          >
            Reset to here
          </button>
        </div>
      )}
    </div>
  )
}
