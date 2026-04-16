// ============================================================
// Kommit — Window API Type Declarations
// ============================================================

import type { KommitAPI } from '../preload/index'

declare global {
  interface Window {
    api: KommitAPI
    /** E2E test helper: open a repository by path without a file dialog */
    __openRepo?: (path: string) => Promise<void>
  }
}
