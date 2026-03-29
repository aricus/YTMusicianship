import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PlaylistPage from './pages/PlaylistPage'
import RankingsPage from './pages/RankingsPage'
import JobsPage from './pages/JobsPage'

function Nav() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link to="/" className="font-bold text-lg text-indigo-400 hover:text-indigo-300">YTMusicianship</Link>
        <div className="flex gap-4 text-sm">
          <Link to="/" className="hover:text-white text-gray-300">Dashboard</Link>
          <Link to="/rankings" className="hover:text-white text-gray-300">Rankings</Link>
          <Link to="/jobs" className="hover:text-white text-gray-300">Jobs</Link>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
