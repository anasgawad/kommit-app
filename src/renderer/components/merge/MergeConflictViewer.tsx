// ============================================================
// Kommit — MergeConflictViewer Component
// 3-pane conflict viewer: ours | base | theirs + result pane
// ============================================================

import { useEffect, useState } from 'react'
import { useConflictStore } from '../../stores/conflict-store'
import type { ConflictFile } from '@shared/types'

interface MergeConflictViewerProps {
  repoPath: string
  onRefresh?: () => void
  onGoToChanges?: () => void
}

export function MergeConflictViewer({ repoPath, onRefresh, onGoToChanges }: MergeConflictViewerProps) {
  const {
    conflictedFiles,
    selectedFile,
    fileContent,
    resolvedResult,
    isLoading,
    isContentLoading,
    error,
    setSelectedFile,
    setResolvedResult,
    loadConflictedFiles,
    loadFileContent,
    markResolved
  } = useConflictStore()

  // Track whether a merge was in progress when we loaded (to distinguish
  // "no conflicts because fully resolved" from "no merge at all")
  const [mergeInProgress, setMergeInProgress] = useState(false)

  useEffect(() => {
    window.api.git.getMergeMessage(repoPath).then((msg) => {
      setMergeInProgress(msg !== null)
    })
    loadConflictedFiles(repoPath)
  }, [repoPath, loadConflictedFiles])

  const handleFileSelect = (file: ConflictFile) => {
    setSelectedFile(file)
    loadFileContent(repoPath, file.path)
  }

  const handleAcceptOurs = () => {
    if (!fileContent) return
    setResolvedResult(fileContent.ours)
  }

  const handleAcceptTheirs = () => {
    if (!fileContent) return
    setResolvedResult(fileContent.theirs)
  }

  const handleAcceptBoth = () => {
    if (!fileContent) return
    setResolvedResult(fileContent.ours + '\n' + fileContent.theirs)
  }

  const handleMarkResolved = async () => {
    if (!selectedFile) return
    try {
      await markResolved(repoPath, selectedFile.path)
      // Re-check if merge is still in progress after resolving
      const msg = await window.api.git.getMergeMessage(repoPath)
      setMergeInProgress(msg !== null)
      onRefresh?.()
    } catch {
      // error shown via store
    }
  }

  // Count remaining conflict markers
  const remainingConflicts = resolvedResult.split('<<<<<<<').length - 1

  return (
    <div className="flex flex-col h-full" data-testid="merge-conflict-viewer">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Merge Conflicts
        </span>
        {conflictedFiles.length > 0 && (
          <span className="text-xs text-kommit-danger font-medium" data-testid="conflict-count">
            {conflictedFiles.length} file{conflictedFiles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 bg-kommit-danger/20 text-kommit-danger text-xs border-b border-[var(--color-border)]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-xs text-[var(--color-text-muted)]">
          Loading...
        </div>
      ) : conflictedFiles.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-3 text-xs text-[var(--color-text-muted)]"
          data-testid="no-conflicts"
        >
          {mergeInProgress ? (
            <>
              <span className="text-kommit-success font-medium">All conflicts resolved</span>
              <span className="text-center px-4">
                Go to Changes to commit and complete the merge.
              </span>
              {onGoToChanges && (
                <button
                  onClick={onGoToChanges}
                  className="text-xs px-3 py-1 rounded bg-kommit-accent text-kommit-bg hover:opacity-90"
                >
                  Go to Changes
                </button>
              )}
            </>
          ) : (
            <span>No conflicts</span>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* File list */}
          <ConflictFileList
            files={conflictedFiles}
            selectedFile={selectedFile}
            onSelect={handleFileSelect}
          />

          {/* 3-pane viewer */}
          {selectedFile && (
            <div className="flex flex-col flex-1 overflow-hidden border-l border-[var(--color-border)]">
              {isContentLoading ? (
                <div className="flex items-center justify-center flex-1 text-xs text-[var(--color-text-muted)]">
                  Loading content...
                </div>
              ) : fileContent ? (
                <>
                  {/* Accept buttons */}
                  <ConflictActions
                    onAcceptOurs={handleAcceptOurs}
                    onAcceptTheirs={handleAcceptTheirs}
                    onAcceptBoth={handleAcceptBoth}
                  />

                  {/* 3-way panes */}
                  <div className="flex flex-1 overflow-hidden border-b border-[var(--color-border)]">
                    <ConflictPane label="Ours" content={fileContent.ours} />
                    <ConflictPane label="Base" content={fileContent.base} />
                    <ConflictPane label="Theirs" content={fileContent.theirs} />
                  </div>

                  {/* Result pane */}
                  <div className="flex flex-col h-48 min-h-0">
                    <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--color-border)] bg-kommit-bg-secondary">
                      <span className="text-xs font-medium text-[var(--color-text)]">Result</span>
                      {remainingConflicts > 0 && (
                        <span
                          className="text-xs text-kommit-danger"
                          data-testid="remaining-conflicts"
                        >
                          {remainingConflicts} conflict{remainingConflicts !== 1 ? 's' : ''}{' '}
                          remaining
                        </span>
                      )}
                    </div>
                    <textarea
                      value={resolvedResult}
                      onChange={(e) => setResolvedResult(e.target.value)}
                      className="flex-1 resize-none text-xs font-mono p-2 bg-kommit-bg text-[var(--color-text)] focus:outline-none"
                      data-testid="result-editor"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-end px-2 py-1.5 border-t border-[var(--color-border)] bg-kommit-bg-secondary">
                      <button
                        onClick={handleMarkResolved}
                        disabled={remainingConflicts > 0 || isLoading}
                        className="text-xs px-3 py-1 rounded bg-kommit-accent text-kommit-bg hover:opacity-90 disabled:opacity-50"
                        data-testid="mark-resolved-btn"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ConflictFileList — sidebar listing conflicted files
// ============================================================

interface ConflictFileListProps {
  files: ConflictFile[]
  selectedFile: ConflictFile | null
  onSelect: (file: ConflictFile) => void
}

export function ConflictFileList({ files, selectedFile, onSelect }: ConflictFileListProps) {
  return (
    <div
      className="w-48 shrink-0 overflow-y-auto border-r border-[var(--color-border)]"
      data-testid="conflict-file-list"
    >
      {files.map((file) => (
        <div
          key={file.path}
          onClick={() => onSelect(file)}
          className={[
            'flex flex-col px-3 py-2 cursor-pointer border-b border-[var(--color-border)] text-xs',
            selectedFile?.path === file.path
              ? 'bg-kommit-accent/10 text-[var(--color-text)]'
              : 'hover:bg-kommit-bg-tertiary text-[var(--color-text-muted)]'
          ].join(' ')}
          data-testid={`conflict-file-${file.path}`}
        >
          <span className="truncate font-medium">{file.path.split('/').pop()}</span>
          <span className="text-[10px] text-kommit-danger">
            {file.conflictCount} conflict{file.conflictCount !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ConflictActions — accept-left / accept-right / accept-both buttons
// ============================================================

interface ConflictActionsProps {
  onAcceptOurs: () => void
  onAcceptTheirs: () => void
  onAcceptBoth: () => void
}

export function ConflictActions({
  onAcceptOurs,
  onAcceptTheirs,
  onAcceptBoth
}: ConflictActionsProps) {
  return (
    <div
      className="flex gap-2 px-3 py-1.5 border-b border-[var(--color-border)] bg-kommit-bg-secondary"
      data-testid="conflict-actions"
    >
      <button
        onClick={onAcceptOurs}
        className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary text-[var(--color-text)]"
        data-testid="accept-ours-btn"
      >
        Accept Ours
      </button>
      <button
        onClick={onAcceptTheirs}
        className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary text-[var(--color-text)]"
        data-testid="accept-theirs-btn"
      >
        Accept Theirs
      </button>
      <button
        onClick={onAcceptBoth}
        className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-kommit-bg-tertiary text-[var(--color-text)]"
        data-testid="accept-both-btn"
      >
        Accept Both
      </button>
    </div>
  )
}

// ============================================================
// ConflictPane — read-only content pane (ours/base/theirs)
// ============================================================

interface ConflictPaneProps {
  label: string
  content: string
}

function ConflictPane({ label, content }: ConflictPaneProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden border-r last:border-r-0 border-[var(--color-border)]">
      <div className="px-3 py-1 bg-kommit-bg-secondary border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text)]">
        {label}
      </div>
      <pre
        className="flex-1 overflow-auto text-xs font-mono p-2 text-[var(--color-text)] bg-kommit-bg whitespace-pre"
        data-testid={`conflict-pane-${label.toLowerCase()}`}
      >
        {content}
      </pre>
    </div>
  )
}
