// ============================================================
// Kommit — Commit Detail Panel
// Shows full commit metadata and changed files
// GitKraken-inspired professional styling
// ============================================================

import { format } from 'date-fns'
import { useGraphStore } from '../../stores/graph-store'
import { getInitials, getAvatarColor } from '../../utils/avatar'

/**
 * File status configuration with icons and colors
 */
const FILE_STATUS_CONFIG = {
  added: {
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-success"
      >
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
        <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z" />
      </svg>
    ),
    label: 'Added',
    bgClass: 'bg-kommit-success/10'
  },
  modified: {
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-warning"
      >
        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z" />
      </svg>
    ),
    label: 'Modified',
    bgClass: 'bg-kommit-warning/10'
  },
  deleted: {
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-danger"
      >
        <path d="M4 4.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z" />
        <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z" />
      </svg>
    ),
    label: 'Deleted',
    bgClass: 'bg-kommit-danger/10'
  },
  renamed: {
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-accent"
      >
        <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
      </svg>
    ),
    label: 'Renamed',
    bgClass: 'bg-kommit-accent/10'
  }
}

/**
 * Section header icon component
 */
const SectionIcon = ({
  type
}: {
  type: 'commit' | 'author' | 'date' | 'message' | 'parents' | 'files'
}) => {
  const icons = {
    commit: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13.5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75z" />
      </svg>
    ),
    author: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5.216 3.858C12.165 9.999 10.243 9 8 9s-4.165.999-5.216 2.858C2.12 13.108 3.19 14 4.5 14h7c1.31 0 2.38-.892 1.716-2.142z" />
      </svg>
    ),
    date: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z" />
      </svg>
    ),
    message: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
      </svg>
    ),
    parents: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z" />
      </svg>
    ),
    files: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-kommit-text-secondary"
      >
        <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z" />
        <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z" />
      </svg>
    )
  }
  return icons[type]
}

export function CommitDetail() {
  const { selectedCommitDetail, selectedCommitFilePath, clearSelection, selectCommitFile } =
    useGraphStore()

  if (!selectedCommitDetail) {
    return (
      <div className="w-96 border-l border-kommit-border bg-kommit-bg flex flex-col items-center justify-center text-kommit-text-secondary">
        <svg
          width="48"
          height="48"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="opacity-30 mb-4"
        >
          <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13.5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75z" />
        </svg>
        <span className="text-sm">Select a commit to view details</span>
      </div>
    )
  }

  const { commit, changedFiles } = selectedCommitDetail

  return (
    <div className="w-96 border-l border-kommit-border bg-kommit-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-kommit-border flex items-center justify-between px-4 bg-kommit-bg-secondary flex-shrink-0">
        <span className="text-sm font-medium text-kommit-text">Commit Details</span>
        <button
          onClick={clearSelection}
          className="p-1 text-kommit-text-secondary hover:text-kommit-text hover:bg-kommit-bg-tertiary rounded transition-colors"
          title="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
            <path d="M 2 2 L 12 12 M 12 2 L 2 12" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Commit hash */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-2">
            <SectionIcon type="commit" />
            <span>Commit</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-kommit-text bg-kommit-bg-tertiary px-2 py-0.5 rounded">
              {commit.abbreviatedHash}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(commit.hash)}
              className="text-xs text-kommit-text-secondary hover:text-kommit-accent transition-colors flex items-center gap-1"
              title="Copy full hash"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25z" />
              </svg>
              Copy
            </button>
          </div>
          <code className="text-xs font-mono text-kommit-text-secondary mt-1 block truncate">
            {commit.hash}
          </code>
        </div>

        {/* Author */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-2">
            <SectionIcon type="author" />
            <span>Author</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(commit.author) }}
            >
              {getInitials(commit.author)}
            </div>
            <div>
              <div className="text-sm text-kommit-text font-medium">{commit.author}</div>
              <div className="text-xs text-kommit-text-secondary">{commit.authorEmail}</div>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-2">
            <SectionIcon type="date" />
            <span>Date</span>
          </div>
          <div className="text-sm text-kommit-text">{format(commit.authorDate, 'PPpp')}</div>
        </div>

        {/* Message */}
        <div className="px-4 py-3 border-b border-kommit-border">
          <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-2">
            <SectionIcon type="message" />
            <span>Message</span>
          </div>
          <div className="text-sm text-kommit-text font-medium mb-2">{commit.subject}</div>
          {commit.body && (
            <div className="text-sm text-kommit-text-secondary whitespace-pre-wrap bg-kommit-bg-secondary rounded p-2 mt-2">
              {commit.body}
            </div>
          )}
        </div>

        {/* Parents */}
        {commit.parents.length > 0 && (
          <div className="px-4 py-3 border-b border-kommit-border">
            <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-2">
              <SectionIcon type="parents" />
              <span>
                {commit.parents.length === 1 ? 'Parent' : `Parents (${commit.parents.length})`}
              </span>
              {commit.parents.length > 1 && (
                <span className="px-1.5 py-0.5 bg-kommit-accent/20 text-kommit-accent rounded text-xs font-medium">
                  Merge
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {commit.parents.map((parentHash, i) => (
                <code
                  key={i}
                  className="text-xs font-mono text-kommit-accent bg-kommit-bg-tertiary px-2 py-1 rounded hover:bg-kommit-accent/20 cursor-pointer transition-colors"
                >
                  {parentHash.substring(0, 7)}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Changed files */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-kommit-text-secondary mb-3">
            <SectionIcon type="files" />
            <span>Changed Files</span>
            <span className="px-1.5 py-0.5 bg-kommit-bg-tertiary rounded text-xs">
              {changedFiles.length}
            </span>
          </div>
          {changedFiles.length === 0 ? (
            <div className="text-sm text-kommit-text-secondary">No files changed</div>
          ) : (
            <div className="space-y-1">
              {changedFiles.map((file, i) => {
                const statusConfig = FILE_STATUS_CONFIG[file.status]
                const isSelected = selectedCommitFilePath === file.path
                return (
                  <div
                    key={i}
                    onClick={() => selectCommitFile(commit.hash, file.path)}
                    className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-kommit-accent/20 ring-1 ring-kommit-accent/40'
                        : `hover:bg-kommit-bg-tertiary ${statusConfig.bgClass}`
                    }`}
                    title={`${statusConfig.label}: ${file.path}`}
                  >
                    <span className="flex-shrink-0 mt-0.5">{statusConfig.icon}</span>
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
