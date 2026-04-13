// ============================================================
// Kommit — WorkingTree Component
// Displays staged, unstaged, and untracked files with staging actions
// ============================================================

import { useState } from 'react'
import type { FileStatus, GitStatus } from '@shared/types'
import { useChangesStore } from '../../stores/changes-store'

// ============================================================
// DiscardConfirmDialog — modal shown before destructive discard
// ============================================================

interface DiscardConfirmDialogProps {
  filePath: string
  isConflicted?: boolean
  isUntracked?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DiscardConfirmDialog({
  filePath,
  isConflicted,
  isUntracked,
  onConfirm,
  onCancel
}: DiscardConfirmDialogProps) {
  const title = isConflicted
    ? 'Discard conflict resolution?'
    : isUntracked
      ? 'Delete untracked file?'
      : 'Discard changes?'

  const body = isConflicted ? (
    <>
      Conflict resolution in <span className="font-mono text-[var(--color-text)]">{filePath}</span>{' '}
      will be discarded and the file will be restored to HEAD.
    </>
  ) : isUntracked ? (
    <>
      <span className="font-mono text-[var(--color-text)]">{filePath}</span> is untracked and will
      be permanently deleted from disk.
    </>
  ) : (
    <>
      Changes to <span className="font-mono text-[var(--color-text)]">{filePath}</span> will be
      permanently lost.
    </>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl p-5 w-80 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</p>
          <p className="text-xs text-[var(--color-text-muted)] break-all">{body}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
          >
            {isUntracked ? 'Delete' : 'Discard'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface WorkingTreeProps {
  repoPath: string
  status: GitStatus
  onRefresh: () => void
}

function statusLabel(file: FileStatus): string {
  if (file.isConflicted) return '!'
  const code = file.isStaged ? file.indexStatus : file.workTreeStatus
  switch (code) {
    case 'A':
      return 'A'
    case 'M':
      return 'M'
    case 'D':
      return 'D'
    case 'R':
      return 'R'
    case '?':
      return '?'
    default:
      return String(code)
  }
}

function statusColor(file: FileStatus): string {
  if (file.isConflicted) return 'text-red-400'
  const code = file.isStaged ? file.indexStatus : file.workTreeStatus
  switch (code) {
    case 'A':
      return 'text-green-400'
    case 'M':
      return 'text-yellow-400'
    case 'D':
      return 'text-red-400'
    case 'R':
      return 'text-blue-400'
    case '?':
      return 'text-gray-400'
    default:
      return 'text-gray-400'
  }
}

interface FileSectionProps {
  title: string
  files: FileStatus[]
  isStaged: boolean
  repoPath: string
  onRefresh: () => void
}

function FileSection({ title, files, isStaged, repoPath, onRefresh }: FileSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [pendingDiscard, setPendingDiscard] = useState<FileStatus | null>(null)
  const {
    selectedFile,
    selectedIsStaged,
    setSelectedFile,
    loadDiff,
    stageFile,
    unstageFile,
    discardFile,
    stageAll,
    unstageAll
  } = useChangesStore()

  if (files.length === 0) return null

  const handleFileClick = async (file: FileStatus) => {
    setSelectedFile(file, isStaged)
    await loadDiff(repoPath, file, isStaged)
  }

  const handleStageAll = async () => {
    if (isStaged) {
      await unstageAll(repoPath, files)
    } else {
      await stageAll(repoPath, files)
    }
    onRefresh()
  }

  const handleFileAction = async (e: React.MouseEvent, file: FileStatus) => {
    e.stopPropagation()
    if (isStaged) {
      await unstageFile(repoPath, file.path)
    } else {
      await stageFile(repoPath, file.path)
    }
    onRefresh()
  }

  const handleDiscard = (e: React.MouseEvent, file: FileStatus) => {
    e.stopPropagation()
    if (!isStaged) {
      setPendingDiscard(file)
    }
  }

  const confirmDiscard = async () => {
    if (!pendingDiscard) return
    await discardFile(repoPath, pendingDiscard.path)
    setPendingDiscard(null)
    onRefresh()
  }

  const cancelDiscard = () => setPendingDiscard(null)

  return (
    <div className="mb-1">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-hover)] select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-1">
          <span className="w-3 text-center">{collapsed ? '▶' : '▼'}</span>
          <span>{title}</span>
          <span className="ml-1 text-[var(--color-text-muted)]">({files.length})</span>
        </div>
        <button
          className="px-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
          onClick={(e) => {
            e.stopPropagation()
            handleStageAll()
          }}
          title={isStaged ? 'Unstage all' : 'Stage all'}
        >
          {isStaged ? '−' : '+'}
        </button>
      </div>

      {/* File list */}
      {!collapsed && (
        <div>
          {files.map((file) => {
            const isSelected = selectedFile?.path === file.path && selectedIsStaged === isStaged
            return (
              <div
                key={`${isStaged ? 'staged' : 'unstaged'}-${file.path}`}
                className={`group flex items-center gap-1 px-3 py-0.5 cursor-pointer select-none text-xs ${
                  isSelected
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text)]'
                }`}
                onClick={() => handleFileClick(file)}
              >
                {/* Status badge */}
                <span className={`w-3 font-bold ${isSelected ? 'text-white' : statusColor(file)}`}>
                  {statusLabel(file)}
                </span>

                {/* File path */}
                <span className="flex-1 truncate">
                  {file.originalPath ? `${file.originalPath} → ${file.path}` : file.path}
                </span>

                {/* Action buttons (visible on hover) */}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    className="px-1 rounded hover:bg-white/20"
                    onClick={(e) => handleFileAction(e, file)}
                    title={isStaged ? 'Unstage' : 'Stage'}
                  >
                    {isStaged ? '−' : '+'}
                  </button>
                  {!isStaged && (
                    <button
                      className="px-1 rounded hover:bg-white/20 text-red-400"
                      onClick={(e) => handleDiscard(e, file)}
                      title="Discard changes"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Discard confirmation dialog */}
      {pendingDiscard && (
        <DiscardConfirmDialog
          filePath={pendingDiscard.path}
          isConflicted={pendingDiscard.isConflicted}
          isUntracked={pendingDiscard.workTreeStatus === '?'}
          onConfirm={confirmDiscard}
          onCancel={cancelDiscard}
        />
      )}
    </div>
  )
}

export function WorkingTree({ repoPath, status, onRefresh }: WorkingTreeProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <FileSection
          title="Staged Changes"
          files={status.staged}
          isStaged={true}
          repoPath={repoPath}
          onRefresh={onRefresh}
        />
        <FileSection
          title="Unstaged Changes"
          files={status.unstaged}
          isStaged={false}
          repoPath={repoPath}
          onRefresh={onRefresh}
        />
        <FileSection
          title="Untracked Files"
          files={status.untracked}
          isStaged={false}
          repoPath={repoPath}
          onRefresh={onRefresh}
        />
        {status.conflicted.length > 0 && (
          <FileSection
            title="Conflicted"
            files={status.conflicted}
            isStaged={false}
            repoPath={repoPath}
            onRefresh={onRefresh}
          />
        )}
        {status.isClean && (
          <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
            Working tree clean
          </div>
        )}
      </div>
    </div>
  )
}
