import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/Card'
import { useAuth } from '../../context/AuthContext'
import {
  Brain, AlertTriangle, Lightbulb, Award, Bell, PiggyBank,
  RefreshCw, IndianRupee, Sparkles, X, ArrowRight,
  TrendingDown, TrendingUp, BarChart3, Target, CheckCircle2
} from 'lucide-react'
import { ModalPortal } from '../ui/ModalPortal'

const TYPE_CONFIG = {
  warning: { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20', gradient: 'from-amber-500 to-orange-500'  },
  tip:     { icon: Lightbulb,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',  gradient: 'from-blue-400 to-cyan-400'    },
  praise:  { icon: Award,         color: 'text-success',    bg: 'bg-success/10',     border: 'border-success/20',   gradient: 'from-emerald-400 to-green-500' },
  alert:   { icon: Bell,          color: 'text-danger',     bg: 'bg-danger/10',      border: 'border-danger/20',    gradient: 'from-red-400 to-rose-500'      },
  saving:  { icon: PiggyBank,     color: 'text-primary',    bg: 'bg-primary/10',     border: 'border-primary/20',   gradient: 'from-orange-400 to-amber-500'  },
}

/* ─── Insight Card (grid) ─── */
function InsightCard({ insight, index, onClick }) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip
  const Icon = config.icon

  return (
    <div
      className={`rounded-2xl border ${config.border} ${config.bg} p-4 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group`}
      onClick={onClick}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${config.bg} border ${config.border}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm text-text">{insight.title}</p>
            <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">
            {insight.body}
          </p>
          {insight.estimated_saving > 0 && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${config.color} ${config.bg} border ${config.border} rounded-full px-2.5 py-1`}>
              <IndianRupee className="w-3 h-3" />
              Save ~₹{Number(insight.estimated_saving).toLocaleString('en-IN')}/mo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Detail Modal ─── */
function InsightDetailModal({ insight, transactions, onClose }) {
  if (!insight) return null

  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip
  const Icon = config.icon

  // Find related transactions by matching keywords from the insight title/body
  const relatedTxns = useMemo(() => {
    if (!transactions?.length) return []
    const keywords = insight.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    // Also look at the insight body for category hints
    const bodyLower = insight.body.toLowerCase()

    return transactions
      .filter(t => {
        const desc = (t.description || '').toLowerCase()
        const cat = (t.category || '').toLowerCase()
        // Match: keyword in description, or category mentioned in body
        return keywords.some(k => desc.includes(k) || cat.includes(k)) ||
               (bodyLower.includes(cat) && cat !== 'other')
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
  }, [insight, transactions])

  const totalRelated = relatedTxns.reduce((s, t) => s + Number(t.amount), 0)

  // Action steps based on insight type
  const actionSteps = useMemo(() => {
    const steps = []
    if (insight.type === 'warning' || insight.type === 'alert') {
      steps.push('Review the flagged transactions below and identify unnecessary ones')
      steps.push('Set a weekly spending cap for this category using your banking app')
      steps.push('Enable spending alerts on your UPI app to track real-time')
    } else if (insight.type === 'tip' || insight.type === 'saving') {
      steps.push('Implement the suggested change starting this week')
      steps.push('Track progress by comparing this month vs next month')
      steps.push('Consider automating savings via a recurring SIP or RD')
    } else if (insight.type === 'praise') {
      steps.push('Keep maintaining this positive financial habit')
      steps.push('Consider increasing your savings goal by 5-10%')
      steps.push('Explore investment options to grow your saved money')
    }
    return steps
  }, [insight.type])

  return (
    <ModalPortal>
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className={`relative px-6 py-6 bg-gradient-to-r ${config.gradient}`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                {insight.type === 'praise' ? 'Achievement' : insight.type === 'alert' ? 'Alert' : 'Insight'}
              </p>
              <h2 className="text-white font-display text-lg font-bold">{insight.title}</h2>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Full insight description */}
          <div className="p-4 rounded-xl bg-bg border border-border/60">
            <p className="text-sm text-text leading-relaxed">{insight.body}</p>
          </div>

          {/* Estimated saving badge */}
          {insight.estimated_saving > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                <PiggyBank className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Estimated Monthly Saving</p>
                <p className="text-lg font-display font-bold text-success">
                  ₹{Number(insight.estimated_saving).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-text-secondary">Yearly</p>
                <p className="text-sm font-bold text-success">
                  ₹{Number(insight.estimated_saving * 12).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {/* Action steps */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Action Steps</p>
            </div>
            <div className="space-y-2">
              {actionSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-bg border border-border/60">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-text">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related transactions */}
          {relatedTxns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Related Transactions</p>
                </div>
                <span className="text-xs font-bold text-text-secondary">
                  Total: ₹{totalRelated.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1.5">
                {relatedTxns.map((txn, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        txn.type === 'credit' ? 'bg-success/10' : 'bg-danger/10'
                      }`}>
                        {txn.type === 'credit'
                          ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                          : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{txn.description?.slice(0, 45) || '—'}</p>
                        <p className="text-xs text-text-secondary">{txn.date} • {txn.category}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ml-3 ${
                      txn.type === 'credit' ? 'text-success' : 'text-text'
                    }`}>
                      {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick tip footer */}
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            Click "Refresh" on the insights card anytime for updated AI analysis.
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

/* ─── Main Component ─── */
export function SmartSpendingInsights({ transactions = [], totalCredit = 0, totalDebit = 0 }) {
  const { user } = useAuth()
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState(null)

  const fetchInsights = useCallback(async () => {
    if (!transactions.length) return
    setLoading(true)
    setError(null)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API}/api/analysis/smart-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            category: t.category,
            amount: t.amount,
            type: t.type,
            description: (t.description || '').slice(0, 60),
          })),
          total_credit: totalCredit,
          total_debit: totalDebit,
        }),
      })
      const data = await res.json()
      if (data.insights) {
        setInsights(data.insights)
        setHasFetched(true)
      } else {
        setError('No insights returned.')
      }
    } catch (err) {
      setError('Failed to connect to analysis server.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [transactions, totalCredit, totalDebit])

  useEffect(() => {
    if (transactions.length && !hasFetched) {
      fetchInsights()
    }
  }, [transactions.length, hasFetched, fetchInsights])

  const totalSaving = insights.reduce((s, i) => s + (i.estimated_saving || 0), 0)

  if (!transactions.length) return null

  return (
    <>
      <Card className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
                Smart Spending Insights
                <Sparkles className="w-4 h-4 text-accent" />
              </h3>
              <p className="text-xs text-text-secondary">AI-powered analysis — click a card for details</p>
            </div>
          </div>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        {/* Loading */}
        {loading && !insights.length && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-text">Analyzing your spending patterns…</p>
            <p className="text-xs text-text-secondary">Gemini AI is reviewing your transactions</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-sm text-danger">{error}</div>
        )}

        {insights.length > 0 && (
          <>
            {totalSaving > 0 && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
                <PiggyBank className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-bold text-success">
                    Potential Monthly Savings: ₹{Number(totalSaving).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-text-secondary">By following the suggestions below</p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {insights.map((ins, i) => (
                <InsightCard
                  key={i}
                  insight={ins}
                  index={i}
                  onClick={() => setSelectedInsight(ins)}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <InsightDetailModal
        insight={selectedInsight}
        transactions={transactions}
        onClose={() => setSelectedInsight(null)}
      />
    </>
  )
}
