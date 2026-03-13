// ============================================================
// Kommit — Commit Detail Panel
// Shows full commit metadata and changed files
// ============================================================

import { format } from 'date-fns'
import { useGraphStore } from '../../stores/graph-store'

const FILE_STATUS_ICONS = {
  added: { icon: '+', color: 'text-kommit-success', label: 'Added' },
  modified: { icon: 'M', color: 'text-kommit-warning', label: 'Modified' },
  deleted: { icon: '-', color: 'text-kommit-danger', label: 'Deleted' },
  renamed: { icon: 'R', color: 'text-kommit-accent', label: 'Renamed' }
}

export function CommitDetail() {
  const { selectedCommitDetail, clearSelection } = useGraphStore()

  if (!selectedCommitDetail) {
    return (
      <div className="w-96 border-l border-kommit-border bg-kommit-bg flex items-center justify-center text-kommit-text-secondary text-sm">
        Select a commit to view details
      </div>
    )
  }

  const { commit, changedFiles } = selectedCommitDetail

  return (
    <div className="w-96 border-l border-kommit-border bg-kommit-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-kommit-border flex items-center justify-between px-4 bg-kommit-bg-secondary">
        <span className="text-sm font-medium text-kommit-text">Commit Details</span>
        <button
          onClick={clearSelection}
          className="text-kommit-text-secondary hover:text-kommit-text"
          title="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
            <path d="M 2 2 L 12 12 M 12 2 L 2 12" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Commit hash */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="text-xs text-kommit-text-secondary mb-1">Commit</div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-kommit-text">{commit.abbreviatedHash}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(commit.hash)
              }}
              className="text-xs text-kommit-text-secondary hover:text-kommit-accent"
              title="Copy full hash"
            >
              Copy
            </button>
          </div>
          <code className="text-xs font-mono text-kommit-text-secondary">{commit.hash}</code>
        </div>

        {/* Author */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="text-xs text-kommit-text-secondary mb-1">Author</div>
          <div className="text-sm text-kommit-text">{commit.author}</div>
          <div className="text-xs text-kommit-text-secondary">{commit.authorEmail}</div>
        </div>

        {/* Date */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="text-xs text-kommit-text-secondary mb-1">Date</div>
          <div className="text-sm text-kommit-text">{format(commit.authorDate, 'PPpp')}</div>
        </div>

        {/* Message */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="text-xs text-kommit-text-secondary mb-1">Message</div>
          <div className="text-sm text-kommit-text font-medium mb-2">{commit.subject}</div>
          {commit.body && (
            <div className="text-sm text-kommit-text-secondary whitespace-pre-wrap">
              {commit.body}
            </div>
          )}
        </div>

        {/* Parents */}
        {commit.parents.length > 0 && (
          <div className="px-4 py-3 border-b border-kommit-border">
            <div className="text-xs text-kommit-text-secondary mb-1">
              {commit.parents.length === 1 ? 'Parent' : `Parents (${commit.parents.length})`}
            </div>
            <div className="space-y-1">
              {commit.parents.map((parentHash, i) => (
                <div key={i}>
                  <code className="text-xs font-mono text-kommit-accent hover:underline cursor-pointer">
                    {parentHash.substring(0, 7)}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Changed files */}
        <div className="px-4 py-3">
          <div className="text-xs text-kommit-text-secondary mb-2">
            Changed Files ({changedFiles.length})
          </div>
          {changedFiles.length === 0 ? (
            <div className="text-sm text-kommit-text-secondary">No files changed</div>
          ) : (
            <div className="space-y-1">
              {changedFiles.map((file, i) => {
                const statusInfo = FILE_STATUS_ICONS[file.status]
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs hover:bg-kommit-bg-tertiary px-2 py-1 rounded cursor-pointer"
                    title={`${statusInfo.label}: ${file.path}`}
                  >
                    <span
                      className={`font-mono font-bold flex-shrink-0 ${statusInfo.color}`}
                      style={{ width: '1rem' }}
                    >
                      {statusInfo.icon}
                    </span>
                    <span className="font-mono text-kommit-text break-all">{file.path}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
