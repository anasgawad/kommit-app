// ============================================================
// Kommit — StashPanel Component
// Lists stash entries with apply/pop/drop actions and diff preview
// ============================================================

import { useEffect, useState } from 'react'
import { useStashStore } from '../../stores/stash-store'
import type { StashEntry } from '@shared/types'

interface StashPanelProps {
  repoPath: string
  onRefresh?: () => void
}

export function StashPanel({ repoPath, onRefresh }: StashPanelProps) {
  const {
    stashes,
    selectedIndex,
    stashDiff,
    isLoading,
    isDiffLoading,
    error,
    setSelectedIndex,
    loadStashes,
    stashApply,
    stashPop,
    stashDrop,
    loadStashDiff
  } = useStashStore()

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [dropConfirmIndex, setDropConfirmIndex] = useState<number | null>(null)

  useEffect(() => {
    loadStashes(repoPath)
  }, [repoPath, loadStashes])

  const handleSelect = (entry: StashEntry) => {
    setSelectedIndex(entry.index)
    loadStashDiff(repoPath, entry.index)
  }

  const handleApply = async (index: number) => {
    try {
      await stashApply(repoPath, index)
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  const handlePop = async (index: number) => {
    try {
      await stashPop(repoPath, index)
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  const handleDrop = async (index: number) => {
    setDropConfirmIndex(null)
    try {
      await stashDrop(repoPath, index)
    } catch {
      // error shown via store
    }
  }

  return (
    <div className="flex flex-col h-full" data-testid="stash-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Stashes
        </span>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="text-xs px-2 py-0.5 rounded bg-kommit-accent text-kommit-bg hover:opacity-90 transition-opacity"
          title="Stash changes"
          data-testid="stash-save-btn"
        >
          + Stash
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-kommit-danger/20 text-kommit-danger text-xs border-b border-[var(--color-border)]">
          {error}
        </div>
      )}

      {/* Stash list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
            Loading stashes...
          </div>
        ) : stashes.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]"
            data-testid="stash-empty"
          >
            No stashes
          </div>
        ) : (
          stashes.map((entry) => (
            <StashListItem
              key={entry.index}
              entry={entry}
              isSelected={selectedIndex === entry.index}
              onSelect={() => handleSelect(entry)}
              onApply={() => handleApply(entry.index)}
              onPop={() => handlePop(entry.index)}
              onDrop={() => setDropConfirmIndex(entry.index)}
            />
          ))
        )}
      </div>

      {/* Diff preview */}
      {selectedIndex !== null && (
        <div className="h-32 border-t border-[var(--color-border)] overflow-auto bg-kommit-bg-secondary">
          {isDiffLoading ? (
            <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
              Loading diff...
            </div>
          ) : stashDiff ? (
            <pre
              className="text-xs p-2 font-mono text-[var(--color-text)] whitespace-pre"
              data-testid="stash-diff-preview"
            >
              {stashDiff}
            </pre>
          ) : null}
        </div>
      )}

      {/* Drop confirmation */}
      {dropConfirmIndex !== null && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-kommit-bg-secondary border border-[var(--color-border)] rounded p-4 flex flex-col gap-3 max-w-xs">
            <p className="text-sm text-[var(--color-text)]">
              Drop stash@{'{'}
              {dropConfirmIndex}
              {'}'}? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDropConfirmIndex(null)}
                className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDrop(dropConfirmIndex)}
                className="text-xs px-3 py-1.5 rounded bg-kommit-danger text-white hover:opacity-90"
                data-testid="drop-confirm-btn"
              >
                Drop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <StashDialog repoPath={repoPath} onClose={() => setShowSaveDialog(false)} />
      )}
    </div>
  )
}

// ============================================================
// StashListItem — single row in the stash list
// ============================================================

interface StashListItemProps {
  entry: StashEntry
  isSelected: boolean
  onSelect: () => void
  onApply: () => void
  onPop: () => void
  onDrop: () => void
}

export function StashListItem({
  entry,
  isSelected,
  onSelect,
  onApply,
  onPop,
  onDrop
}: StashListItemProps) {
  const dateStr = entry.date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div
      onClick={onSelect}
      className={[
        'flex flex-col gap-0.5 px-3 py-2 cursor-pointer border-b border-[var(--color-border)] group',
        isSelected ? 'bg-kommit-accent/10' : 'hover:bg-kommit-bg-tertiary'
      ].join(' ')}
      data-testid={`stash-item-${entry.index}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text)] truncate">
          {entry.message}
        </span>
        {/* Action buttons — visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onApply()
            }}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] hover:bg-kommit-bg text-[var(--color-text-muted)]"
            title="Apply stash (keep in list)"
            data-testid={`stash-apply-${entry.index}`}
          >
            Apply
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPop()
            }}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] hover:bg-kommit-bg text-[var(--color-text-muted)]"
            title="Pop stash (apply + remove)"
            data-testid={`stash-pop-${entry.index}`}
          >
            Pop
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDrop()
            }}
            className="text-[10px] px-1.5 py-0.5 rounded border border-kommit-danger/40 hover:bg-kommit-danger/10 text-kommit-danger"
            title="Drop stash"
            data-testid={`stash-drop-${entry.index}`}
          >
            Drop
          </button>
        </div>
      </div>
      <div className="flex gap-2 text-[10px] text-[var(--color-text-muted)]">
        <span>stash@{'{' + entry.index + '}'}</span>
        <span>·</span>
        <span>{entry.branch}</span>
        <span>·</span>
        <span>{dateStr}</span>
      </div>
    </div>
  )
}

// ============================================================
// StashDialog — modal for creating a new stash
// ============================================================

interface StashDialogProps {
  repoPath: string
  onClose: () => void
}

export function StashDialog({ repoPath, onClose }: StashDialogProps) {
  const [message, setMessage] = useState('')
  const [includeUntracked, setIncludeUntracked] = useState(false)
  const [keepIndex, setKeepIndex] = useState(false)
  const { stashSave, isLoading } = useStashStore()

  const handleSave = async () => {
    try {
      await stashSave(repoPath, {
        message: message.trim() || undefined,
        includeUntracked,
        keepIndex
      })
      onClose()
    } catch {
      // error shown via store
    }
  }

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
      <div
        className="bg-kommit-bg-secondary border border-[var(--color-border)] rounded p-4 flex flex-col gap-3 w-72"
        data-testid="stash-dialog"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Stash Changes</h3>

        <input
          type="text"
          placeholder="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="text-xs px-2 py-1.5 rounded border border-[var(--color-border)] bg-kommit-bg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-kommit-accent"
          data-testid="stash-message-input"
        />

        <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={includeUntracked}
            onChange={(e) => setIncludeUntracked(e.target.checked)}
            className="accent-kommit-accent"
            data-testid="stash-include-untracked"
          />
          Include untracked files
        </label>

        <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={keepIndex}
            onChange={(e) => setKeepIndex(e.target.checked)}
            className="accent-kommit-accent"
            data-testid="stash-keep-index"
          />
          Keep index (staged changes)
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary text-[var(--color-text)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded bg-kommit-accent text-kommit-bg hover:opacity-90 disabled:opacity-50"
            data-testid="stash-save-confirm"
          >
            {isLoading ? 'Stashing...' : 'Stash'}
          </button>
        </div>
      </div>
    </div>
  )
}
