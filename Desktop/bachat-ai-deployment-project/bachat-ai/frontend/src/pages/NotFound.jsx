import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, Sparkles } from 'lucide-react'
import { BachatLogo } from '../components/ui/BachatLogo'

/* ─── Animated floating coin ─── */
function FloatingCoin({ delay, x, size, duration }) {
  return (
    <div
      className="absolute text-primary/20 dark:text-primary/15 pointer-events-none select-none"
      style={{
        left: `${x}%`,
        fontSize: `${size}px`,
        animation: `floatCoin ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      ₹
    </div>
  )
}

export default function NotFound() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [glitchActive, setGlitchActive] = useState(false)

  // Periodic glitch effect on the 404 number
  useEffect(() => {
    const timer = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 200)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim().toLowerCase()
    if (['home', 'landing', ''].includes(q)) navigate('/')
    else if (['login', 'auth', 'signup', 'register'].includes(q)) navigate('/auth')
    else if (['dashboard', 'dash'].includes(q)) navigate('/dashboard')
    else if (['forecast', 'predict'].includes(q)) navigate('/forecast')
    else if (['reports', 'report'].includes(q)) navigate('/reports')
    else if (['settings', 'setting'].includes(q)) navigate('/settings')
    else if (['transactions', 'transaction'].includes(q)) navigate('/transactions')
    else navigate('/')
  }

  const quickLinks = [
    { label: 'Dashboard', path: '/dashboard', emoji: '📊' },
    { label: 'Forecast', path: '/forecast', emoji: '📈' },
    { label: 'Reports', path: '/reports', emoji: '📋' },
    { label: 'Home', path: '/', emoji: '🏠' },
  ]

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden flex flex-col items-center justify-center px-6 text-text transition-colors duration-300">

      {/* Background effects */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full bg-primary/15 dark:bg-primary/10 blur-[160px] animate-blob" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-accent/20 dark:bg-accent/10 blur-[140px] animate-blob" style={{ animationDelay: '3s' }} />

      {/* Floating ₹ coins */}
      <FloatingCoin delay={0} x={10} size={48} duration={7} />
      <FloatingCoin delay={1.5} x={25} size={32} duration={9} />
      <FloatingCoin delay={0.8} x={75} size={56} duration={8} />
      <FloatingCoin delay={2.2} x={85} size={28} duration={6} />
      <FloatingCoin delay={3} x={50} size={40} duration={10} />

      {/* Logo */}
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 group z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
          <BachatLogo size={20} className="text-white" />
        </div>
        <span className="font-display font-extrabold text-xl text-gradient-orange">Bachat AI</span>
      </Link>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-auto animate-fade-in-up">

        {/* Giant 404 */}
        <div className="relative mb-6">
          <h1
            className={`text-[160px] sm:text-[200px] font-display font-black leading-none text-transparent select-none ${glitchActive ? 'animate-pulse' : ''}`}
            style={{
              WebkitTextStroke: '3px var(--color-highlight, #f97316)',
              textShadow: glitchActive
                ? '4px 0 #f97316, -4px 0 #fbbf24, 0 0 40px rgba(249,115,22,0.4)'
                : '0 0 30px rgba(249,115,22,0.15)',
              transition: 'text-shadow 0.1s',
            }}
          >
            404
          </h1>
          {/* Decorative orbit ring behind the 404 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border-2 border-dashed border-primary/15 animate-orbital-spin pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full border border-accent/10 animate-orbital-spin-reverse pointer-events-none" />
        </div>

        {/* Heading */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-text">
            Oops! Page not found
          </h2>
        </div>

        <p className="text-text-secondary text-base leading-relaxed mb-8 max-w-md mx-auto">
          Looks like this page got lost chasing savings. Don't worry — your money is still safe with us!
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative max-w-sm mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a page..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-card text-text text-sm font-medium placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all"
          />
        </form>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold text-text hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300"
            >
              <span>{link.emoji}</span> {link.label}
            </Link>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-text font-bold text-sm hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>

      {/* Bottom decorative text */}
      <p className="absolute bottom-6 text-[10px] text-text-secondary/50 font-mono tracking-wider uppercase">
        Error 404 • Bachat AI • Page not found
      </p>
    </div>
  )
}
