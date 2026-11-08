import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { CompressView } from './pages/CompressView'
import { ExtractView } from './pages/ExtractView'
import { preferences, resolveTheme } from './utils/preferences'

function App() {
  useEffect(() => {
    const theme = resolveTheme(preferences.theme)
    document.documentElement.setAttribute('data-theme', theme)
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
