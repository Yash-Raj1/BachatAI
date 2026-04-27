import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { BachatLogo } from '../components/ui/BachatLogo'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Eye, EyeOff, CheckCircle, AlertTriangle, Lock } from 'lucide-react'

const inputCls = 'w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

export default function ResetPassword() {
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [showCf, setShowCf]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const navigate = useNavigate()

  // Supabase embeds the token in the URL hash on redirect.
  // We need to wait for the session to be established from that token.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // In case the page loads after the event already fired, check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      // Auto redirect to login after 3 seconds
      setTimeout(() => navigate('/auth'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col transition-colors duration-300">
      {/* Background blobs */}
      <div className="fixed top-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/15 blur-[140px] pointer-events-none" />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border relative z-10">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center group-hover:scale-105 transition-transform shadow">
            <BachatLogo size={17} className="text-white" />
          </div>
          <span className="font-display font-extrabold text-lg text-gradient-orange">Bachat AI</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-8 animate-fade-in-up">

          {success ? (
            /* ── Success State ── */
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <h1 className="font-display text-2xl font-bold text-text">Password Updated!</h1>
              <p className="text-text-secondary text-sm">
                Your password has been changed successfully.<br />
                Redirecting you to login…
              </p>
              <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                <div className="h-full bg-success animate-[progress_3s_linear_forwards]" />
              </div>
              <Link to="/auth">
                <Button className="w-full mt-2">Go to Login</Button>
              </Link>
            </div>
          ) : !sessionReady ? (
            /* ── Invalid / Expired Link State ── */
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
              <h1 className="font-display text-xl font-bold text-text">Waiting for verification…</h1>
              <p className="text-text-secondary text-sm">
                If you arrived here from a password reset email, your session is being verified.
                If this persists, the link may have expired.
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-text">Set new password</h1>
                  <p className="text-text-secondary text-sm">Choose a strong password you haven't used before.</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-text uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputCls + ' pr-11'}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? i <= 1 ? 'bg-danger' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-primary' : 'bg-success'
                              : 'bg-border'
                          }`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        {password.length < 3 ? 'Too short' : password.length < 6 ? 'Weak' : password.length < 9 ? 'Fair' : password.length < 12 ? 'Good' : 'Strong'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-text uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showCf ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className={inputCls + ` pr-11 ${confirm && confirm !== password ? 'border-danger ring-danger/20' : confirm && confirm === password ? 'border-success' : ''}`}
                      placeholder="Repeat your password"
                      required
                    />
                    <button type="button" onClick={() => setShowCf(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors">
                      {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-danger mt-1">Passwords don't match</p>
                  )}
                  {confirm && confirm === password && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-sm font-bold mt-2">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Updating…
                    </span>
                  ) : 'Update Password'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/auth" className="text-sm text-text-secondary hover:text-primary transition-colors">
                  ← Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
