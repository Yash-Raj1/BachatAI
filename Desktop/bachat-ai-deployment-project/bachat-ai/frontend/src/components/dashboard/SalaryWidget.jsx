import React from 'react'
import { useSalaryIntelligence } from '../../hooks/useSalaryIntelligence'
import { DailyBudgetBar } from './DailyBudgetBar'
import { OverspendAlert } from './OverspendAlert'
import { DaysRemainingRing } from './DaysRemainingRing'
import { Calendar } from 'lucide-react'

// Helper: ordinal suffix
const ordinal = n => {
  const s = { 1: 'st', 2: 'nd', 3: 'rd' }
  return n + (s[n < 20 ? n : n % 10] || 'th')
}

// Status color config
const STATUS = {
  on_track: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/40', label: 'On Track ✓' },
  warning:  { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/40', label: 'Warning ⚠️' },
  critical: { color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/40',  label: 'Critical 🚨' },
}

export function SalaryWidget() {
  const { data, loading, error } = useSalaryIntelligence()

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-border/40 rounded w-1/2 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="h-16 bg-border/40 rounded-xl" />
          <div className="h-16 bg-border/40 rounded-xl" />
          <div className="h-16 bg-border/40 rounded-xl" />
        </div>
        <div className="h-2 bg-border/40 rounded-full w-full mb-2" />
        <div className="h-16 bg-border/40 rounded-xl mt-4" />
      </div>
    )
  }

  // ── No data state ───────────────────────────────────────────────────────────
  if (!data || !data.widget_summary?.salary_day) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center h-full flex flex-col justify-center items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-bold text-text mb-1 text-lg">Salary Intelligence</h3>
        <p className="text-sm text-text-secondary">
          Upload 1+ month of bank statements to activate this feature.
        </p>
      </div>
    )
  }

  const s      = data.widget_summary
  const budget = data.budget
  const streak = data.streak
  const info   = data.salary_info
  const st     = STATUS[s.status] || STATUS.on_track

  // Compute ring color directly (hex) since SVG stroke needs it
  const ringColor = s.status === 'on_track' ? '#00B07C'
                  : s.status === 'warning'  ? '#F59E0B'
                  : '#E53935'

  return (
    <div className={`bg-card rounded-2xl border ${st.border} p-6 relative overflow-hidden flex flex-col h-full`}>
      {/* Subtle color accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${st.bg.split('/')[0]} opacity-50`} />

      {/* Widget header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-display font-bold text-text text-lg flex items-center gap-2">
            💰 Salary Intelligence
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Salary arrives on the{' '}
            <strong className="text-text">{ordinal(s.salary_day)}</strong>
            {' '}every month
            {info.confidence < 70 && (
              <span className="text-warning ml-1">(estimated)</span>
            )}
          </p>
        </div>
        <span className={`${st.bg} ${st.color} font-bold px-2.5 py-1 rounded-full text-xs shrink-0`}>
          {st.label}
        </span>
      </div>

      {/* Main 3-stat row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Balance remaining */}
        <div className="bg-bg rounded-xl p-3 text-center flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Balance Left</p>
          <p className={`mt-1 font-bold font-mono text-lg ${s.balance_remaining < s.daily_budget * 3 ? 'text-danger' : 'text-text'}`}>
            ₹{Math.round(s.balance_remaining).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Days remaining with ring */}
        <div className="text-center flex justify-center items-center py-1">
          <DaysRemainingRing
            daysRemaining={s.days_remaining}
            daysInCycle={budget.days_in_cycle || 30}
            color={ringColor}
          />
        </div>

        {/* Daily budget */}
        <div className={`${st.bg} rounded-xl p-3 text-center flex flex-col justify-center`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold ${st.color}`}>Daily Budget</p>
          <p className={`mt-1 font-bold font-mono text-lg ${st.color}`}>
            ₹{Math.round(s.daily_budget).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Burn rate bar */}
      <DailyBudgetBar
        dailyAvgSpent={s.daily_avg_spent}
        idealDaily={budget.ideal_daily_budget}
        burnRatePct={s.burn_rate_pct}
        status={s.status}
      />

      {/* Headline sentence */}
      <div className="bg-bg rounded-xl p-3 mt-4 border border-border">
        <p className="text-sm text-text italic leading-relaxed">
          "{data.headline}"
        </p>
      </div>

      {/* Overspend alert */}
      {streak.has_streak && (
        <div className="mt-2">
          <OverspendAlert streak={streak.streak} message={streak.message} />
        </div>
      )}

      {/* Last 7 days mini bar chart */}
      {data.daily_history?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border mt-auto">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
            Last {data.daily_history.length} days
          </p>
          <div className="flex gap-1 items-end h-8">
            {data.daily_history.map((day, i) => {
              const maxSpent = Math.max(...data.daily_history.map(d => d.spent), 1)
              const h = day.spent > 0 ? Math.max(20, (day.spent / maxSpent) * 100) : 10
              return (
                <div key={i} title={`${day.date}: ₹${day.spent}`} className="flex-1 group relative">
                  <div
                    className={`w-full rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity ${day.is_over ? 'bg-danger' : 'bg-success'}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[9px] font-semibold text-text-secondary mt-1">
            <span>{new Date(data.daily_history[0]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}
