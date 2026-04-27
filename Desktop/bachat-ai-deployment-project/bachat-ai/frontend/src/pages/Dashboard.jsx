import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton'
import { OverviewCards } from '../components/dashboard/OverviewCards'
import { ExpenseChart } from '../components/dashboard/ExpenseChart'
import { RatioMeter } from '../components/dashboard/RatioMeter'
import { RatioSettings } from '../components/dashboard/RatioSettings'
import { useAdaptiveRatio } from '../hooks/useAdaptiveRatio'
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart'
import { TopCategoriesChart } from '../components/dashboard/TopCategoriesChart'
import { SmartSpendingInsights } from '../components/dashboard/SmartSpendingInsights'
import { SavingsGoalCard } from '../components/dashboard/SavingsGoalCard'
import { UploadZone } from '../components/upload/UploadZone'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { RecurringPayments } from '../components/dashboard/RecurringPayments'
import { SpendingHeatmap } from '../components/dashboard/SpendingHeatmap'
import { AnomalyDetection } from '../components/dashboard/AnomalyDetection'
import { BadgeDisplay } from '../components/gamification/BadgeDisplay'
import { SalaryWidget } from '../components/dashboard/SalaryWidget'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { LayoutDashboard, Upload, Trash2, TrendingUp, FileText, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BachatLogo } from '../components/ui/BachatLogo'
import { supabase } from '../lib/supabase'
import { ProfileModal } from '../components/ui/ProfileModal'
import { NotificationBell } from '../components/ui/NotificationBell'
import { MLStatusBanner } from '../components/ui/MLStatusBanner'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showRatioSettings, setShowRatioSettings] = useState(false)

  const { ratio, loading: ratioLoading, saving: ratioSaving,
          activePct, activeSavingsPct, saveRatio } = useAdaptiveRatio()

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return
      try {
        // Fetch profile for savings goal
        const { data: profileData } = await supabase
          .from('profiles')
          .select('savings_goal, monthly_income, full_name')
          .eq('id', user.id)
          .single()
        if (profileData) setProfile(profileData)

        // Fetch the most recent parsed statement
        const { data: stmts, error: stmtErr } = await supabase
          .from('statements')
          .select('*')
          .eq('user_id', user.id)
          .order('parsed_at', { ascending: false })
          .limit(1)
        if (stmtErr) throw stmtErr

        if (stmts && stmts.length > 0) {
          const latestStatement = stmts[0]
          const { data: txns, error: txnsErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('statement_id', latestStatement.id)
            .order('date', { ascending: false })
          if (txnsErr) throw txnsErr
          setData({ ...latestStatement, transactions: txns || [] })
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAllData()
  }, [user])

  const handleUploadComplete = (parsedData) => {
    setData(parsedData.data)
    setIsUploadOpen(false)
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API}/api/upload/reset`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        setData(null)
        setIsResetOpen(false)
      }
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      {/* Top header bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                <BachatLogo size={17} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg text-gradient-orange hidden sm:block">Bachat AI</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 ml-3 border-l border-border pl-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </div>
              <Link to="/forecast" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <TrendingUp className="w-3.5 h-3.5" /> Forecast
              </Link>
              <Link to="/investments" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <BarChart3 className="w-3.5 h-3.5" /> Investment
              </Link>
              <Link to="/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <FileText className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Upload Statement button — always visible */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold hover:opacity-90 transition-opacity shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Statement</span>
            </button>
            {data && (
              <button
                onClick={() => setIsResetOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-danger/30 text-danger text-xs font-bold hover:bg-danger/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <NotificationBell />
            <ThemeToggle />
            {/* Clickable avatar opens profile modal */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
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

      {/* Upload Statement Modal */}
      {isUploadOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setIsUploadOpen(false) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl p-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-text">Upload Bank Statement</h2>
                <p className="text-xs text-text-secondary mt-1">PDF or CSV — all transactions will be parsed by AI</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="w-8 h-8 rounded-full bg-border/50 hover:bg-border flex items-center justify-center text-text-secondary transition-colors"
              >
                ✕
              </button>
            </div>
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setIsResetOpen(false) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl border border-danger/30 bg-card shadow-2xl p-8 animate-fade-in-up text-center">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-danger" />
            </div>
            <h2 className="font-display text-xl font-bold text-text mb-2">Reset All Data?</h2>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              This will permanently delete <strong>all your statements and transactions</strong> from the database. Your profile will remain. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsResetOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:border-primary/30 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {resetting ? 'Resetting…' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* ML wake-up banner — only shows while AI engine is starting */}
        <MLStatusBanner />

        {/* Greeting — skeleton while loading */}
        <div className="mb-8">
          {isLoading ? (
            <>
              <div className="h-8 w-56 rounded-lg bg-border/40 animate-pulse mb-2" />
              <div className="h-4 w-72 rounded-lg bg-border/40 animate-pulse" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold text-text mb-1">Welcome back! 👋</h1>
              <p className="text-text-secondary">Here's what's happening with your finances today.</p>
            </>
          )}
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : !data ? (
          <div className="space-y-6 animate-fade-in-up">
            {/* Empty state */}
            <Card className="p-10 text-center border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
                <BachatLogo size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-display font-bold text-text mb-2">Let's get started!</h2>
              <p className="text-text-secondary mb-8 max-w-md mx-auto">
                Upload your first bank statement to unlock powerful AI insights, spending analysis, and savings predictions.
              </p>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </Card>

            {/* Placeholder insight cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Total Balance', value: '₹—', sub: 'Upload statement to analyse', color: 'text-primary' },
                { label: 'Monthly Spend', value: '₹—', sub: 'Awaiting your data', color: 'text-danger' },
                { label: 'Savings Rate', value: '—%', sub: 'AI prediction pending', color: 'text-success' },
              ].map((c) => (
                <Card key={c.label} className="p-6 opacity-50">
                  <p className="text-text-secondary text-sm mb-1">{c.label}</p>
                  <p className={`text-3xl font-display font-extrabold ${c.color}`}>{c.value}</p>
                  <p className="text-text-secondary text-xs mt-1">{c.sub}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            {/* Row 1: Overview metric cards */}
            <OverviewCards data={data} />

            {/* Row 1.5: ML Anomaly Detection Alerts */}
            <AnomalyDetection transactions={data.transactions} />

            {/* Row 2: Monthly trend (full width) */}
            <MonthlyTrendChart transactions={data.transactions} />

            {/* Row 3: Spending Heatmap Calendar */}
            <SpendingHeatmap transactions={data.transactions} />

            {/* Row 4: Pie chart + Savings Goal radial gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ExpenseChart transactions={data.transactions} />
              </div>
              <SavingsGoalCard
                totalCredit={data.total_credit}
                totalDebit={data.total_debit}
                savingsGoal={profile?.savings_goal || 15000}
              />
            </div>

            {/* Row 4: Top Categories bar + Budget meter + Salary Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <TopCategoriesChart transactions={data.transactions} />
              </div>
              <div className="lg:col-span-1">
                <RatioMeter
                  ratio={ratio}
                  activePct={activePct}
                  activeSavingsPct={activeSavingsPct}
                  income={profile?.monthly_income || data?.total_credit || 0}
                  expenses={data?.total_debit || 0}
                  loading={ratioLoading}
                  onOpenSettings={() => setShowRatioSettings(true)}
                />
              </div>
              <div className="lg:col-span-1">
                <SalaryWidget />
              </div>
            </div>

            {/* Row 5: Recurring Payments Detection */}
            <RecurringPayments transactions={data.transactions} />

            {/* Row 6: AI Smart Spending Insights & Reduction Suggestions */}
            <SmartSpendingInsights
              transactions={data.transactions}
              totalCredit={data.total_credit}
              totalDebit={data.total_debit}
            />

            {/* Row 6: Recent transactions list */}
            <RecentTransactions transactions={data.transactions} />

            <BadgeDisplay />
          </div>
        )}
      </main>

      {/* ── Ratio Settings Modal ── */}
      <RatioSettings
        isOpen={showRatioSettings}
        onClose={() => setShowRatioSettings(false)}
        ratio={ratio}
        saving={ratioSaving}
        onSave={async (data) => {
          await saveRatio(data)
          setShowRatioSettings(false)
        }}
      />
    </div>
  )
}

