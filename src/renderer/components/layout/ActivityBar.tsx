// ============================================================
// Kommit — Activity Bar
// VS Code-style left icon strip for primary navigation actions
// ============================================================

import type { ReactNode } from 'react'
import { useRepoStore } from '../../stores/repo-store'

interface ActivityBarProps {
  onRefresh: () => void
}

export function ActivityBar({ onRefresh }: ActivityBarProps) {
  const { activeRepo, closeRepo } = useRepoStore()
  const isRepoOpen = activeRepo !== null

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

      {/* Commit History — active view indicator */}
      <ActivityBarButton
        title="Commit History"
        onClick={() => {}}
        active={isRepoOpen}
        disabled={!isRepoOpen}
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
    </div>
  )
}

interface ActivityBarButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}

function ActivityBarButton({
  title,
  onClick,
  disabled = false,
  active = false,
  children
}: ActivityBarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
