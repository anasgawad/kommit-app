import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { useRepoStore } from './stores/repo-store'

// Expose test helper — allows E2E tests to open a repository
// without going through the native file-picker dialog
;(window as Window & { __openRepo?: (path: string) => Promise<void> }).__openRepo = (
  path: string
) => useRepoStore.getState().openRepo(path)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
