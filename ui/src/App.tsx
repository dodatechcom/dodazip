import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { CompressView } from './pages/CompressView'
import { ExtractView } from './pages/ExtractView'
import { preferences, resolveTheme } from './utils/preferences'
import { safeOpenUrl } from './utils/tauriBridge'

function App() {
  useEffect(() => {
    const theme = resolveTheme(preferences.theme)
    document.documentElement.setAttribute('data-theme', theme)

    // Global F1 shortcut: Open official DodaZip documentation
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        safeOpenUrl('https://dodatech.com/docs/dodazip/')
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compress" element={<CompressView />} />
        <Route path="/extract" element={<ExtractView />} />
      </Routes>
    </Router>
  )
}

export default App
