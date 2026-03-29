import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import PlaylistPage from './pages/PlaylistPage'
import RankingsPage from './pages/RankingsPage'
import JobsPage from './pages/JobsPage'
import SettingsPage from './pages/SettingsPage'
import MusicMatchPage from './pages/MusicMatchPage'

// Audio Wave Icon Component
function AudioWaveIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="wave-bar" />
      <path d="M8 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="wave-bar" style={{ animationDelay: '0.1s' }} />
      <path d="M16 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="wave-bar" style={{ animationDelay: '0.2s' }} />
      <path d="M4 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="wave-bar" style={{ animationDelay: '0.3s' }} />
      <path d="M20 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="wave-bar" style={{ animationDelay: '0.4s' }} />
    </svg>
  )
}

// Navigation Item Component
function NavItem({ to, children, icon }: { to: string; children: React.ReactNode; icon: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
        isActive
          ? 'text-white'
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {isActive && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20" />
      )}
      <span className={`relative ${isActive ? 'text-fuchsia-400' : 'group-hover:text-fuchsia-300'} transition-colors`}>
        {icon}
      </span>
      <span className="relative">{children}</span>
      {isActive && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
      )}
    </Link>
  )
}

// Navigation Icons
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function MusicMatchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function RankingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function JobsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                <AudioWaveIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">YTM</span>
                <span className="text-fuchsia-400">usicianship</span>
              </h1>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <NavItem to="/" icon={<DashboardIcon />}>Dashboard</NavItem>
            <NavItem to="/musicmatch" icon={<MusicMatchIcon />}>MusicMatch</NavItem>
            <NavItem to="/rankings" icon={<RankingsIcon />}>Rankings</NavItem>
            <NavItem to="/jobs" icon={<JobsIcon />}>Jobs</NavItem>
            <NavItem to="/settings" icon={<SettingsIcon />}>Settings</NavItem>
          </div>
        </div>
      </div>
    </nav>
  )
}

// Background decoration component
function BackgroundDecoration() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-40 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body relative">
        <BackgroundDecoration />
        <Nav />
        <main className="relative pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
            <Route path="/musicmatch" element={<MusicMatchPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
