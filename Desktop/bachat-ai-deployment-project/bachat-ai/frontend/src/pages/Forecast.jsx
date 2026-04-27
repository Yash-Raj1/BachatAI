import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { NotificationBell } from '../components/ui/NotificationBell'
import { ProfileModal } from '../components/ui/ProfileModal'
import { BachatLogo } from '../components/ui/BachatLogo'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts'
import {
  TrendingUp, Sliders, Info, LayoutDashboard, FileText, BarChart3,
  ArrowLeft, Zap, PiggyBank, Target, ArrowUpRight, ArrowDownRight,
  Wallet, RefreshCw, AlertCircle, Brain, Cpu
} from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-text mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: ₹{p.value?.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Forecast() {
  const { user, logout } = useAuth()
  const [txns, setTxns] = useState([])
  const [allTxns, setAllTxns] = useState([])   // All transactions across all statements
  const [profile, setProfile] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [slider1Cut, setSlider1Cut] = useState(15)
  const [slider2Cut, setSlider2Cut] = useState(5)
  const [slider3Cut, setSlider3Cut] = useState(0)

  // ML forecast state
  const [mlForecast, setMlForecast] = useState(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError, setMlError] = useState(null)
  const [mlUsed, setMlUsed] = useState(false)

  // Fetch real data
  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)

        // Get latest statement for current view
        const { data: stmts } = await supabase
          .from('statements').select('id, total_credit, total_debit')
          .eq('user_id', user.id).order('parsed_at', { ascending: false }).limit(1)

        if (stmts?.length) {
          const { data: transactions } = await supabase
            .from('transactions').select('*').eq('statement_id', stmts[0].id)
          setTxns(transactions || [])
        }

        // Get ALL transactions across all statements (for multi-month forecast)
        const { data: allStatements } = await supabase
          .from('statements').select('id')
          .eq('user_id', user.id)

        if (allStatements?.length) {
          const stmtIds = allStatements.map(s => s.id)
          const { data: allTransactions } = await supabase
            .from('transactions').select('date, amount, type, category, description')
            .in('statement_id', stmtIds)
            .order('date', { ascending: true })
          setAllTxns(allTransactions || [])
        }
      } catch (e) {
        console.error('Forecast data fetch:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Monthly spending by category (from latest statement)
  const catSpend = useMemo(() => {
    const map = {}
    txns.forEach(t => {
      if (t.type === 'debit') {
        const c = t.category || 'Other'
        map[c] = (map[c] || 0) + parseFloat(t.amount)
      }
    })
    return map
  }, [txns])

  const totalDebit = useMemo(() => Object.values(catSpend).reduce((s, v) => s + v, 0), [catSpend])
  const totalCredit = useMemo(() =>
    txns.filter(t => t.type === 'credit').reduce((s, t) => s + parseFloat(t.amount), 0)
  , [txns])
  const currentSavings = totalCredit - totalDebit
  const savingsRate = totalCredit > 0 ? (currentSavings / totalCredit) * 100 : 0

  // What-if savings impact (Dynamic based on user's top 3 spending categories)
  const topCats = useMemo(() => {
    return Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [catSpend])

  const cat1 = topCats[0] || ['Dining', 0]
  const cat2 = topCats[1] || ['Shopping', 0]
  const cat3 = topCats[2] || ['Transport', 0]

  const potentialSaving = Math.round(
    (cat1[1] * slider1Cut / 100) +
    (cat2[1] * slider2Cut / 100) +
    (cat3[1] * slider3Cut / 100)
  )

  // ── Load saved forecast history from DB on mount ──────────────────────
  const loadForecastHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/forecast/history')
      if (data?.forecasts?.length) {
        // Convert Supabase rows back to the shape the page expects
        const rebuilt = {
          model_used: data.model_used || 'ensemble',
          forecast: data.forecasts.map(row => ({
            ds:                 row.forecast_date,
            month:              new Date(row.forecast_date).toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
            predicted_savings:  row.predicted_savings,
            predicted_expenses: row.predicted_expenses,
            yhat:               row.predicted_savings,
            yhat_lower:         row.confidence_lower,
            yhat_upper:         row.confidence_upper,
            lower_bound:        row.confidence_lower,
            upper_bound:        row.confidence_upper,
          }))
        }
        setMlForecast(rebuilt)
        setMlUsed(true)
        console.log(`[forecast] Loaded ${data.count} saved rows from DB`)
      }
    } catch (e) {
      console.warn('[forecast] Could not load history:', e.message)
    }
  }, [])

  // ── ML Forecast API Call ───────────────────────────────────────────────
  const fetchForecast = useCallback(async () => {
    if (!allTxns.length && !txns.length) return
    setMlLoading(true)
    setMlError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const transactionsForForecast = allTxns.length ? allTxns : txns

      const res = await fetch(`${API}/api/forecast/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          transactions: transactionsForForecast.map(t => ({
            date: t.date,
            amount: parseFloat(t.amount),
            type: t.type,
            category: t.category || 'Other',
          })),
          periods: 6,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.forecast) {
          setMlForecast(data)
          setMlUsed(true)
          return
        }
      }

      // If ML API failed, set error but don't crash
      const errData = await res.json().catch(() => ({}))
      setMlError(errData.error || errData.message || 'ML API returned an error')
    } catch (err) {
      console.warn('[forecast] ML API call failed, using client-side fallback:', err.message)
      setMlError('ML forecast service unavailable — showing estimated projections')
    } finally {
      setMlLoading(false)
    }
  }, [allTxns, txns])

  // Load saved forecasts from DB first, then auto-fetch new ML forecast
  useEffect(() => {
    if (!loading) {
      loadForecastHistory()  // Show saved data immediately
      if (allTxns.length >= 1 || txns.length >= 1) {
        fetchForecast()      // Then refresh from ML
      }
    }
  }, [loading, allTxns.length, txns.length, fetchForecast, loadForecastHistory])

  // ── Build projection data from ML forecast OR client-side fallback ─────
  const projectionData = useMemo(() => {
    if (mlForecast?.forecast?.length) {
      // Use real ML predictions and blend with What-If simulator
      return mlForecast.forecast.map(f => ({
        month: f.month,
        predicted: Math.round(f.predicted_savings) + potentialSaving,
        upper: Math.round(f.upper_bound) + potentialSaving,
        lower: Math.round(f.lower_bound) + potentialSaving,
        description: f.description || '',
      }))
    }

    // Client-side fallback
    if (!totalCredit) return []
    const now = new Date()
    const months = []
    for (let i = 1; i <= 6; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthLabel = MONTHS[m.getMonth()] + ' ' + m.getFullYear()
      const growth = 1 + (savingsRate > 20 ? 0.03 : 0.015)
      const predicted = Math.round((currentSavings + potentialSaving) * Math.pow(growth, i))
      const upper = Math.round(predicted * 1.15)
      const lower = Math.round(predicted * 0.85)
      months.push({ month: monthLabel, predicted, upper, lower, description: '' })
    }
    return months
  }, [mlForecast, totalCredit, currentSavings, savingsRate, potentialSaving])

  // Category breakdown bar chart data
  const categoryBarData = useMemo(() => {
    return Object.entries(catSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '..' : name, value: Math.round(value) }))
  }, [catSpend])

  const BAR_COLORS = ['#f97316','#06b6d4','#8b5cf6','#ec4899','#10b981','#eab308','#6366f1','#f43f5e']

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                <BachatLogo size={17} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg text-gradient-orange hidden sm:block">Bachat AI</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 ml-3 border-l border-border pl-3">
              <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10">
                <TrendingUp className="w-3.5 h-3.5" /> Forecast
              </div>
              <Link to="/investments" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <BarChart3 className="w-3.5 h-3.5" /> Investment
              </Link>
              <Link to="/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <FileText className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
            <button className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-border/50 transition-colors" onClick={() => setIsProfileOpen(true)}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold shadow">
                {(profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-text leading-none">{profile?.full_name || 'My Account'}</p>
                <p className="text-xs text-text-secondary truncate max-w-[140px]">{user?.email}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onProfileSave={updated => setProfile(updated)}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-text mb-1">Savings Forecast</h1>
              <p className="text-text-secondary">AI-powered projections based on your real spending data.</p>
            </div>
            {/* ML status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
              mlUsed
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : mlError
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-border/30 border-border text-text-secondary'
            }`}>
              {mlUsed ? (
                <><Brain className="w-3.5 h-3.5" /> ML Forecast Active</>
              ) : mlLoading ? (
                <><Cpu className="w-3.5 h-3.5 animate-spin" /> Loading ML Model…</>
              ) : mlError ? (
                <><AlertCircle className="w-3.5 h-3.5" /> Estimated Mode</>
              ) : (
                <><Cpu className="w-3.5 h-3.5" /> Initializing…</>
              )}
            </div>
          </div>
        </div>

        {!txns.length ? (
          <Card className="p-12 text-center">
            <PiggyBank className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-text mb-2">No Data Yet</h2>
            <p className="text-text-secondary mb-4">Upload a bank statement on the Dashboard to generate a forecast.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Link>
          </Card>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Current Savings', value: `₹${currentSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: PiggyBank, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: `${savingsRate.toFixed(0)}% rate` },
                { label: 'Monthly Income', value: `₹${totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', sub: 'Total credits' },
                { label: 'Monthly Spend', value: `₹${totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: ArrowDownRight, color: 'text-red-500', bg: 'bg-red-500/10', sub: `${Object.keys(catSpend).length} categories` },
                { label: 'Potential Saving', value: `+₹${potentialSaving.toLocaleString('en-IN')}`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'With adjustments below' },
              ].map(c => (
                <Card key={c.label} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                      <c.icon className={`w-4.5 h-4.5 ${c.color}`} />
                    </div>
                    <p className="text-xs text-text-secondary font-medium">{c.label}</p>
                  </div>
                  <p className="text-xl font-display font-bold text-text">{c.value}</p>
                  <p className="text-[11px] text-text-secondary mt-1">{c.sub}</p>
                </Card>
              ))}
            </div>

            {/* Main Content: Chart + Simulator */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Projection Chart */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-bold text-lg text-text">6-Month Savings Projection</h3>
                    {mlUsed && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Prophet + ARIMA + Linear
                      </span>
                    )}
                  </div>
                  <button
                    onClick={fetchForecast}
                    disabled={mlLoading}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${mlLoading ? 'animate-spin' : ''}`} />
                    {mlLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {/* ML error banner */}
                {mlError && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mlError}</span>
                  </div>
                )}

                <div className="h-[360px] relative">
                  {mlLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/50 backdrop-blur-sm z-10 rounded-xl border border-primary/20">
                      <div className="w-12 h-12 mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-sm" />
                      <h4 className="font-display font-bold text-text mb-1 text-sm">Running ML Forecast...</h4>
                      <p className="text-xs text-text-secondary animate-pulse text-center max-w-[280px]">
                        Analyzing historical spending patterns using Prophet and ARIMA models.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="upper" stroke="#fbbf24" fill="none" strokeDasharray="5 5" strokeOpacity={0.5} name="Best Case" />
                        <Area type="monotone" dataKey="lower" stroke="#f87171" fill="none" strokeDasharray="5 5" strokeOpacity={0.5} name="Worst Case" />
                        <Area type="monotone" dataKey="predicted" stroke="#f97316" fill="url(#colorPred)" strokeWidth={3} name="Predicted Savings" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 7 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* What-If Simulator */}
              <div className="space-y-5">
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Sliders className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-text">What-If Simulator</h3>
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: `Reduce ${cat1[0].length > 12 ? cat1[0].slice(0,12)+'..' : cat1[0]}`, val: slider1Cut, set: setSlider1Cut, spend: cat1[1] },
                      { label: `Cut ${cat2[0].length > 12 ? cat2[0].slice(0,12)+'..' : cat2[0]}`, val: slider2Cut, set: setSlider2Cut, spend: cat2[1] },
                      { label: `Cut ${cat3[0].length > 12 ? cat3[0].slice(0,12)+'..' : cat3[0]}`, val: slider3Cut, set: setSlider3Cut, spend: cat3[1] },
                    ].map((s, idx) => (
                      <div key={idx}>
                        <label className="flex justify-between text-sm font-medium mb-2 text-text">
                          <span>{s.label}</span>
                          <span className="text-primary font-bold">-{s.val}%</span>
                        </label>
                        <input type="range" className="w-full accent-primary" value={s.val} onChange={e => s.set(+e.target.value)} min={0} max={50} />
                        <p className="text-[10px] text-text-secondary mt-1">Current: ₹{s.spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</p>
                      </div>
                    ))}
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
                      <Info className="text-primary shrink-0 w-4 h-4 mt-0.5" />
                      <span className="text-sm text-text">
                        These changes could add <strong className="text-primary">₹{potentialSaving.toLocaleString('en-IN')}</strong> to your monthly savings.
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-text text-sm">6-Month Projection</h3>
                  </div>
                  {mlLoading ? (
                    <div className="h-9 w-32 bg-primary/20 animate-pulse rounded-lg mt-1 mb-2"></div>
                  ) : (
                    <p className="text-3xl font-display font-bold text-text">
                      ₹{(mlUsed
                          ? projectionData.reduce((sum, d) => sum + d.predicted, 0)
                          : projectionData[5]?.predicted || 0
                        ).toLocaleString('en-IN')}
                    </p>
                  )}
                  <p className="text-xs text-text-secondary mt-1">
                    {mlUsed ? 'Total predicted savings (ML ensemble)' : 'Estimated savings in 6 months'}
                  </p>
                  {mlForecast?.months_used && (
                    <p className="text-[10px] text-text-secondary mt-1">
                      Based on {mlForecast.months_used} month(s) of historical data
                    </p>
                  )}
                </Card>
              </div>
            </div>

            {/* ML Forecast Descriptions */}
            {mlUsed && projectionData.some(d => d.description) && (
              <Card className="p-6 mb-8">
                <div className="flex items-center gap-2 mb-5">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold text-lg text-text">AI Forecast Insights</h3>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    ML Generated
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectionData.filter(d => d.description).map((d, i) => (
                    <div key={i} className="p-4 rounded-xl bg-bg border border-border/60 hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-primary">{d.month}</p>
                        <p className={`text-sm font-display font-bold ${d.predicted >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {d.predicted >= 0 ? '+' : ''}₹{d.predicted.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{d.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Category Spend Breakdown */}
            <Card className="p-6">
              <h3 className="font-display font-bold text-lg text-text mb-6">Spending by Category</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Spent">
                      {categoryBarData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
