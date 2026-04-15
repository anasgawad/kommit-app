// ============================================================
// Kommit — Sidebar Component
// Branch list with checkout/context-menu, Tags section, changes summary
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import { useGraphStore } from '../../stores/graph-store'
import type { Branch, Tag } from '@shared/types'

type BranchContextMenu = {
  branch: Branch
  x: number
  y: number
}

type TagContextMenu = {
  tag: Tag
  x: number
  y: number
}

type BranchAction = 'checkout' | 'create' | 'rename' | 'delete' | 'merge'

export function Sidebar() {
  const { activeRepo, status, openRepo, refreshStatus } = useRepoStore()
  const { loadCommits, scrollToCommit } = useGraphStore()
  const [branches, setBranches] = useState<Branch[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [expandBranches, setExpandBranches] = useState(true)
  const [expandRemotes, setExpandRemotes] = useState(false)
  const [expandTags, setExpandTags] = useState(false)
  const [contextMenu, setContextMenu] = useState<BranchContextMenu | null>(null)
  const [tagContextMenu, setTagContextMenu] = useState<TagContextMenu | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ branch: Branch; newName: string } | null>(null)
  const [createName, setCreateName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [createTagName, setCreateTagName] = useState('')
  const [createTagMessage, setCreateTagMessage] = useState('')
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const tagContextMenuRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    if (!activeRepo) return
    try {
      const [b, t] = await Promise.all([
        window.api.git.branches(activeRepo.path),
        window.api.git.tags(activeRepo.path)
      ])
      setBranches(b)
      setTags(t)
    } catch {
      // Silently handle
    }
  }

  useEffect(() => {
    loadData()
  }, [activeRepo, status])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // Close tag context menu on outside click
  useEffect(() => {
    if (!tagContextMenu) return
    const handler = (e: MouseEvent) => {
      if (tagContextMenuRef.current && !tagContextMenuRef.current.contains(e.target as Node)) {
        setTagContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tagContextMenu])

  const localBranches = branches.filter((b) => !b.isRemote)
  const remoteBranches = branches.filter((b) => b.isRemote)

  const handleSwitchRepo = async () => {
    const path = await window.api.dialog.openDirectory()
    if (path) await openRepo(path)
  }

  const handleBranchDoubleClick = async (branch: Branch) => {
    if (!activeRepo || branch.isCurrent) return
    try {
      await window.api.git.checkout(activeRepo.path, branch.name)
      await refreshStatus()
      await loadData()
      await loadCommits()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Checkout failed')
    }
  }

  const handleBranchContextMenu = (e: React.MouseEvent, branch: Branch) => {
    e.preventDefault()
    setContextMenu({ branch, x: e.clientX, y: e.clientY })
    setActionError(null)
  }

  const handleContextAction = async (action: BranchAction) => {
    if (!activeRepo || !contextMenu) return
    const { branch } = contextMenu
    setContextMenu(null)

    try {
      switch (action) {
        case 'checkout':
          await window.api.git.checkout(activeRepo.path, branch.name)
          break
        case 'delete': {
          if (!window.confirm(`Delete branch "${branch.name}"?`)) return
          try {
            await window.api.git.deleteBranch(activeRepo.path, branch.name, false)
          } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            if (msg.includes('not fully merged')) {
              if (
                !window.confirm(
                  `"${branch.name}" has unmerged commits.\n\nForce delete anyway? This cannot be undone.`
                )
              )
                return
              await window.api.git.deleteBranch(activeRepo.path, branch.name, true)
            } else {
              throw err
            }
          }
          break
        }
        case 'merge':
          await window.api.git.merge(activeRepo.path, branch.name)
          break
        case 'rename':
          setRenameTarget({ branch, newName: branch.name })
          return
        case 'create':
          setShowCreate(true)
          return
      }
      await refreshStatus()
      await loadData()
      await loadCommits()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `${action} failed`)
    }
  }

  const handleRenameSubmit = async () => {
    if (!activeRepo || !renameTarget || !renameTarget.newName.trim()) return
    try {
      await window.api.git.renameBranch(
        activeRepo.path,
        renameTarget.branch.name,
        renameTarget.newName.trim()
      )
      await loadData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setRenameTarget(null)
    }
  }

  const handleCreateSubmit = async () => {
    if (!activeRepo || !createName.trim()) return
    try {
      await window.api.git.createBranch(activeRepo.path, createName.trim())
      setCreateName('')
      setShowCreate(false)
      await loadData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  const handleTagClick = (tag: Tag) => {
    if (tag.hash) scrollToCommit(tag.hash)
  }

  const handleTagContextMenu = (e: React.MouseEvent, tag: Tag) => {
    e.preventDefault()
    setTagContextMenu({ tag, x: e.clientX, y: e.clientY })
    setActionError(null)
  }

  const handleDeleteTag = async () => {
    if (!activeRepo || !tagContextMenu) return
    const { tag } = tagContextMenu
    setTagContextMenu(null)
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return
    try {
      await window.api.git.deleteTag(activeRepo.path, tag.name)
      await loadData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete tag failed')
    }
  }

  const handleCreateTagSubmit = async () => {
    if (!activeRepo || !createTagName.trim()) return
    try {
      const options = createTagMessage.trim() ? { message: createTagMessage.trim() } : undefined
      await window.api.git.createTag(activeRepo.path, createTagName.trim(), options)
      setCreateTagName('')
      setCreateTagMessage('')
      setShowCreateTag(false)
      await loadData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Create tag failed')
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
        {status && <div className="text-xs text-kommit-text-secondary mt-1">{status.branch}</div>}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error banner */}
        {actionError && (
          <div
            className="text-xs text-red-400 px-2 py-1 bg-red-900/20 cursor-pointer"
            onClick={() => setActionError(null)}
            title="Click to dismiss"
          >
            {actionError}
          </div>
        )}

        {/* Local Branches */}
        <div className="p-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandBranches(!expandBranches)}
              className="flex items-center gap-1 text-xs font-medium text-kommit-text-secondary uppercase tracking-wider py-1 hover:text-kommit-text"
            >
              <span className="text-[10px]">{expandBranches ? '▼' : '▶'}</span>
              Branches ({localBranches.length})
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-kommit-text-secondary hover:text-kommit-accent px-1"
              title="New branch"
            >
              +
            </button>
          </div>

          {/* Create branch inline */}
          {showCreate && (
            <div className="flex gap-1 mt-1">
              <input
                autoFocus
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubmit()
                  if (e.key === 'Escape') {
                    setShowCreate(false)
                    setCreateName('')
                  }
                }}
                placeholder="Branch name"
                className="flex-1 px-1 py-0.5 text-xs rounded border border-kommit-border bg-kommit-bg-tertiary text-kommit-text outline-none"
              />
              <button onClick={handleCreateSubmit} className="text-xs text-kommit-accent">
                ✓
              </button>
            </div>
          )}

          {expandBranches && (
            <div className="mt-1 space-y-0.5">
              {localBranches.map((branch) => {
                const isRenaming = renameTarget?.branch.name === branch.name

                return (
                  <div key={branch.name}>
                    {isRenaming ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={renameTarget.newName}
                          onChange={(e) =>
                            setRenameTarget({ ...renameTarget, newName: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit()
                            if (e.key === 'Escape') setRenameTarget(null)
                          }}
                          className="flex-1 px-1 py-0.5 text-xs rounded border border-kommit-border bg-kommit-bg-tertiary text-kommit-text outline-none"
                        />
                        <button onClick={handleRenameSubmit} className="text-xs text-kommit-accent">
                          ✓
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`text-sm px-2 py-1 rounded cursor-pointer truncate ${
                          branch.isCurrent
                            ? 'bg-kommit-accent/10 text-kommit-accent'
                            : 'text-kommit-text hover:bg-kommit-bg-tertiary'
                        }`}
                        title={`${branch.name}${branch.lastCommitSubject ? ` — ${branch.lastCommitSubject}` : ''}\nDouble-click to checkout`}
                        onDoubleClick={() => handleBranchDoubleClick(branch)}
                        onContextMenu={(e) => handleBranchContextMenu(e, branch)}
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
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Remote branches */}
        {remoteBranches.length > 0 && (
          <div className="p-2 pt-0">
            <button
              onClick={() => setExpandRemotes(!expandRemotes)}
              className="flex items-center gap-1 text-xs font-medium text-kommit-text-secondary uppercase tracking-wider py-1 hover:text-kommit-text"
            >
              <span className="text-[10px]">{expandRemotes ? '▼' : '▶'}</span>
              Remote ({remoteBranches.length})
            </button>
            {expandRemotes && (
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
            )}
          </div>
        )}

        {/* Tags */}
        <div className="p-2 pt-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandTags(!expandTags)}
              className="flex items-center gap-1 text-xs font-medium text-kommit-text-secondary uppercase tracking-wider py-1 hover:text-kommit-text"
            >
              <span className="text-[10px]">{expandTags ? '▼' : '▶'}</span>
              Tags ({tags.length})
            </button>
            <button
              onClick={() => setShowCreateTag(true)}
              className="text-xs text-kommit-text-secondary hover:text-kommit-accent px-1"
              title="New tag"
            >
              +
            </button>
          </div>

          {/* Create tag inline form */}
          {showCreateTag && (
            <div className="mt-1 space-y-1">
              <input
                autoFocus
                type="text"
                value={createTagName}
                onChange={(e) => setCreateTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTagSubmit()
                  if (e.key === 'Escape') {
                    setShowCreateTag(false)
                    setCreateTagName('')
                    setCreateTagMessage('')
                  }
                }}
                placeholder="Tag name"
                className="w-full px-1 py-0.5 text-xs rounded border border-kommit-border bg-kommit-bg-tertiary text-kommit-text outline-none"
              />
              <div className="flex gap-1">
                <input
                  type="text"
                  value={createTagMessage}
                  onChange={(e) => setCreateTagMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTagSubmit()
                    if (e.key === 'Escape') {
                      setShowCreateTag(false)
                      setCreateTagName('')
                      setCreateTagMessage('')
                    }
                  }}
                  placeholder="Message (optional — annotated)"
                  className="flex-1 px-1 py-0.5 text-xs rounded border border-kommit-border bg-kommit-bg-tertiary text-kommit-text outline-none"
                />
                <button onClick={handleCreateTagSubmit} className="text-xs text-kommit-accent">
                  ✓
                </button>
              </div>
            </div>
          )}

          {expandTags && (
            <div className="mt-1 space-y-0.5">
              {tags.length === 0 ? (
                <div className="text-xs text-kommit-text-secondary px-2 py-1">No tags</div>
              ) : (
                tags.map((tag) => {
                  const shortHash = tag.hash.slice(0, 7)
                  const shortMessage =
                    tag.message && tag.message.length > 40
                      ? tag.message.slice(0, 40) + '…'
                      : tag.message
                  return (
                    <div
                      key={tag.name}
                      className="px-2 py-1 rounded text-kommit-text hover:bg-kommit-bg-tertiary cursor-pointer"
                      title={`${tag.name}${tag.message ? ` — ${tag.message}` : ''}\n${tag.isAnnotated ? 'Annotated tag' : 'Lightweight tag'}\nClick to jump to commit\nRight-click for options`}
                      onClick={() => handleTagClick(tag)}
                      onContextMenu={(e) => handleTagContextMenu(e, tag)}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs text-kommit-text-secondary shrink-0">
                          {tag.isAnnotated ? '⊕' : '○'}
                        </span>
                        <span className="text-sm truncate">{tag.name}</span>
                        <span className="text-xs text-kommit-text-secondary font-mono shrink-0">
                          {shortHash}
                        </span>
                        {tag.isAnnotated && (
                          <span className="text-[10px] text-kommit-accent shrink-0 border border-kommit-accent/40 rounded px-0.5">
                            A
                          </span>
                        )}
                      </div>
                      {shortMessage && (
                        <div className="text-xs text-kommit-text-secondary mt-0.5 truncate pl-4">
                          {shortMessage}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Changes summary */}
      {status && !status.isClean && (
        <div className="p-3 border-t border-kommit-border">
          <div className="text-xs font-medium text-kommit-text-secondary uppercase tracking-wider mb-1">
            Changes
          </div>
          <div className="text-xs space-y-0.5">
            {status.conflicted.length > 0 && (
              <div className="text-kommit-danger font-medium">
                ✖ {status.conflicted.length} conflicted
              </div>
            )}
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

      {/* Branch context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-kommit-bg-secondary border border-kommit-border rounded shadow-lg py-1 min-w-36 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {!contextMenu.branch.isCurrent && (
            <button
              className="w-full text-left px-3 py-1 hover:bg-kommit-bg-tertiary text-kommit-text"
              onClick={() => handleContextAction('checkout')}
            >
              Checkout
            </button>
          )}
          <button
            className="w-full text-left px-3 py-1 hover:bg-kommit-bg-tertiary text-kommit-text"
            onClick={() => handleContextAction('merge')}
          >
            Merge into current
          </button>
          <button
            className="w-full text-left px-3 py-1 hover:bg-kommit-bg-tertiary text-kommit-text"
            onClick={() => handleContextAction('rename')}
          >
            Rename…
          </button>
          {!contextMenu.branch.isCurrent && (
            <button
              className="w-full text-left px-3 py-1 hover:bg-kommit-bg-tertiary text-red-400"
              onClick={() => handleContextAction('delete')}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Tag context menu */}
      {tagContextMenu && (
        <div
          ref={tagContextMenuRef}
          className="fixed z-50 bg-kommit-bg-secondary border border-kommit-border rounded shadow-lg py-1 min-w-36 text-sm"
          style={{ left: tagContextMenu.x, top: tagContextMenu.y }}
        >
          <button
            className="w-full text-left px-3 py-1 hover:bg-kommit-bg-tertiary text-red-400"
            onClick={handleDeleteTag}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
