import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * useIdleTimeout — Auto-logout on user inactivity
 * 
 * @param {number} timeoutMs      Total idle time before forced logout (default 15 min)
 * @param {number} warningMs      How long before timeout to show the warning (default 2 min)
 * 
 * Tracks: mousemove, mousedown, keydown, touchstart, scroll, click
 * Shows a warning countdown before auto-logging out.
 */
export function useIdleTimeout({
  timeoutMs = 15 * 60 * 1000,    // 15 minutes
  warningMs = 2 * 60 * 1000,     // 2 minute warning before logout
} = {}) {
  const { user, logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const timeoutRef = useRef(null)
  const warningRef = useRef(null)
  const countdownRef = useRef(null)

  const clearAllTimers = useCallback(() => {
    clearTimeout(timeoutRef.current)
    clearTimeout(warningRef.current)
    clearInterval(countdownRef.current)
  }, [])

  const handleLogout = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    logout()
  }, [clearAllTimers, logout])

  const resetTimer = useCallback(() => {
    if (!user) return

    clearAllTimers()
    setShowWarning(false)

    // Set warning timer (fires warningMs before timeout)
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(Math.round(warningMs / 1000))

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, timeoutMs - warningMs)

    // Set actual logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeoutMs)
  }, [user, timeoutMs, warningMs, clearAllTimers, handleLogout])

  // Extend session — called when user clicks "Stay Logged In"
  const extendSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    if (!user) return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

    // Throttle: don't reset on every pixel of mouse movement
    let lastReset = Date.now()
    const throttledReset = () => {
      const now = Date.now()
      if (now - lastReset > 30000) { // reset at most every 30 seconds
        lastReset = now
        resetTimer()
      }
    }

    events.forEach(evt => window.addEventListener(evt, throttledReset, { passive: true }))

    // Initial start
    resetTimer()

    return () => {
      events.forEach(evt => window.removeEventListener(evt, throttledReset))
      clearAllTimers()
    }
  }, [user, resetTimer, clearAllTimers])

  return { showWarning, secondsLeft, extendSession }
}
