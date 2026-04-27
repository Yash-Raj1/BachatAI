import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../ui/Card'
import {
  Repeat, AlertTriangle, CreditCard, Home, Tv, RefreshCw,
  ChevronDown, ChevronUp, Lock, Unlock, X, IndianRupee,
  TrendingUp, TrendingDown, Calendar, BarChart3
} from 'lucide-react'
import { ModalPortal } from '../ui/ModalPortal'

const TYPE_CONFIG = {
  subscription: { icon: Tv,         label: 'Subscription', color: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/20'  },
  emi:          { icon: CreditCard,  label: 'EMI',          color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  rent:         { icon: Home,        label: 'Rent',         color: 'text-purple-400',bg: 'bg-purple-400/10',border: 'border-purple-400/20'},
  recurring:    { icon: Repeat,      label: 'Recurring',    color: 'text-primary',   bg: 'bg-primary/10',   border: 'border-primary/20'   },
}

/* ─── Detail Modal ─── */
function RecurringDetailModal({ item, onClose }) {
  if (!item) return null
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.recurring
  const Icon = config.icon
  const hasAlerts = item.alerts && item.alerts.length > 0

  return (
    <ModalPortal>
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-primary to-primary-dark">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px,white 1px,transparent 0)', backgroundSize: '24px 24px' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{config.label}</p>
              <h2 className="text-white font-display text-lg font-bold leading-tight">{item.label}</h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Alert banner */}
          {hasAlerts && item.alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {alert.message}
            </div>
          ))}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Avg Monthly', value: `₹${item.avg_amount.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary' },
              { label: 'Months Seen', value: item.months_seen, icon: Calendar, color: 'text-blue-400' },
              { label: 'Total Spent', value: `₹${item.total_spent.toLocaleString('en-IN')}`, icon: BarChart3, color: 'text-danger' },
              { label: 'Last Charged', value: item.last_date ? new Date(item.last_date).toLocaleDateString() : '—', icon: Repeat, color: 'text-text-secondary' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-bg border border-border/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <p className="text-xs text-text-secondary">{s.label}</p>
                </div>
                <p className="text-sm font-bold text-text">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Amount history chart */}
          {item.amount_history && item.amount_history.length > 1 && (
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Amount History</p>
              <div className="flex items-end gap-1.5 h-24 px-1">
                {item.amount_history.map((h, i) => {
                  const maxAmt = Math.max(...item.amount_history.map(x => x.amount))
                  const heightPct = maxAmt > 0 ? (h.amount / maxAmt) * 100 : 0
                  const isLatest = i === item.amount_history.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${h.month}: ₹${h.amount}`}>
                      <span className="text-[10px] font-bold text-text-secondary">₹{h.amount}</span>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isLatest ? 'bg-primary' : 'bg-primary/30'}`}
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                      />
                      <span className="text-[9px] text-text-secondary whitespace-nowrap">{h.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category + type badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
              {config.label}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-border/30 text-text-secondary">
              {item.category}
            </span>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

/* ─── Main Component ─── */
export function RecurringPayments({ transactions = [] }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const fetchRecurring = useCallback(async () => {
    if (!transactions.length) return
    setLoading(true)
    setError(null)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API}/api/analysis/recurring-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            date: t.date,
            description: t.description || '',
            amount: t.amount,
            type: t.type,
            category: t.category || 'Other',
          })),
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      if (result.recurring) {
        setData(result)
      }
    } catch (err) {
      console.error('Recurring detection failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [transactions])

  useEffect(() => {
    if (transactions.length) fetchRecurring()
  }, [transactions.length, fetchRecurring])

  if (!transactions.length) return null
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Detecting recurring payments…</p>
            <p className="text-xs text-text-secondary">Analyzing payment patterns across months</p>
          </div>
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Recurring Payments</p>
              <p className="text-xs text-danger">{error}</p>
            </div>
          </div>
          <button onClick={fetchRecurring} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </Card>
    )
  }
  if (!data || !data.recurring?.length) return null

  const displayItems = expanded ? data.recurring : data.recurring.slice(0, 4)
  const alertCount = data.recurring.reduce((s, r) => s + (r.alerts?.length || 0), 0)

  return (
    <>
      <Card className="p-6 relative overflow-hidden">
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
              <Repeat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
                Recurring Payments
                {alertCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> {alertCount} alert{alertCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-text-secondary">Auto-detected EMIs, subscriptions & fixed payments</p>
            </div>
          </div>
          <button onClick={fetchRecurring} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Locked vs Flexible summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-3">
            <Lock className="w-5 h-5 text-danger shrink-0" />
            <div>
              <p className="text-xs text-text-secondary">Fixed Commitments</p>
              <p className="text-lg font-display font-bold text-danger">
                ₹{data.total_monthly_commitment.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-text-secondary ml-1">/mo</span>
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
            <Unlock className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-xs text-text-secondary">Locked % of Spending</p>
              <p className="text-lg font-display font-bold text-success">
                {data.locked_pct}%
                <span className="text-xs font-normal text-text-secondary ml-1">locked</span>
              </p>
            </div>
          </div>
        </div>

        {/* Type summary chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(data.summary).filter(([_, v]) => v > 0).map(([type, count]) => {
            const c = TYPE_CONFIG[type === 'other_recurring' ? 'recurring' : type] || TYPE_CONFIG.recurring
            return (
              <span key={type} className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.color} border ${c.border}`}>
                {count} {c.label}{count > 1 ? 's' : ''}
              </span>
            )
          })}
        </div>

        {/* Recurring items list */}
        <div className="space-y-2.5">
          {displayItems.map((item, i) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.recurring
            const Icon = config.icon
            const hasAlert = item.alerts && item.alerts.length > 0

            return (
              <div
                key={i}
                onClick={() => setSelectedItem(item)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
                  hasAlert ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/60 bg-bg/50 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${config.bg} border ${config.border}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate flex items-center gap-1.5">
                      {item.label}
                      {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {config.label} • {item.months_seen} months • {item.category}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-display font-bold text-text">
                    ₹{item.avg_amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-text-secondary">/month</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Show more / less */}
        {data.recurring.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-primary hover:underline"
          >
            {expanded ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Show All ({data.recurring.length})</>}
          </button>
        )}
      </Card>

      {/* Detail Modal */}
      <RecurringDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
