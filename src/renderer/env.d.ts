// ============================================================
// Kommit — Window API Type Declarations
// ============================================================

import type { KommitAPI } from '../preload/index'

declare global {
  interface Window {
    api: KommitAPI
  }
}
