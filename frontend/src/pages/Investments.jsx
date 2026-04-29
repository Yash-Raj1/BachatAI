import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { NotificationBell } from '../components/ui/NotificationBell'
import { ProfileModal } from '../components/ui/ProfileModal'
import { BachatLogo } from '../components/ui/BachatLogo'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useStocks } from '../hooks/useStocks'
import { IndexBar } from '../components/investment/IndexBar'
import { RiskFilter } from '../components/investment/RiskFilter'
import { StockCard } from '../components/investment/StockCard'
import { SuggestionCard } from '../components/investment/SuggestionCard'
import { GainerLoserTable } from '../components/investment/GainerLoserTable'
import {
  TrendingUp, LayoutDashboard, FileText, RefreshCw,
  Sparkles, BarChart3, ListFilter, AlertTriangle, Clock
} from 'lucide-react'

export default function Investments() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('suggestions')
  const [stockRiskFilter, setStockRiskFilter] = useState('all')

  const {
    stocks, indices, suggestions, gainers, losers,
    loading, refreshing, lastUpdated, error,
    riskFilter, setRiskFilter,
    refetch, fetchChart,
  } = useStocks()

  // Fetch profile on mount
  React.useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('full_name, monthly_income, savings_goal')
      .eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  // Filter stocks by risk for All Stocks tab
  const filteredStocks = stockRiskFilter === 'all'
    ? stocks
    : stocks.filter(s => s.risk === stockRiskFilter)

  const TABS = [
    { key: 'suggestions', label: 'For You',    icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'market',      label: 'Market',     icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'all',         label: 'All Stocks', icon: <ListFilter className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      {/* ── Header ── */}
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
              <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <Link to="/forecast" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <TrendingUp className="w-3.5 h-3.5" /> Forecast
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10">
                <BarChart3 className="w-3.5 h-3.5" /> Investment
              </div>
              <Link to="/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text hover:bg-primary/5 transition-all">
                <FileText className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-text-secondary text-xs font-bold hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <NotificationBell />
            <ThemeToggle />
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

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title + timestamp */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-text">Investment</h1>
            <p className="text-text-secondary text-sm mt-1">
              {lastUpdated
                ? <>Live NSE prices · Updated {lastUpdated.toLocaleTimeString('en-IN')}</>
                : 'Loading market data…'
              }
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 mb-6">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <strong className="text-text">Disclaimer:</strong> Stock prices are delayed ~15 minutes (Yahoo Finance).
            This is for <strong>educational purposes only</strong> — not financial advice.
            Always consult a SEBI-registered advisor before investing.
          </p>
        </div>

        {loading ? (
          <InvestmentSkeleton />
        ) : (
          <>
            {/* Live Index Bar */}
            <IndexBar indices={indices} />

            {/* Error state */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 mb-6">
                <Clock className="w-4 h-4 text-danger" />
                <p className="text-sm text-danger">{error} Market hours: Mon–Fri 9:15 AM – 3:30 PM IST</p>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl bg-border/20">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${activeTab === tab.key
                      ? 'bg-card text-text shadow-sm border border-border'
                      : 'text-text-secondary hover:text-text'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ─── TAB: Suggestions ─── */}
            {activeTab === 'suggestions' && (
              <div className="space-y-6 animate-fade-in">
                {/* Risk filter for suggestions */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Risk Level:</span>
                  {['low', 'medium', 'high'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRiskFilter(r)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all capitalize
                        ${riskFilter === r
                          ? r === 'low' ? 'bg-success/10 text-success border-success/30'
                            : r === 'medium' ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-danger/10 text-danger border-danger/30'
                          : 'text-text-secondary border-border hover:border-primary/30'
                        }`}
                    >
                      {r} risk
                    </button>
                  ))}
                </div>

                <h3 className="font-display font-bold text-text text-lg">
                  ✨ Recommended for Your Savings
                </h3>
                {suggestions.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-text-secondary">
                      No suggestions available. Set your monthly income in your profile to get personalized recommendations.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {suggestions.map(stock => (
                      <SuggestionCard key={stock.symbol} stock={stock} fetchChart={fetchChart} />
                    ))}
                  </div>
                )}

                {/* Gainers and Losers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GainerLoserTable title="🚀 Top Gainers" stocks={gainers} type="gainer" />
                  <GainerLoserTable title="📉 Top Losers"  stocks={losers}  type="loser" />
                </div>
              </div>
            )}

            {/* ─── TAB: Market ─── */}
            {activeTab === 'market' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GainerLoserTable title="🚀 Today's Top Gainers" stocks={gainers} type="gainer" />
                  <GainerLoserTable title="📉 Today's Top Losers"  stocks={losers}  type="loser" />
                </div>
              </div>
            )}

            {/* ─── TAB: All Stocks ─── */}
            {activeTab === 'all' && (
              <div className="space-y-4 animate-fade-in">
                <RiskFilter active={stockRiskFilter} onChange={setStockRiskFilter} />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredStocks.map(stock => (
                    <StockCard key={stock.symbol} stock={stock} />
                  ))}
                </div>
                {filteredStocks.length === 0 && (
                  <Card className="p-8 text-center">
                    <p className="text-text-secondary">No stocks match this filter.</p>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

/* ── Skeleton Loader ── */
function InvestmentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Index bar skeleton */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 w-48 rounded-2xl bg-border/30 shrink-0" />
        ))}
      </div>
      {/* Tab skeleton */}
      <div className="h-12 rounded-xl bg-border/30" />
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-56 rounded-2xl bg-border/30" />
        ))}
      </div>
    </div>
  )
}
