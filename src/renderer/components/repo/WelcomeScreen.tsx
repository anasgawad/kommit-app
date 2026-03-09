// ============================================================
// Kommit — Welcome Screen
// Shown when no repository is open
// ============================================================

import { useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import type { RepoInfo } from '@shared/types'

export function WelcomeScreen() {
  const { recentRepos, openRepo, isLoading, error } = useRepoStore()
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneTarget, setCloneTarget] = useState('')
  const [showCloneForm, setShowCloneForm] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  const handleOpenRepo = async () => {
    const path = await window.api.dialog.openDirectory()
    if (path) {
      await openRepo(path)
    }
  }

  const handleInitRepo = async () => {
    const path = await window.api.dialog.openDirectory()
    if (path) {
      try {
        await window.api.repo.init(path)
        await openRepo(path)
      } catch {
        // Error handled by store
      }
    }
  }

  const handleClone = async () => {
    if (!cloneUrl.trim() || !cloneTarget.trim()) return

    setIsCloning(true)
    setCloneError(null)

    try {
      const clonedRepoPath = await window.api.repo.clone(cloneUrl.trim(), cloneTarget.trim())
      await openRepo(clonedRepoPath)
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Clone failed')
    } finally {
      setIsCloning(false)
    }
  }

  const handleSelectCloneTarget = async () => {
    const path = await window.api.dialog.openDirectory()
    if (path) {
      setCloneTarget(path)
    }
  }

  const handleSelectRecent = (repo: RepoInfo) => {
    openRepo(repo.path)
  }

  return (
    <div className="h-full flex items-center justify-center bg-kommit-bg">
      <div className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-kommit-text mb-2">Kommit</h1>
          <p className="text-kommit-text-secondary">
            A powerful Git GUI for experienced developers
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-kommit-danger text-kommit-danger text-sm">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleOpenRepo}
            disabled={isLoading}
            className="p-4 rounded-lg bg-kommit-bg-tertiary border border-kommit-border hover:border-kommit-accent transition-colors text-center disabled:opacity-50"
          >
            <div className="text-2xl mb-2">&#128194;</div>
            <div className="text-sm font-medium text-kommit-text">Open Repository</div>
          </button>

          <button
            onClick={() => setShowCloneForm(!showCloneForm)}
            disabled={isLoading}
            className="p-4 rounded-lg bg-kommit-bg-tertiary border border-kommit-border hover:border-kommit-accent transition-colors text-center disabled:opacity-50"
          >
            <div className="text-2xl mb-2">&#128229;</div>
            <div className="text-sm font-medium text-kommit-text">Clone Repository</div>
          </button>

          <button
            onClick={handleInitRepo}
            disabled={isLoading}
            className="p-4 rounded-lg bg-kommit-bg-tertiary border border-kommit-border hover:border-kommit-accent transition-colors text-center disabled:opacity-50"
          >
            <div className="text-2xl mb-2">&#10010;</div>
            <div className="text-sm font-medium text-kommit-text">Init Repository</div>
          </button>
        </div>

        {/* Clone form */}
        {showCloneForm && (
          <div className="mb-8 p-4 rounded-lg bg-kommit-bg-secondary border border-kommit-border">
            <h3 className="text-sm font-medium text-kommit-text mb-3">Clone Repository</h3>

            <input
              type="text"
              placeholder="Repository URL (https or ssh)"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full mb-2 p-2 rounded bg-kommit-bg-tertiary border border-kommit-border text-kommit-text text-sm placeholder-kommit-text-secondary focus:border-kommit-accent focus:outline-none"
            />

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Target directory"
                value={cloneTarget}
                onChange={(e) => setCloneTarget(e.target.value)}
                className="flex-1 p-2 rounded bg-kommit-bg-tertiary border border-kommit-border text-kommit-text text-sm placeholder-kommit-text-secondary focus:border-kommit-accent focus:outline-none"
              />
              <button
                onClick={handleSelectCloneTarget}
                className="px-3 py-2 rounded bg-kommit-bg-tertiary border border-kommit-border text-kommit-text-secondary text-sm hover:border-kommit-accent"
              >
                Browse
              </button>
            </div>

            {cloneError && <div className="mb-2 text-sm text-kommit-danger">{cloneError}</div>}

            <button
              onClick={handleClone}
              disabled={isCloning || !cloneUrl.trim() || !cloneTarget.trim()}
              className="w-full p-2 rounded bg-kommit-accent text-kommit-bg font-medium text-sm hover:bg-kommit-accent-hover disabled:opacity-50 transition-colors"
            >
              {isCloning ? 'Cloning...' : 'Clone'}
            </button>
          </div>
        )}

        {/* Recent repositories */}
        {recentRepos.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-kommit-text-secondary mb-3 uppercase tracking-wider">
              Recent Repositories
            </h2>
            <div className="space-y-1">
              {recentRepos.map((repo) => (
                <button
                  key={repo.path}
                  onClick={() => handleSelectRecent(repo)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-lg hover:bg-kommit-bg-tertiary transition-colors group disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-kommit-text group-hover:text-kommit-accent">
                    {repo.name}
                  </div>
                  <div className="text-xs text-kommit-text-secondary truncate">{repo.path}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
