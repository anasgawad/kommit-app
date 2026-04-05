// ============================================================
// Kommit — CommitForm Component
// Subject/body input, amend toggle, and commit button
// ============================================================

import { useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'

interface CommitFormProps {
  repoPath: string
  onCommit: () => void
}

export function CommitForm({ repoPath, onCommit }: CommitFormProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [amend, setAmend] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { status, refreshStatus } = useRepoStore()

  const hasStagedChanges = (status?.staged?.length ?? 0) > 0
  const canCommit =
    (subject.trim().length > 0 || amend) && (hasStagedChanges || amend) && !isCommitting
  const subjectTooLong = subject.length > 72

  const handleCommit = async () => {
    if (!canCommit) return
    setIsCommitting(true)
    setError(null)
    try {
      const message =
        body.trim().length > 0 ? `${subject.trim()}\n\n${body.trim()}` : subject.trim()
      await window.api.git.commit(repoPath, message, { amend })
      setSubject('')
      setBody('')
      setAmend(false)
      await refreshStatus()
      onCommit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCommit()
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 border-t border-[var(--color-border)]">
      {/* Subject input */}
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Summary (required)"
          className={`w-full px-2 py-1 text-sm rounded border bg-[var(--color-bg-input)] text-[var(--color-text)] outline-none focus:ring-1 ${
            subjectTooLong
              ? 'border-yellow-500 focus:ring-yellow-500'
              : 'border-[var(--color-border)] focus:ring-[var(--color-accent)]'
          }`}
          maxLength={200}
        />
        {subjectTooLong && (
          <p className="text-xs text-yellow-500">
            Subject exceeds 72 characters ({subject.length}/72)
          </p>
        )}
      </div>

      {/* Body textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Description (optional)"
        rows={3}
        className="w-full px-2 py-1 text-sm rounded border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
      />

      {/* Amend checkbox */}
      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={amend}
          onChange={(e) => setAmend(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        Amend last commit
      </label>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 truncate" title={error}>
          {error}
        </p>
      )}

      {/* Commit button */}
      <button
        onClick={handleCommit}
        disabled={!canCommit}
        className={`py-1.5 rounded text-sm font-medium transition-colors ${
          canCommit
            ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white cursor-pointer'
            : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] cursor-not-allowed'
        }`}
        title={
          canCommit
            ? 'Commit (Ctrl+Enter)'
            : !hasStagedChanges && !amend
              ? 'No staged changes'
              : 'Enter a summary'
        }
      >
        {isCommitting ? 'Committing…' : amend ? 'Amend Commit' : 'Commit'}
      </button>
    </div>
  )
}
