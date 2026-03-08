// ============================================================
// Kommit — Main App Component
// ============================================================

import { useEffect } from 'react'
import { useRepoStore } from './stores/repo-store'
import { WelcomeScreen } from './components/repo/WelcomeScreen'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  const { activeRepo, loadRecentRepos } = useRepoStore()

  useEffect(() => {
    loadRecentRepos()
  }, [loadRecentRepos])

  if (!activeRepo) {
    return <WelcomeScreen />
  }

  return <AppLayout />
}

export default App
