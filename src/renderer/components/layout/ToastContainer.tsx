// ============================================================
// Kommit — Toast Notification Container
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useToastStore, type Toast, type ToastType } from '../../stores/toast-store'

// ── per-type visual config ──────────────────────────────────
const CONFIG: Record<
  ToastType,
  { border: string; icon: string; iconColor: string; titleColor: string }
> = {
  error: {
    border: 'border-l-red-500',
    icon: '✕',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300'
  },
  success: {
    border: 'border-l-emerald-500',
    icon: '✓',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300'
  },
  warning: {
    border: 'border-l-amber-500',
    icon: '⚠',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300'
  },
  info: {
    border: 'border-l-blue-500',
    icon: 'i',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300'
  }
}

// ── single toast item ───────────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfg = CONFIG[toast.type]

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(), toast.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, toast.duration])

  const dismiss = () => {
    setVisible(false)
    // Wait for slide-out animation then remove
    setTimeout(() => removeToast(toast.id), 300)
  }

  return (
    <div
      className={[
        'flex items-start gap-3 w-80 rounded-lg shadow-2xl',
        'bg-kommit-bg-secondary border border-kommit-border border-l-4',
        cfg.border,
        'px-4 py-3 transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      ].join(' ')}
      role="alert"
    >
      {/* Type icon */}
      <span
        className={[
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          'text-[10px] font-bold mt-0.5',
          cfg.iconColor,
          'border border-current'
        ].join(' ')}
      >
        {cfg.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight ${cfg.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-kommit-text-secondary mt-1 leading-snug break-words">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 mt-0.5 text-kommit-text-secondary hover:text-kommit-text transition-colors text-sm leading-none"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

// ── container ───────────────────────────────────────────────
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
