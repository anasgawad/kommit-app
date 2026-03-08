// ============================================================
// Kommit — Status Bar Component
// Bottom bar showing repo status, branch, and indicators
// ============================================================

import { useRepoStore } from '../../stores/repo-store'

export function StatusBar() {
  const { activeRepo, status, isLoading, error } = useRepoStore()

  return (
    <div className="h-6 bg-kommit-bg-secondary border-t border-kommit-border flex items-center px-3 text-xs text-kommit-text-secondary">
      {/* Left side */}
      <div className="flex items-center gap-3 flex-1">
        {isLoading && <span className="text-kommit-accent">Loading...</span>}

        {error && <span className="text-kommit-danger truncate max-w-md">{error}</span>}

        {status && !error && (
          <>
            <span className="text-kommit-accent">{status.branch}</span>

            {status.tracking && (
              <span>
                {status.tracking.ahead > 0 && (
                  <span className="text-kommit-success mr-1">{'\u2191'}{status.tracking.ahead}</span>
                )}
                {status.tracking.behind > 0 && (
                  <span className="text-kommit-danger">{'\u2193'}{status.tracking.behind}</span>
                )}
              </span>
            )}

            {status.isClean ? (
              <span className="text-kommit-success">{'\u2713'} Clean</span>
            ) : (
              <span>
                {status.staged.length > 0 && (
                  <span className="text-kommit-success mr-1">+{status.staged.length}</span>
                )}
                {status.unstaged.length > 0 && (
                  <span className="text-kommit-warning mr-1">~{status.unstaged.length}</span>
                )}
                {status.untracked.length > 0 && (
                  <span className="text-kommit-text-secondary">?{status.untracked.length}</span>
                )}
              </span>
            )}
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {activeRepo && (
          <span className="truncate max-w-xs" title={activeRepo.path}>
            {activeRepo.path}
          </span>
        )}
        <span>Kommit v0.1.0</span>
      </div>
    </div>
  )
}
