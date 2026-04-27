import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { NotificationBell } from '../components/ui/NotificationBell'
import { ProfileModal } from '../components/ui/ProfileModal'
import { BachatLogo } from '../components/ui/BachatLogo'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, Treemap
} from 'recharts'
import {
  FileText, LayoutDashboard, TrendingUp, Download, Calendar, ArrowLeft, PiggyBank,
  ArrowUpRight, ArrowDownRight, CreditCard, Wallet, ChevronDown, Flame, Clock,
  ShieldCheck, AlertTriangle, Award, BarChart3, Activity, Percent, IndianRupee,
  TrendingDown, Sparkles, FileDown, Printer, Star
} from 'lucide-react'

/* ─── Color Palettes ─── */
const PIE_COLORS = ['#f97316','#06b6d4','#8b5cf6','#ec4899','#10b981','#eab308','#6366f1','#f43f5e','#14b8a6','#a855f7','#f59e0b','#64748b']
const GRADIENT_COLORS = [
  ['#f97316','#fb923c'],['#06b6d4','#22d3ee'],['#8b5cf6','#a78bfa'],['#ec4899','#f472b6'],
  ['#10b981','#34d399'],['#eab308','#facc15'],['#6366f1','#818cf8'],['#f43f5e','#fb7185']
]

/* ─── Tooltips ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-2xl text-xs backdrop-blur-sm">
      {label && <p className="font-bold text-text mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color || p.payload?.fill }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: Rs.{p.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, icon: Icon, color, bg, trend, trendUp }) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity" style={{ background: color?.replace('text-', '') }} />
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-display font-extrabold text-text">{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {trend !== undefined && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
        <p className="text-[11px] text-text-secondary">{sub}</p>
      </div>
    </Card>
  )
}

/* ─── Score Ring ─── */
function ScoreRing({ score, label, color, size = 100 }) {
  const pct = Math.min(Math.max(score, 0), 100)
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-display font-extrabold text-text">{Math.round(pct)}</span>
        <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">/ 100</span>
      </div>
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
    </div>
  )
}

