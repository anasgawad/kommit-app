// ============================================================
// Kommit — Main App Layout
// Three-panel layout: ActivityBar | Sidebar | Graph/Content | Detail Panel
// Supports History view (commit graph) and Changes view (working tree + diff)
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import { useGraphStore } from '../../stores/graph-store'
import { useChangesStore } from '../../stores/changes-store'
import { useResize } from '../../hooks/useResize'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { ResizeHandle } from './ResizeHandle'
import { CommitGraph } from '../graph/CommitGraph'
import { CommitDetail } from '../commits/CommitDetail'
import { WorkingTree } from '../commits/WorkingTree'
import { CommitForm } from '../commits/CommitForm'
import { DiffViewer } from '../diff/DiffViewer'
import { StashPanel } from '../stash/StashPanel'
import { RebasePanel } from '../rebase/RebasePanel'
import { MergeConflictViewer } from '../merge/MergeConflictViewer'
import { useRebaseStore } from '../../stores/rebase-store'

export type ActiveView = 'history' | 'changes' | 'stash' | 'rebase' | 'conflicts'

export function AppLayout() {
  const { activeRepo, refreshStatus, status } = useRepoStore()
  const {
    setRepoPath,
    loadCommits,
    selectedCommitHash,
    selectedCommitFilePath,
    commitFileDiff,
    isCommitDiffLoading
  } = useGraphStore()
  const { selectedFile, selectedIsStaged, clearSelection } = useChangesStore()
  const { setBaseHash, setActions } = useRebaseStore()
  const [activeView, setActiveView] = useState<ActiveView>('history')

  // ── Panel resize state ───────────────────────────────────────
  const sidebar = useResize({ initialSize: 240, min: 160, max: 480 })
  const commitDetail = useResize({ initialSize: 384, min: 200, max: 600, reverse: true })
  const commitDiff = useResize({ initialSize: 480, min: 200, max: 900, reverse: true })
  const changesTree = useResize({ initialSize: 256, min: 160, max: 480 })

  // Update graph store when active repo changes
  useEffect(() => {
    if (activeRepo) {
      setRepoPath(activeRepo.path)
    } else {
      setRepoPath(null)
    }
  }, [activeRepo, setRepoPath])

  // Refresh: reload status + commit graph, then validate the diff selection
  const handleRefresh = useCallback(async () => {
    if (!activeRepo) return
    await refreshStatus()
    await loadCommits()

    // After refreshing, check if the selected file still exists in the new status.
    // If not (e.g. changes were pushed/committed externally), clear the stale diff.
    if (selectedFile) {
      const newStatus = useRepoStore.getState().status
      if (newStatus) {
        const allFiles = [
          ...newStatus.staged,
          ...newStatus.unstaged,
          ...newStatus.untracked,
          ...newStatus.conflicted
        ]
        const stillExists = allFiles.some(
          (f) => f.path === selectedFile.path && f.isStaged === selectedIsStaged
        )
        if (!stillExists) {
          clearSelection()
        }
      } else {
        clearSelection()
      }
    }
  }, [activeRepo, refreshStatus, loadCommits, selectedFile, selectedIsStaged, clearSelection])

  // Keyboard shortcuts: F5 and Ctrl+R trigger refresh
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeRepo) return
      const isF5 = e.key === 'F5'
      const isCtrlR = (e.ctrlKey || e.metaKey) && e.key === 'r'
      if (isF5 || isCtrlR) {
        e.preventDefault()
        handleRefresh()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeRepo, handleRefresh])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  const handleClose = () => window.api.window.close()

  const handleRebaseFromCommit = useCallback(
    (hash: string, commits: { hash: string; subject: string }[]) => {
      setBaseHash(hash)
      setActions(commits.map((c) => ({ action: 'pick', hash: c.hash, subject: c.subject })))
      setActiveView('rebase')
    },
    [setBaseHash, setActions]
  )

  return (
    // Suppress text selection while any resize handle is being dragged
    <div
      className="h-full flex flex-col bg-kommit-bg"
      style={{
        userSelect:
          sidebar.isDragging || commitDetail.isDragging || commitDiff.isDragging || changesTree.isDragging
            ? 'none'
            : undefined
      }}
    >
      {/* Title bar area */}
      <div className="h-8 bg-kommit-bg-secondary border-b border-kommit-border flex items-center px-4 drag-region">
        <div className="flex items-center gap-2 no-drag">
          <img src="/icon.svg" alt="Kommit" className="w-4 h-4" />
          <span className="text-xs font-medium text-kommit-text-secondary">Kommit</span>
        </div>

        {/* Window controls */}
        <div className="ml-auto flex items-center gap-1 no-drag">
          <button
            onClick={handleMinimize}
            className="window-control-btn hover:bg-kommit-bg-tertiary"
            title="Minimize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M 0 5 L 10 5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="window-control-btn hover:bg-kommit-bg-tertiary"
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect
                x="0"
                y="0"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="window-control-btn hover:bg-kommit-danger"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar — fixed, not resizable per spec */}
        <ActivityBar
          onRefresh={handleRefresh}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        {/* Sidebar + resize handle */}
        <Sidebar width={sidebar.size} />
        <ResizeHandle onMouseDown={sidebar.handleMouseDown} isDragging={sidebar.isDragging} />

        {/* Main content — switches between views */}
        {activeView === 'history' ? (
          <>
            {/* Commit graph — grows to fill remaining space */}
            <CommitGraph onRebaseFromCommit={handleRebaseFromCommit} />

            {/* Commit detail panel + resize handle + diff viewer */}
            {selectedCommitHash && (
              <>
                <ResizeHandle
                  onMouseDown={commitDetail.handleMouseDown}
                  isDragging={commitDetail.isDragging}
                />
                <CommitDetail width={commitDetail.size} />
                {activeRepo && selectedCommitFilePath && (
                  <>
                    <ResizeHandle
                      onMouseDown={commitDiff.handleMouseDown}
                      isDragging={commitDiff.isDragging}
                    />
                    <div
                      className="overflow-hidden border-l border-[var(--color-border)] shrink-0"
                      style={{ width: commitDiff.size }}
                    >
                      <DiffViewer
                        repoPath={activeRepo.path}
                        diff={commitFileDiff}
                        isLoading={isCommitDiffLoading}
                        emptyMessage="Select a file to view its diff"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : activeView === 'changes' ? (
          /* Changes view: WorkingTree + resize handle + DiffViewer + CommitForm */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Working tree file list + commit form */}
            <div
              className="flex flex-col border-r border-[var(--color-border)] overflow-hidden shrink-0"
              style={{ width: changesTree.size }}
            >
              <div className="flex-1 overflow-hidden">
                {activeRepo && status ? (
                  <WorkingTree
                    repoPath={activeRepo.path}
                    status={status}
                    onRefresh={handleRefresh}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
                    No repository
                  </div>
                )}
              </div>
              {activeRepo && <CommitForm repoPath={activeRepo.path} onCommit={handleRefresh} />}
            </div>

            <ResizeHandle
              onMouseDown={changesTree.handleMouseDown}
              isDragging={changesTree.isDragging}
            />

            {/* Right: Diff viewer */}
            <div className="flex-1 overflow-hidden">
              {activeRepo ? (
                <DiffViewer repoPath={activeRepo.path} allowHunkStage={true} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
                  No repository
                </div>
              )}
            </div>
          </div>
        ) : activeView === 'stash' ? (
          <div className="flex-1 overflow-hidden relative">
            {activeRepo ? (
              <StashPanel repoPath={activeRepo.path} onRefresh={handleRefresh} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
                No repository
              </div>
            )}
          </div>
        ) : activeView === 'rebase' ? (
          <div className="flex-1 overflow-hidden">
            {activeRepo ? (
              <RebasePanel repoPath={activeRepo.path} onRefresh={handleRefresh} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
                No repository
              </div>
            )}
          </div>
        ) : activeView === 'conflicts' ? (
          <div className="flex-1 overflow-hidden">
            {activeRepo ? (
              <MergeConflictViewer
                repoPath={activeRepo.path}
                onRefresh={handleRefresh}
                onGoToChanges={() => setActiveView('changes')}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
                No repository
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
