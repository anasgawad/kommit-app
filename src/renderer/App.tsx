// ============================================================
// Kommit — Main App Component
// ============================================================

import { useEffect } from 'react'
import { useRepoStore } from './stores/repo-store'
import { WelcomeScreen } from './components/repo/WelcomeScreen'
import { AppLayout } from './components/layout/AppLayout'
import { ToastContainer } from './components/layout/ToastContainer'

function App() {
  const { activeRepo, loadRecentRepos } = useRepoStore()

  useEffect(() => {
    loadRecentRepos()
  }, [loadRecentRepos])

  return (
    <>
      {!activeRepo ? <WelcomeScreen /> : <AppLayout />}
      <ToastContainer />
    </>
  )
}

export default App
