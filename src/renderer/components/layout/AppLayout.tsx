// ============================================================
// Kommit — Main App Layout
// Three-panel layout: Sidebar | Graph/Content | Detail Panel
// ============================================================

import { useRepoStore } from '../../stores/repo-store'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="h-full flex flex-col bg-kommit-bg">
      {/* Title bar area */}
      <div className="h-8 bg-kommit-bg-secondary border-b border-kommit-border flex items-center px-4 drag-region">
        <span className="text-xs font-medium text-kommit-text-secondary no-drag">Kommit</span>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main panel - placeholder for graph view (Phase 2) */}
        <div className="flex-1 flex flex-col">
          <MainPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}

function MainPanel() {
  const { activeRepo, status } = useRepoStore()

  return (
    <div className="flex-1 flex items-center justify-center text-kommit-text-secondary">
      <div className="text-center">
        <h2 className="text-lg font-medium text-kommit-text mb-2">
          {activeRepo?.name}
        </h2>
        {status && (
          <div className="space-y-1 text-sm">
            <p>
              Branch: <span className="text-kommit-accent">{status.branch}</span>
            </p>
            {status.isClean ? (
              <p className="text-kommit-success">Working tree clean</p>
            ) : (
              <div className="space-y-0.5">
                {status.staged.length > 0 && (
                  <p className="text-kommit-success">{status.staged.length} staged</p>
                )}
                {status.unstaged.length > 0 && (
                  <p className="text-kommit-warning">{status.unstaged.length} modified</p>
                )}
                {status.untracked.length > 0 && (
                  <p className="text-kommit-text-secondary">{status.untracked.length} untracked</p>
                )}
                {status.conflicted.length > 0 && (
                  <p className="text-kommit-danger">{status.conflicted.length} conflicted</p>
                )}
              </div>
            )}
            {status.tracking && (
              <p className="text-xs mt-2">
                {status.tracking.ahead > 0 && (
                  <span className="text-kommit-success mr-2">+{status.tracking.ahead} ahead</span>
                )}
                {status.tracking.behind > 0 && (
                  <span className="text-kommit-danger">-{status.tracking.behind} behind</span>
                )}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-kommit-text-secondary mt-4">
          Graph view coming in Phase 2
        </p>
      </div>
    </div>
  )
}
