// ============================================================
// Kommit — Activity Bar
// VS Code-style left icon strip for primary navigation actions
// ============================================================

import type { ReactNode } from 'react'
import { useRepoStore } from '../../stores/repo-store'
import type { ActiveView } from './AppLayout'

interface ActivityBarProps {
  onRefresh: () => void
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
}

export function ActivityBar({ onRefresh, activeView, onViewChange }: ActivityBarProps) {
  const { activeRepo, closeRepo, status } = useRepoStore()
  const isRepoOpen = activeRepo !== null

  // Count staged files for badge
  const stagedCount = status ? status.staged.length : 0

  return (
    <div className="w-10 bg-kommit-bg-secondary border-r border-kommit-border flex flex-col items-center py-1 gap-1 shrink-0">
      {/* Home — go back to Welcome Screen */}
      <ActivityBarButton title="Home (close repository)" onClick={closeRepo} disabled={!isRepoOpen}>
        {/* House icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2L1 8h2v6h4v-4h2v4h4V8h2L8 2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </ActivityBarButton>

      {/* Refresh — reload graph + status */}
      <ActivityBarButton title="Refresh (F5 / Ctrl+R)" onClick={onRefresh} disabled={!isRepoOpen}>
        {/* Circular arrow icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M12 2l.4 2.7L9.7 5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </ActivityBarButton>

      {/* Divider */}
      <div className="w-6 border-t border-kommit-border my-1" />

      {/* Commit History view */}
      <ActivityBarButton
        title="Commit History"
        onClick={() => onViewChange('history')}
        active={isRepoOpen && activeView === 'history'}
        disabled={!isRepoOpen}
        data-testid="activity-history"
      >
        {/* Clock/history icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M8 5v3.5l2 1.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ActivityBarButton>

      {/* Changes view — staged file count badge */}
      <div className="relative">
        <ActivityBarButton
          title="Changes (working tree & staging)"
          onClick={() => onViewChange('changes')}
          active={isRepoOpen && activeView === 'changes'}
          disabled={!isRepoOpen}
          data-testid="activity-changes"
        >
          {/* File-diff / pencil icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="1"
              width="9"
              height="12"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
            <path d="M5 5h5M5 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path
              d="M10.5 10.5l2-2 1.5 1.5-2 2-1.5.5.5-2z"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </ActivityBarButton>
        {/* Badge showing staged file count */}
        {isRepoOpen && stagedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-kommit-accent text-[9px] font-bold text-kommit-bg flex items-center justify-center leading-none pointer-events-none">
            {stagedCount > 99 ? '99+' : stagedCount}
          </span>
        )}
      </div>
    </div>
  )
}

interface ActivityBarButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  'data-testid'?: string
  children: ReactNode
}

function ActivityBarButton({
  title,
  onClick,
  disabled = false,
  active = false,
  'data-testid': dataTestId,
  children
}: ActivityBarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-testid={dataTestId}
      className={[
        'w-8 h-8 flex items-center justify-center rounded transition-colors',
        disabled
          ? 'text-kommit-text-secondary opacity-30 cursor-default'
          : active
            ? 'text-kommit-accent bg-kommit-accent/10 hover:bg-kommit-accent/20'
            : 'text-kommit-text-secondary hover:text-kommit-text hover:bg-kommit-bg-tertiary'
      ].join(' ')}
    >
      {children}
    </button>
  )
}
