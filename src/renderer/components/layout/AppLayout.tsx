// ============================================================
// Kommit — Main App Layout
// Three-panel layout: ActivityBar | Sidebar | Graph/Content | Detail Panel
// Supports History view (commit graph) and Changes view (working tree + diff)
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import { useGraphStore } from '../../stores/graph-store'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { CommitGraph } from '../graph/CommitGraph'
import { CommitDetail } from '../commits/CommitDetail'
import { WorkingTree } from '../commits/WorkingTree'
import { CommitForm } from '../commits/CommitForm'
import { DiffViewer } from '../diff/DiffViewer'

export type ActiveView = 'history' | 'changes'

export function AppLayout() {
  const { activeRepo, refreshStatus, status } = useRepoStore()
  const { setRepoPath, loadCommits, selectedCommitHash } = useGraphStore()
  const [activeView, setActiveView] = useState<ActiveView>('history')

  // Update graph store when active repo changes
  useEffect(() => {
    if (activeRepo) {
      setRepoPath(activeRepo.path)
    } else {
      setRepoPath(null)
    }
  }, [activeRepo, setRepoPath])

  // Refresh: reload status + commit graph
  const handleRefresh = useCallback(async () => {
    if (!activeRepo) return
    await refreshStatus()
    await loadCommits()
  }, [activeRepo, refreshStatus, loadCommits])

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

  return (
    <div className="h-full flex flex-col bg-kommit-bg">
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
        {/* Activity bar — passes view switch callback */}
        <ActivityBar
          onRefresh={handleRefresh}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        {/* Sidebar */}
        <Sidebar />

        {/* Main content — switches between History and Changes views */}
        {activeView === 'history' ? (
          <>
            {/* Commit graph */}
            <CommitGraph />

            {/* Commit detail panel (conditionally rendered) */}
            {selectedCommitHash && <CommitDetail />}
          </>
        ) : (
          /* Changes view: WorkingTree + DiffViewer + CommitForm */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Working tree file list + commit form */}
            <div className="w-64 flex flex-col border-r border-[var(--color-border)] overflow-hidden">
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
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
