// ============================================================
// Kommit — RebasePanel Component
// Interactive rebase: list commits, change actions, start/abort/continue/skip
// ============================================================

import { useState, useEffect } from 'react'
import { useRebaseStore } from '../../stores/rebase-store'
import type { RebaseAction, RebaseActionType } from '@shared/types'

interface RebasePanelProps {
  repoPath: string
  onRefresh?: () => void
}

const ACTION_OPTIONS: RebaseActionType[] = ['pick', 'reword', 'edit', 'squash', 'fixup', 'drop']

export function RebasePanel({ repoPath, onRefresh }: RebasePanelProps) {
  const {
    actions,
    baseHash,
    status,
    isLoading,
    error,
    setActions,
    setBaseHash,
    updateAction,
    startRebase,
    continueRebase,
    abortRebase,
    skipRebase
  } = useRebaseStore()

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [rawCommits, setRawCommits] = useState('')

  // Load rebase status on mount (catches a rebase started outside Kommit or
  // after an app restart) and poll while a rebase is in progress.
  useEffect(() => {
    useRebaseStore.getState().loadStatus(repoPath)
  }, [repoPath])

  useEffect(() => {
    if (!status?.inProgress) return
    const id = setInterval(() => {
      useRebaseStore.getState().loadStatus(repoPath)
    }, 2000)
    return () => clearInterval(id)
  }, [repoPath, status?.inProgress])

  // Parse pasted commit list (format: "hash subject")
  const handleLoadCommits = () => {
    const lines = rawCommits
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const parsed: RebaseAction[] = lines.map((line) => {
      const [hash, ...rest] = line.split(' ')
      return { action: 'pick', hash: hash ?? '', subject: rest.join(' ') }
    })
    setActions(parsed)
    setRawCommits('')
  }

  const hasChanges = actions.some((a) => a.action !== 'pick')
  const canStart = actions.length > 0 && baseHash.trim().length > 0

  const handleStart = async () => {
    try {
      setSuccessMsg(null)
      await startRebase(repoPath, baseHash, actions)
      // If the store cleared actions it means rebase completed without pausing
      const storeActions = useRebaseStore.getState().actions
      if (storeActions.length === 0) {
        setSuccessMsg('Rebase completed successfully.')
      }
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  const handleContinue = async () => {
    try {
      setSuccessMsg(null)
      await continueRebase(repoPath)
      if (!useRebaseStore.getState().status?.inProgress) {
        setSuccessMsg('Rebase completed successfully.')
      }
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  const handleAbort = async () => {
    try {
      await abortRebase(repoPath)
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  const handleSkip = async () => {
    try {
      await skipRebase(repoPath)
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  return (
    <div className="flex flex-col h-full" data-testid="rebase-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Interactive Rebase
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-kommit-danger/20 text-kommit-danger text-xs border-b border-[var(--color-border)]">
          {error}
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="px-3 py-1.5 bg-green-500/15 text-green-400 text-xs border-b border-[var(--color-border)]">
          {successMsg}
        </div>
      )}

      {/* In-progress rebase controls */}
      {status?.inProgress ? (
        <div className="flex flex-col gap-3 p-3">
          <RebaseProgressBar current={status.currentStep} total={status.totalSteps} />

          {status.stoppedForEdit && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-2 py-1.5">
              Paused at <span className="font-mono">{status.currentHash.slice(0, 7)}</span> — amend
              the commit if needed, then click <strong>Continue</strong>.
            </div>
          )}

          {status.conflictedFiles.length > 0 && (
            <div className="text-xs text-kommit-danger">
              Conflicts in: {status.conflictedFiles.join(', ')}
            </div>
          )}

          <div className="flex gap-2" data-testid="rebase-controls">
            <button
              onClick={handleContinue}
              disabled={isLoading || status.conflictedFiles.length > 0}
              className="text-xs px-3 py-1.5 rounded bg-kommit-accent text-kommit-bg hover:opacity-90 disabled:opacity-50"
              data-testid="rebase-continue-btn"
            >
              Continue
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary text-[var(--color-text)]"
              data-testid="rebase-skip-btn"
            >
              Skip
            </button>
            <button
              onClick={handleAbort}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded border border-kommit-danger/40 hover:bg-kommit-danger/10 text-kommit-danger"
              data-testid="rebase-abort-btn"
            >
              Abort
            </button>
          </div>
        </div>
      ) : (
        /* Setup UI */
        <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          {/* Base hash input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Base commit hash</label>
            <input
              type="text"
              value={baseHash}
              onChange={(e) => setBaseHash(e.target.value)}              placeholder="e.g. abc1234 or HEAD~3"
              className="text-xs px-2 py-1.5 rounded border border-[var(--color-border)] bg-kommit-bg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-kommit-accent font-mono"
              data-testid="rebase-base-hash"
            />
          </div>

          {/* Paste commits */}
          {actions.length === 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">
                Paste commits (hash subject, one per line)
              </label>
              <textarea
                value={rawCommits}
                onChange={(e) => setRawCommits(e.target.value)}
                rows={4}
                className="text-xs px-2 py-1.5 rounded border border-[var(--color-border)] bg-kommit-bg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-kommit-accent font-mono resize-none"
                placeholder="abc1234 Fix bug&#10;def5678 Add feature"
                data-testid="rebase-commits-input"
              />
              <button
                onClick={handleLoadCommits}
                disabled={!rawCommits.trim()}
                className="self-end text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary disabled:opacity-50"
              >
                Load
              </button>
            </div>
          )}

          {/* Commit list with action dropdowns */}
          {actions.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">Commits</span>
                <button
                  onClick={() => setActions([])}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Clear
                </button>
              </div>
              {actions.map((action) => (
                <RebaseCommitItem
                  key={action.hash}
                  action={action}
                  onActionChange={(newAction) => updateAction(action.hash, newAction)}
                />
              ))}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart || isLoading || !hasChanges}
            className="text-xs px-3 py-1.5 rounded bg-kommit-accent text-kommit-bg hover:opacity-90 disabled:opacity-50 self-end"
            data-testid="rebase-start-btn"
          >
            {isLoading ? 'Starting...' : 'Start Rebase'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// RebaseCommitItem — single commit row with action dropdown
// ============================================================

interface RebaseCommitItemProps {
  action: RebaseAction
  onActionChange: (action: RebaseActionType) => void
}

export function RebaseCommitItem({ action, onActionChange }: RebaseCommitItemProps) {
  const actionColor: Record<RebaseActionType, string> = {
    pick: 'text-[var(--color-text)]',
    reword: 'text-blue-400',
    edit: 'text-yellow-400',
    squash: 'text-purple-400',
    fixup: 'text-purple-300',
    drop: 'text-kommit-danger'
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded border border-[var(--color-border)] bg-kommit-bg"
      data-testid={`rebase-commit-${action.hash}`}
    >
      <select
        value={action.action}
        onChange={(e) => onActionChange(e.target.value as RebaseActionType)}
        className={[
          'text-[10px] bg-transparent border-none outline-none cursor-pointer font-mono w-14 shrink-0',
          actionColor[action.action]
        ].join(' ')}
        data-testid={`rebase-action-select-${action.hash}`}
      >
        {ACTION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
        {action.hash.slice(0, 7)}
      </span>
      <span className="text-xs text-[var(--color-text)] truncate">{action.subject}</span>
    </div>
  )
}

// ============================================================
// RebaseProgressBar — shows current/total steps
// ============================================================

interface RebaseProgressBarProps {
  current: number
  total: number
}

export function RebaseProgressBar({ current, total }: RebaseProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="flex flex-col gap-1" data-testid="rebase-progress">
      <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>Rebase in progress</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded bg-kommit-bg-tertiary overflow-hidden">
        <div
          className="h-full bg-kommit-accent rounded transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
