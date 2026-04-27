import React from 'react'
import { Card } from '../ui/Card'
import { twMerge } from 'tailwind-merge'
import {
  TrendingUp, TrendingDown, CheckCircle, AlertTriangle,
  Settings2, Zap, Info, PiggyBank, Target
} from 'lucide-react'

/** Colour-code the bar based on how much of the budget limit they've used. */
function barColor(usedPct, presetColor) {
  if (usedPct > 105) return '#E53935'
  if (usedPct > 90)  return '#F59E0B'
  return presetColor || '#0D9488'
}

export function RatioMeter({
  ratio, activePct, activeSavingsPct, income, expenses, onOpenSettings, loading
}) {
  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  if (loading) {
    return (
      <Card className="p-6 h-full min-h-[380px] flex flex-col gap-4">
        <div className="h-6 w-40 rounded-lg bg-border/40 animate-pulse" />
        <div className="h-4 w-56 rounded-lg bg-border/40 animate-pulse" />
        <div className="flex-1 flex flex-col justify-center gap-4">
          <div className="h-4 w-full rounded-full bg-border/40 animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-border/40 animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-border/40 animate-pulse" />
        </div>
      </Card>
    )
  }

  if (!ratio) return null

  const preset        = ratio.preset || {}
  const actualExpPct  = ratio.current_actual_expense_pct || (income > 0 ? Math.round((expenses / income) * 100) : 0)
  const budgetLimit   = (income || 0) * (activePct / 100)
  const usedPct       = budgetLimit > 0 ? Math.min((expenses / budgetLimit) * 100, 110) : 0
  const isOver        = expenses > budgetLimit
  const overByPct     = Math.max(0, actualExpPct - activePct)
  const targetSavings = (income || 0) * (activeSavingsPct / 100)
  const actualSavings = Math.max((income || 0) - (expenses || 0), 0)
  const color         = barColor(usedPct, preset.color)

  return (
    <Card className="p-6 h-full min-h-[380px] flex flex-col overflow-hidden relative">
      {/* Decorative gradient blob */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: preset.color || '#0D9488' }}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-1 relative">
        <div>
          <h3 className="font-display text-lg font-bold text-text">Smart Budget Ratio</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {ratio.mode === 'manual' ? '⚙️ Your custom ratio' : '✨ AI-personalised for you'}
          </p>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 mt-0.5"
          style={{ background: preset.bg_color, color: preset.color,
                   borderColor: `${preset.color}40` }}
        >
          {preset.short_label || `${activePct}:${activeSavingsPct}`}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-5">
        Spending <strong className="text-text">{activePct}%</strong> · Saving&nbsp;
        <strong className="text-text">{activeSavingsPct}%</strong>
        {ratio.mode === 'auto' && ratio.recommended_needs_pct !== undefined && (
          <span className="text-xs text-text-secondary/70 ml-1">
            (AI recommended)
          </span>
        )}
      </p>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        {/* ── Progress Bar ── */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-text">{actualExpPct.toFixed(0)}% actual vs {activePct}% limit</span>
            <span style={{ color }}>{isOver ? `Over by ${overByPct.toFixed(0)}%` : 'On track ✓'}</span>
          </div>
          <div className="relative h-4 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(usedPct, 100)}%`, background: color }}
            />
            {/* Budget limit marker at 100% */}
          </div>
          <div className="flex justify-between text-[10px] text-text-secondary mt-1">
            <span>₹0</span>
            <span>Limit: {fmt(budgetLimit)}</span>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-bg border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <PiggyBank className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
                Target Save
              </p>
            </div>
            <p className="text-base font-bold text-primary font-mono">{fmt(targetSavings)}</p>
            <p className="text-[10px] text-text-secondary">{activeSavingsPct}% of income</p>
          </div>

          <div className={twMerge(
            'p-3 rounded-xl border',
            isOver ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              {isOver
                ? <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                : <CheckCircle className="w-3.5 h-3.5 text-success" />}
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
                Actual Save
              </p>
            </div>
            <p className={twMerge('text-base font-bold font-mono',
               isOver ? 'text-danger' : 'text-success')}>{fmt(actualSavings)}</p>
            <p className="text-[10px] text-text-secondary">
              {income > 0 ? Math.max(0, 100 - Math.round((expenses / income) * 100)) : 0}% of income
            </p>
          </div>
        </div>

        {/* ── Feedback banner ── */}
        {isOver ? (
          <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>You've exceeded your {activePct}% spending target. Review your top categories.</span>
          </div>
        ) : actualSavings >= targetSavings ? (
          <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-xl text-xs text-success font-medium">
            <TrendingUp className="w-4 h-4 shrink-0 mt-px" />
            <span>Outstanding! You're on track to save {fmt(targetSavings * 12)} this year.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium">
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <span>{preset.advice || 'Keep spending within your ratio to hit your savings goal.'}</span>
          </div>
        )}

        {/* ── Customise button ── */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:opacity-90"
          style={{ borderColor: preset.color, color: preset.color,
                   background: preset.bg_color }}
        >
          <Settings2 className="w-4 h-4" />
          {ratio.mode === 'manual' ? 'Change my ratio' : 'Customise ratio'}
        </button>
      </div>
    </Card>
  )
}
