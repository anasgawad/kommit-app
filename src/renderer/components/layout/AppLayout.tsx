// ============================================================
// Kommit — Main App Layout
// Three-panel layout: Sidebar | Graph/Content | Detail Panel
// ============================================================

import { useEffect } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import { useGraphStore } from '../../stores/graph-store'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { CommitGraph } from '../graph/CommitGraph'
import { CommitDetail } from '../commits/CommitDetail'

export function AppLayout() {
  const { activeRepo } = useRepoStore()
  const { setRepoPath, selectedCommitHash } = useGraphStore()

  // Update graph store when active repo changes
  useEffect(() => {
    if (activeRepo) {
      setRepoPath(activeRepo.path)
    } else {
      setRepoPath(null)
    }
  }, [activeRepo, setRepoPath])

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
        {/* Sidebar */}
        <Sidebar />

        {/* Commit graph */}
        <CommitGraph />

        {/* Commit detail panel (conditionally rendered) */}
        {selectedCommitHash && <CommitDetail />}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
