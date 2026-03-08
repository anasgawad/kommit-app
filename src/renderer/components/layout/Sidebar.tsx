// ============================================================
// Kommit — Sidebar Component
// Branch list, file changes, and navigation
// ============================================================

import { useEffect, useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import type { Branch } from '@shared/types'

export function Sidebar() {
  const { activeRepo, status, openRepo } = useRepoStore()
  const [branches, setBranches] = useState<Branch[]>([])
  const [expandBranches, setExpandBranches] = useState(true)

  useEffect(() => {
    if (!activeRepo) return

    const loadBranches = async () => {
      try {
        const b = await window.api.git.branches(activeRepo.path)
        setBranches(b)
      } catch {
        // Silently handle
      }
    }

    loadBranches()
  }, [activeRepo, status])

  const localBranches = branches.filter((b) => !b.isRemote)
  const remoteBranches = branches.filter((b) => b.isRemote)

  const handleSwitchRepo = async () => {
    const path = await window.api.dialog.openDirectory()
    if (path) {
      await openRepo(path)
    }
  }

  return (
    <div className="w-60 bg-kommit-bg-secondary border-r border-kommit-border flex flex-col overflow-hidden">
      {/* Repository name */}
      <div className="p-3 border-b border-kommit-border">
        <button
          onClick={handleSwitchRepo}
          className="w-full text-left text-sm font-medium text-kommit-text hover:text-kommit-accent transition-colors truncate"
          title={activeRepo?.path}
        >
          {activeRepo?.name ?? 'No repository'}
        </button>
        {status && (
          <div className="text-xs text-kommit-text-secondary mt-1">
            {status.branch}
          </div>
        )}
      </div>

      {/* Branches */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <button
            onClick={() => setExpandBranches(!expandBranches)}
            className="w-full flex items-center gap-1 text-xs font-medium text-kommit-text-secondary uppercase tracking-wider py-1 hover:text-kommit-text"
          >
            <span className="text-[10px]">{expandBranches ? '\u25BC' : '\u25B6'}</span>
            Branches ({localBranches.length})
          </button>

          {expandBranches && (
            <div className="mt-1 space-y-0.5">
              {localBranches.map((branch) => (
                <div
                  key={branch.name}
                  className={`text-sm px-2 py-1 rounded cursor-pointer truncate ${
                    branch.isCurrent
                      ? 'bg-kommit-accent/10 text-kommit-accent'
                      : 'text-kommit-text hover:bg-kommit-bg-tertiary'
                  }`}
                  title={branch.name}
                >
                  {branch.isCurrent && <span className="mr-1">*</span>}
                  {branch.name}
                  {branch.tracking && (
                    <span className="ml-1 text-xs text-kommit-text-secondary">
                      {branch.tracking.ahead > 0 && `+${branch.tracking.ahead}`}
                      {branch.tracking.behind > 0 && `-${branch.tracking.behind}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote branches */}
        {remoteBranches.length > 0 && (
          <div className="p-2 pt-0">
            <div className="text-xs font-medium text-kommit-text-secondary uppercase tracking-wider py-1">
              Remote ({remoteBranches.length})
            </div>
            <div className="mt-1 space-y-0.5">
              {remoteBranches.map((branch) => (
                <div
                  key={branch.name}
                  className="text-sm px-2 py-1 rounded text-kommit-text-secondary hover:bg-kommit-bg-tertiary cursor-pointer truncate"
                  title={branch.name}
                >
                  {branch.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Changes summary */}
      {status && !status.isClean && (
        <div className="p-3 border-t border-kommit-border">
          <div className="text-xs font-medium text-kommit-text-secondary uppercase tracking-wider mb-1">
            Changes
          </div>
          <div className="text-xs space-y-0.5">
            {status.staged.length > 0 && (
              <div className="text-kommit-success">{status.staged.length} staged</div>
            )}
            {status.unstaged.length > 0 && (
              <div className="text-kommit-warning">{status.unstaged.length} modified</div>
            )}
            {status.untracked.length > 0 && (
              <div className="text-kommit-text-secondary">{status.untracked.length} untracked</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
