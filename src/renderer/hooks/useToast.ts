// ============================================================
// Kommit — useToast Convenience Hook
// ============================================================

import { useToastStore } from '../stores/toast-store'

const DEFAULT_DURATION = 6000

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)

  return {
    error: (title: string, message?: string, duration = DEFAULT_DURATION) =>
      addToast({ type: 'error', title, message, duration }),

    success: (title: string, message?: string, duration = DEFAULT_DURATION) =>
      addToast({ type: 'success', title, message, duration }),

    warning: (title: string, message?: string, duration = DEFAULT_DURATION) =>
      addToast({ type: 'warning', title, message, duration }),

    info: (title: string, message?: string, duration = DEFAULT_DURATION) =>
      addToast({ type: 'info', title, message, duration })
  }
}
