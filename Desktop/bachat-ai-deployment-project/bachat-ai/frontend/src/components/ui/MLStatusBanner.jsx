import { useState, useEffect } from 'react'
import { Zap, AlertCircle } from 'lucide-react'

/**
 * MLStatusBanner
 *
 * Shows a non-intrusive banner while the ML API (on Render free tier)
 * is waking up from sleep. Disappears once the service responds.
 *
 * Render free services sleep after 15 min of inactivity.
 * First wake-up request can take 30–60 seconds.
 */
export const MLStatusBanner = () => {
  const [status, setStatus] = useState('checking')
  // status: 'checking' | 'waking' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false

    const checkML = async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      // ML API runs on same base URL as backend on Render — if backend URL
      // ends in /api we strip it; ML /health is at root
      const ML_URL = API_URL.replace(/\/api$/, '')

      try {
        const start = Date.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const r = await fetch(`${ML_URL}/health`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const elapsed = Date.now() - start

        if (!cancelled) {
          if (r.ok) {
            setStatus('ready')
          } else {
            setStatus('error')
          }
        }
      } catch {
        if (!cancelled) {
          // Likely waking up — show waking banner and retry
          setStatus('waking')
          setTimeout(() => {
            if (!cancelled) checkML()
          }, 12000)
        }
      }
    }

    checkML()
    return () => { cancelled = true }
  }, [])

  // Don't render anything once ready
  if (status === 'ready') return null

  const config = {
    checking: {
      bg: 'bg-blue-500/8 border-blue-500/20',
      icon: Zap,
      iconClass: 'text-blue-400 animate-pulse',
      text: 'Connecting to AI engine…',
    },
    waking: {
      bg: 'bg-amber-500/8 border-amber-500/20',
      icon: Zap,
      iconClass: 'text-amber-400 animate-pulse',
      text: 'AI engine is waking up — this takes ~30 seconds on first load. Your data will appear shortly.',
    },
    error: {
      bg: 'bg-red-500/8 border-red-500/20',
      icon: AlertCircle,
      iconClass: 'text-red-400',
      text: 'AI engine is unavailable. Some smart features may be limited right now.',
    },
  }

  const c = config[status]
  const Icon = c.icon

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border rounded-xl text-sm mb-4 transition-all ${c.bg}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${c.iconClass}`} />
      <span className="text-text-secondary leading-relaxed">{c.text}</span>
    </div>
  )
}
