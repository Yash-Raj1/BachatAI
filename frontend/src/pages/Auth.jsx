import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ArrowRight, Quote, Eye, EyeOff, Shield, Zap, Brain, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { BachatLogo } from '../components/ui/BachatLogo'
import professorImg from '../assets/singh-nitish-kumar.png'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
        navigate('/dashboard')
      } else {
        await signup(email, password)
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setForgotSent(true)
    } catch (err) {
      setForgotError(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden transition-colors duration-300 text-text">

      {/* Background effects */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full bg-primary/10 dark:bg-primary/8 blur-[160px] animate-blob" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/15 dark:bg-accent/8 blur-[140px] animate-blob" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[60%] left-[40%] w-[25%] h-[25%] rounded-full bg-primary-dark/10 blur-[100px] animate-blob" style={{ animationDelay: '5s' }} />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      {/* Nav bar */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <BachatLogo size={17} className="text-white" />
          </div>
          <span className="font-display font-extrabold text-xl text-gradient-orange">Bachat AI</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Centered card */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 pt-16 pb-8">

        {/* Floating card */}
        <div className="relative">
          {/* Ground shadow — gives the "floating above ground" look */}
          <div className="absolute -bottom-6 left-[10%] right-[10%] h-12 bg-primary/10 dark:bg-primary/5 blur-[30px] rounded-[50%]" />

          <div
            className="relative w-full max-w-[1060px] min-h-[520px] grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-border bg-card animate-fade-in-up"
            style={{
              animationDuration: '0.8s',
              boxShadow: [
                '0 -4px 30px -5px rgba(249,115,22,0.12)',
                '0 25px 60px -12px rgba(249,115,22,0.15)',
                '0 12px 40px -8px rgba(0,0,0,0.12)',
                '0 40px 80px -20px rgba(0,0,0,0.18)',
              ].join(', '),
            }}
          >

            {/* ─── Left Panel — Branding + Quote ─── */}
            <div
              className="hidden lg:flex flex-col justify-between p-10 xl:p-12 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 35%, #f97316 65%, #fb923c 100%)' }}
            >
              {/* Decorative elements */}
              <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-white/8 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-15%] left-[-10%] w-[250px] h-[250px] bg-white/5 rounded-full blur-[60px] animate-blob" style={{ animationDelay: '2s' }} />
              <div className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '36px 36px' }}
              />

              {/* Top — features */}
              <div className="relative z-10 space-y-4">
                <h2 className="text-2xl font-display font-extrabold text-white leading-tight">
                  Your AI-powered<br />financial coach
                </h2>
                <div className="space-y-2">
                  {[
                    { icon: Shield, text: 'Bank-grade encryption' },
                    { icon: Zap, text: 'Instant AI analysis' },
                    { icon: Brain, text: '20+ Indian banks' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-white/85 text-xs font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom — quote */}
              <div className="relative z-10 pt-6">
                <Quote className="w-8 h-8 text-white/30 mb-3" />
                <blockquote className="text-base font-semibold text-white leading-relaxed mb-5">
                  "Finally, an AI coach that actually understands Indian bank statements. My savings jumped 20% in two months."
                </blockquote>
                <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                  <img src={professorImg} alt="Singh Nitish Kumar" className="w-11 h-11 rounded-full border-2 border-white/50 object-cover shadow-lg" />
                  <div>
                    <p className="text-white font-bold text-sm">Singh Nitish Kumar</p>
                    <p className="text-white/65 text-xs">Asst. Professor, UCER Prayagraj</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right Panel — Form ─── */}
            <div className="flex flex-col justify-center p-8 sm:p-10 xl:p-12">

              {/* Mobile logo */}
              <div className="mb-5 lg:hidden flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  <BachatLogo size={17} className="text-white" />
                </div>
                <span className="font-display font-extrabold text-xl text-gradient-orange">Bachat AI</span>
              </div>

              {/* Heading */}
              <div className="text-center lg:text-left mb-7">
                <h1 className="text-3xl font-display font-extrabold text-text mb-1.5">
                  {isLogin ? 'Welcome back 👋' : 'Create your account'}
                </h1>
                <p className="text-text-secondary text-base">
                  {isLogin ? 'Sign in to access your financial dashboard.' : 'Start your journey to financial freedom.'}
                </p>
              </div>

              {/* ─── Forgot Password Mode ─── */}
              {forgotMode ? (
                <div className="space-y-5">
                  {/* Back button */}
                  <button
                    onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(''); setForgotEmail('') }}
                    className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                  </button>

                  {forgotSent ? (
                    /* Success state */
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-success" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-text">Check your inbox!</h3>
                        <p className="text-text-secondary text-sm mt-1">
                          We sent a password reset link to<br />
                          <strong className="text-text">{forgotEmail}</strong>
                        </p>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Didn't receive it? Check your spam folder or{' '}
                        <button
                          onClick={() => { setForgotSent(false); setForgotEmail('') }}
                          className="text-primary font-semibold hover:underline"
                        >
                          try again
                        </button>.
                      </p>
                    </div>
                  ) : (
                    /* Form state */
                    <>
                      <div>
                        <h3 className="font-display text-xl font-bold text-text mb-1">Reset password</h3>
                        <p className="text-text-secondary text-sm">Enter your email and we'll send a reset link.</p>
                      </div>

                      {forgotError && (
                        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-medium">
                          {forgotError}
                        </div>
                      )}

                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-text uppercase tracking-wider">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                            <input
                              type="email"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                              placeholder="you@example.com"
                              required
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={forgotLoading}
                          className="w-full h-12 text-sm font-bold"
                        >
                          {forgotLoading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending...
                            </span>
                          ) : 'Send Reset Link'}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              ) : (
                /* ─── Normal Login / Signup Form ─── */
                <>
              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-medium text-center">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-text uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-text uppercase tracking-wider">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setForgotEmail(email) }}
                        className="text-xs text-primary font-semibold hover:underline transition-all"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all pr-11"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/35 group mt-1"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Toggle */}
              <div className="mt-5 text-center border-t border-border pt-4">
                <p className="text-text-secondary text-sm">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => { setIsLogin(!isLogin); setError('') }}
                    className="text-primary font-bold hover:underline transition-all"
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
              </>
              )}

              {/* Bottom trust badges - mobile */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-secondary lg:hidden">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span>
                <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> AI-powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