/* ─── Export Utils ─── */
function exportCSV(txns, filename) {
  const headers = ['Date','Description','Amount','Type','Category']
  const rows = txns.map(t => [t.date, `"${(t.description||'').replace(/"/g,'""')}"`, t.amount, t.type, t.category||'Other'])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ─── Day Names ─── */
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

/* ═══════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                        */
/* ═══════════════════════════════════════════════════════════ */
export default function Reports() {
  const { user, logout } = useAuth()
  const [statements, setStatements] = useState([])
  const [allTxns, setAllTxns] = useState([])
  const [selectedStmt, setSelectedStmt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  // Close export dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Fetch data
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
        const { data: stmts } = await supabase.from('statements').select('*').eq('user_id', user.id).order('parsed_at', { ascending: false })
        if (stmts?.length) {
          setStatements(stmts)
          setSelectedStmt(stmts[0].id)
          const { data: txns } = await supabase.from('transactions').select('*').eq('user_id', user.id)
          setAllTxns(txns || [])
        }
      } catch (e) { console.error('Reports data fetch:', e) }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const filteredTxns = useMemo(() => selectedStmt ? allTxns.filter(t => t.statement_id === selectedStmt) : allTxns, [allTxns, selectedStmt])
  const stmtData = statements.find(s => s.id === selectedStmt) || {}

  /* ─── Core Metrics ─── */
  const totalCredit = useMemo(() => filteredTxns.filter(t => t.type === 'credit').reduce((s, t) => s + parseFloat(t.amount), 0), [filteredTxns])
  const totalDebit = useMemo(() => filteredTxns.filter(t => t.type === 'debit').reduce((s, t) => s + parseFloat(t.amount), 0), [filteredTxns])
  const savings = totalCredit - totalDebit
  const savingsRate = totalCredit > 0 ? (savings / totalCredit) * 100 : 0
  const debits = useMemo(() => filteredTxns.filter(t => t.type === 'debit'), [filteredTxns])
  const avgTxn = debits.length > 0 ? totalDebit / debits.length : 0

  /* ─── Category Pie ─── */
  const categoryPie = useMemo(() => {
    const m = {}
    debits.forEach(t => { const c = t.category || 'Other'; m[c] = (m[c] || 0) + parseFloat(t.amount) })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [debits])

  /* ─── Daily Spending Area ─── */
  const dailyArea = useMemo(() => {
    const m = {}
    debits.forEach(t => { if (t.date) m[t.date] = (m[t.date] || 0) + parseFloat(t.amount) })
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date: date.slice(5), value: Math.round(value) }))
  }, [debits])

  /* ─── Weekly Pattern (Radar) ─── */
  const weeklyRadar = useMemo(() => {
    const dayTotals = [0,0,0,0,0,0,0]
    const dayCounts = [0,0,0,0,0,0,0]
    debits.forEach(t => {
      if (!t.date) return
      const d = new Date(t.date).getDay()
      dayTotals[d] += parseFloat(t.amount)
      dayCounts[d]++
    })
    return DAYS.map((name, i) => ({ day: name, amount: Math.round(dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : 0) }))
  }, [debits])

  /* ─── Income vs Expense ─── */
  const iveData = useMemo(() => [
    { name: 'Income', value: Math.round(totalCredit) },
    { name: 'Expenses', value: Math.round(totalDebit) },
    { name: 'Savings', value: Math.round(Math.max(savings, 0)) },
  ], [totalCredit, totalDebit, savings])

  /* ─── Monthly Comparison (if multiple months in data) ─── */
  const monthlyComparison = useMemo(() => {
    const months = {}
    filteredTxns.forEach(t => {
      if (!t.date) return
      const m = t.date.slice(0, 7) // YYYY-MM
      if (!months[m]) months[m] = { income: 0, expense: 0 }
      if (t.type === 'credit') months[m].income += parseFloat(t.amount)
      else months[m].expense += parseFloat(t.amount)
    })
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => {
      const [y, mo] = m.split('-')
      const label = new Date(y, parseInt(mo) - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
      return { month: label, income: Math.round(v.income), expense: Math.round(v.expense), savings: Math.round(v.income - v.expense) }
    })
  }, [filteredTxns])

  /* ─── Top 5 Largest Expenses ─── */
  const top5 = useMemo(() => [...debits].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5), [debits])

  /* ─── Category Treemap ─── */
  const treemapData = useMemo(() => categoryPie.map((c, i) => ({ name: c.name, size: c.value, fill: PIE_COLORS[i % PIE_COLORS.length] })), [categoryPie])

  /* ─── Spending by Time of Month ─── */
  const timeOfMonth = useMemo(() => {
    const buckets = { 'Week 1 (1-7)': 0, 'Week 2 (8-14)': 0, 'Week 3 (15-21)': 0, 'Week 4 (22-31)': 0 }
    debits.forEach(t => {
      if (!t.date) return
      const day = parseInt(t.date.slice(8, 10))
      if (day <= 7) buckets['Week 1 (1-7)'] += parseFloat(t.amount)
      else if (day <= 14) buckets['Week 2 (8-14)'] += parseFloat(t.amount)
      else if (day <= 21) buckets['Week 3 (15-21)'] += parseFloat(t.amount)
      else buckets['Week 4 (22-31)'] += parseFloat(t.amount)
    })
    return Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [debits])

  /* ─── Financial Health Score ─── */
  const healthScore = useMemo(() => {
    let score = 50
    if (savingsRate >= 30) score += 25
    else if (savingsRate >= 20) score += 15
    else if (savingsRate >= 10) score += 5
    else score -= 10
    // Diversity: more categories = healthier
    const catCount = categoryPie.length
    if (catCount >= 5) score += 10
    else if (catCount >= 3) score += 5
    // Not spending too much on one category
    if (categoryPie.length && totalDebit > 0) {
      const topPct = categoryPie[0].value / totalDebit
      if (topPct < 0.3) score += 15
      else if (topPct < 0.5) score += 5
      else score -= 5
    }
    return Math.min(Math.max(score, 0), 100)
  }, [savingsRate, categoryPie, totalDebit])

  /* ─── Smart Insights (rule-based auto-generated) ─── */
  const smartInsights = useMemo(() => {
    const insights = []
    if (savingsRate >= 30) insights.push({ type: 'praise', icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: `Excellent! Your ${savingsRate.toFixed(0)}% savings rate is well above the recommended 20%.` })
    else if (savingsRate < 10 && totalCredit > 0) insights.push({ type: 'warning', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', text: `Your savings rate is only ${savingsRate.toFixed(0)}%. Aim for at least 20% to build an emergency fund.` })

    if (categoryPie.length && totalDebit > 0) {
      const topCat = categoryPie[0]
      const pct = Math.round((topCat.value / totalDebit) * 100)
      if (pct > 40) insights.push({ type: 'alert', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-500/10', text: `${topCat.name} is ${pct}% of your spending. Consider setting a budget cap for this category.` })
    }

    // Weekend vs weekday
    const weekendSpend = weeklyRadar.filter((_, i) => i === 0 || i === 6).reduce((s, d) => s + d.amount, 0)
    const weekdaySpend = weeklyRadar.filter((_, i) => i > 0 && i < 6).reduce((s, d) => s + d.amount, 0)
    if (weekendSpend > weekdaySpend * 0.6) insights.push({ type: 'tip', icon: Sparkles, color: 'text-cyan-500', bg: 'bg-cyan-500/10', text: 'Your weekend spending is proportionally high. Try planning free activities on weekends to save more.' })

    // Time of month
    const week1 = timeOfMonth[0]?.value || 0
    const totalMonthSpend = timeOfMonth.reduce((s, w) => s + w.value, 0)
    if (totalMonthSpend > 0 && (week1 / totalMonthSpend) > 0.4) insights.push({ type: 'tip', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', text: 'You spend 40%+ of your budget in the first week. Try spacing out purchases to avoid month-end cash crunches.' })

    if (savings > 0) insights.push({ type: 'praise', icon: ShieldCheck, color: 'text-primary', bg: 'bg-primary/10', text: `You saved Rs.${savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this period. ${savings > (profile?.savings_goal || 0) ? 'You exceeded your goal!' : 'Keep working towards your target!'}` })

    return insights
  }, [savingsRate, totalCredit, totalDebit, savings, categoryPie, weeklyRadar, timeOfMonth, profile])

  /* ─── Print ─── */
  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300 print:bg-white">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl print:hidden">
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
              <Link to="/forecast" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <TrendingUp className="w-3.5 h-3.5" /> Forecast
              </Link>
              <Link to="/investments" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <BarChart3 className="w-3.5 h-3.5" /> Investment
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10">
                <FileText className="w-3.5 h-3.5" /> Reports
              </div>
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
        {/* ─── Title Row ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-display font-bold text-text">Financial Report</h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Live</span>
            </div>
            <p className="text-text-secondary">Complete analysis of your financial data with actionable insights.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Statement Selector */}
            {statements.length > 0 && (
              <div className="relative">
                <select value={selectedStmt || ''} onChange={e => setSelectedStmt(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-border bg-card text-text text-sm font-medium focus:outline-none focus:border-primary/50 cursor-pointer">
                  {statements.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.bank_name || 'Statement'} — {s.statement_period_start?.slice(0, 7) || 'N/A'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              </div>
            )}
            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen(!exportOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                <Download className="w-4 h-4" /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <button onClick={() => { exportCSV(filteredTxns, `bachat-report-${stmtData.bank_name || 'all'}.csv`); setExportOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-primary/5 transition-colors">
                    <FileDown className="w-4 h-4 text-emerald-500" /> Export as CSV
                  </button>
                  <button onClick={() => { exportJSON({ statement: stmtData, transactions: filteredTxns, summary: { totalCredit, totalDebit, savings, savingsRate } }, `bachat-report-${stmtData.bank_name || 'all'}.json`); setExportOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-primary/5 transition-colors border-t border-border/50">
                    <FileDown className="w-4 h-4 text-cyan-500" /> Export as JSON
                  </button>
                  <button onClick={() => { handlePrint(); setExportOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-primary/5 transition-colors border-t border-border/50">
                    <Printer className="w-4 h-4 text-purple-500" /> Print Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!allTxns.length ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-text mb-2">No Reports Available</h2>
            <p className="text-text-secondary mb-4">Upload a bank statement on the Dashboard to generate reports.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Link>
          </Card>
        ) : (
          <div className="space-y-8 animate-fade-in-up">

            {/* ═══ ROW 1: KPI Cards ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Total Income" value={`Rs.${totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={ArrowUpRight} color="text-emerald-500" bg="bg-emerald-500/10" sub="All credits" />
              <StatCard label="Total Expenses" value={`Rs.${totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={ArrowDownRight} color="text-red-500" bg="bg-red-500/10" sub={`${debits.length} transactions`} />
              <StatCard label="Net Savings" value={`Rs.${savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={PiggyBank} color={savings >= 0 ? 'text-emerald-500' : 'text-red-500'} bg={savings >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} sub={`${savingsRate.toFixed(0)}% rate`} trend={savings >= 0 ? 'Positive' : 'Deficit'} trendUp={savings >= 0} />
              <StatCard label="Avg Transaction" value={`Rs.${avgTxn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={Activity} color="text-cyan-500" bg="bg-cyan-500/10" sub="per debit" />
              <StatCard label="Categories" value={categoryPie.length} icon={BarChart3} color="text-purple-500" bg="bg-purple-500/10" sub="spending areas" />
            </div>

            {/* ═══ ROW 2: Financial Health Score + Smart Insights ═══ */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Health Score */}
              <Card className="p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <h3 className="font-display font-bold text-text mb-4 flex items-center gap-2 relative z-10">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Financial Health
                </h3>
                <div className="relative mb-4">
                  <ScoreRing score={healthScore} label="" color={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f97316' : '#ef4444'} size={140} />
                </div>
                <p className="text-sm font-bold text-text relative z-10">
                  {healthScore >= 70 ? 'Excellent' : healthScore >= 50 ? 'Good' : healthScore >= 30 ? 'Needs Work' : 'At Risk'}
                </p>
                <p className="text-[11px] text-text-secondary text-center mt-1 relative z-10">
                  Based on savings rate, spending diversity, and balance
                </p>
              </Card>

              {/* Smart Insights */}
              <Card className="lg:col-span-2 p-6">
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Smart Insights
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {smartInsights.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-6">Upload more data for personalized insights.</p>
                  ) : smartInsights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${ins.bg} flex items-center justify-center shrink-0`}>
                        <ins.icon className={`w-4.5 h-4.5 ${ins.color}`} />
                      </div>
                      <p className="text-sm text-text leading-relaxed">{ins.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ═══ ROW 3: Expense Donut + Income/Expense/Savings Bar ═══ */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-display font-bold text-text mb-5">Expense Breakdown</h3>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryPie} cx="50%" cy="50%" innerRadius={75} outerRadius={130} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'var(--color-text-secondary)', strokeWidth: 1 }}>
                        {categoryPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-display font-bold text-text mb-5">Income vs Expenses vs Savings</h3>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={iveData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text)', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={36} name="Amount">
                        <Cell fill="#10b981" />
                        <Cell fill="#f43f5e" />
                        <Cell fill="#f97316" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ═══ ROW 4: Daily Spending Trend (Area) + Weekly Pattern (Radar) ═══ */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Daily Spending Trend
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyArea} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(dailyArea.length / 12))} />
                      <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="value" stroke="#f97316" fill="url(#dailyGrad)" strokeWidth={2.5} name="Spending" dot={false} activeDot={{ r: 5, fill: '#f97316' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Weekly Pattern
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={weeklyRadar}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="day" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar name="Avg Spend" dataKey="amount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip content={<ChartTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ═══ ROW 5: Monthly Comparison + Spending by Week ═══ */}
            <div className="grid lg:grid-cols-2 gap-6">
              {monthlyComparison.length > 1 && (
                <Card className="p-6">
                  <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" /> Monthly Comparison
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyComparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expense" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <Card className={`p-6 ${monthlyComparison.length <= 1 ? 'lg:col-span-2' : ''}`}>
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Spending by Week of Month
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeOfMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} name="Spending">
                        {timeOfMonth.map((_, i) => <Cell key={i} fill={PIE_COLORS[i + 2]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ═══ ROW 6: Category Treemap ═══ */}
            <Card className="p-6">
              <h3 className="font-display font-bold text-text mb-5">Category Treemap — Proportional Spend</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={treemapData} dataKey="size" nameKey="name" stroke="var(--color-bg)" strokeWidth={3}
                    content={({ x, y, width, height, name, fill, value }) => {
                      if (width < 40 || height < 30) return null
                      const rx = Math.round(x)
                      const ry = Math.round(y)
                      const rw = Math.round(width)
                      const rh = Math.round(height)
                      const cx = Math.round(x + width / 2)
                      return (
                        <g>
                          <rect x={rx} y={ry} width={rw} height={rh} rx={8} fill={fill} opacity={0.85} className="hover:opacity-100 transition-opacity cursor-pointer" />
                          <text x={cx} y={Math.round(y + height / 2 - 6)} fill="#fff" stroke="none" fontSize={width > 80 ? 12 : 10} fontWeight="700" textAnchor="middle" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)', textRendering: 'optimizeLegibility' }}>{name}</text>
                          <text x={cx} y={Math.round(y + height / 2 + 12)} fill="#fff" stroke="none" fontSize={9} fontWeight="500" textAnchor="middle" opacity={0.9} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)', textRendering: 'optimizeLegibility' }}>₹{value?.toLocaleString('en-IN')}</text>
                        </g>
                      )
                    }} />
                </ResponsiveContainer>
              </div>
            </Card>

            {/* ═══ ROW 7: Top 5 + Category Table ═══ */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top 5 */}
              <Card className="p-6">
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" /> Top 5 Largest Expenses
                </h3>
                <div className="space-y-3">
                  {top5.map((t, i) => (
                    <div key={t.id || i} className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[i]?.[0] || '#f97316'}, ${GRADIENT_COLORS[i]?.[1] || '#fb923c'})` }}>
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate group-hover:text-primary transition-colors">{t.description || 'Transaction'}</p>
                        <p className="text-[11px] text-text-secondary">{t.category || 'Other'} &middot; {t.date}</p>
                      </div>
                      <p className="text-sm font-bold text-red-500 shrink-0">
                        Rs.{parseFloat(t.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  ))}
                  {top5.length === 0 && <p className="text-sm text-text-secondary text-center py-8">No expense data.</p>}
                </div>
              </Card>

              {/* Category Breakdown Table */}
              <Card className="p-6">
                <h3 className="font-display font-bold text-text mb-5 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" /> Category Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 text-text-secondary font-medium text-xs uppercase tracking-wider">Category</th>
                        <th className="text-right py-2.5 text-text-secondary font-medium text-xs uppercase tracking-wider">Amount</th>
                        <th className="text-right py-2.5 text-text-secondary font-medium text-xs uppercase tracking-wider">Share</th>
                        <th className="text-left py-2.5 pl-4 text-text-secondary font-medium text-xs uppercase tracking-wider w-28">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPie.map((c, i) => {
                        const pct = totalDebit > 0 ? (c.value / totalDebit * 100) : 0
                        return (
                          <tr key={c.name} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                            <td className="py-2.5 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-text font-medium truncate">{c.name}</span>
                            </td>
                            <td className="text-right text-text font-semibold py-2.5">Rs.{c.value.toLocaleString('en-IN')}</td>
                            <td className="text-right text-text-secondary py-2.5">{pct.toFixed(1)}%</td>
                            <td className="py-2.5 pl-4">
                              <div className="h-2 rounded-full bg-border/40 w-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* ═══ ROW 8: Statement Info Footer ═══ */}
            <Card className="p-5 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border-primary/20">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary">Period:</span>
                  <span className="font-semibold text-text">{stmtData.statement_period_start || '—'} to {stmtData.statement_period_end || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary">Bank:</span>
                  <span className="font-semibold text-text">{stmtData.bank_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary">Transactions:</span>
                  <span className="font-semibold text-text">{filteredTxns.length}</span>
                </div>
              </div>
            </Card>

          </div>
        )}
      </main>
    </div>
  )
}
