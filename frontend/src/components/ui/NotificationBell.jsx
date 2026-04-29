import React, { useState, useEffect, useRef } from 'react'
import { Bell, TrendingUp, TrendingDown, Target, Award, AlertTriangle, Sparkles, X, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

/**
 * NotificationBell — Generates dynamic, data-driven notifications
 * by querying real financial data from Supabase.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  
  // Persist dismissed notification IDs in localStorage so they don't reset on page navigations
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem('bachat_dismissed_notifications')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem('bachat_dismissed_notifications', JSON.stringify(Array.from(dismissed)))
  }, [dismissed])

  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Generate notifications from real data
  useEffect(() => {
    if (!user) return
    const generate = async () => {
      const notes = []
      try {
        // 1. Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('savings_goal, monthly_income, full_name')
          .eq('id', user.id)
          .single()

        // 2. Fetch latest statement
        const { data: stmts } = await supabase
          .from('statements')
          .select('*')
          .eq('user_id', user.id)
          .order('parsed_at', { ascending: false })
          .limit(1)

        if (!stmts || !stmts.length) {
          notes.push({
            id: 'no-statement',
            icon: 'upload',
            color: 'text-primary',
            bg: 'bg-primary/10',
            title: 'Upload your first statement',
            body: 'Drop your bank PDF to unlock full insights.',
            time: 'Now',
          })
          setNotifications(notes)
          return
        }

        const stmt = stmts[0]
        const totalCredit = parseFloat(stmt.total_credit || 0)
        const totalDebit = parseFloat(stmt.total_debit || 0)
        const savings = totalCredit - totalDebit
        const savingsRate = totalCredit > 0 ? (savings / totalCredit) * 100 : 0
        const goal = parseFloat(profile?.savings_goal || 0)

        // 3. Fetch transactions for category analysis
        const { data: txns } = await supabase
          .from('transactions')
          .select('amount, type, category')
          .eq('statement_id', stmt.id)

        const catSpend = {}
        ;(txns || []).forEach(t => {
          if (t.type === 'debit') {
            const c = t.category || 'Other'
            catSpend[c] = (catSpend[c] || 0) + parseFloat(t.amount)
          }
        })
        const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0]

        // ── Generate notifications ───────────────────────────
        // Goal achieved
        if (goal > 0 && savings >= goal) {
          notes.push({
            id: `goal-achieved-${stmt.id}`,
            icon: 'target',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            title: 'Monthly Goal Achieved!',
            body: `You saved Rs.${savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} against your Rs.${goal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} target. Keep it up!`,
            time: 'Just now',
          })
        } else if (goal > 0 && savings >= goal * 0.8) {
          notes.push({
            id: `goal-close-${stmt.id}`,
            icon: 'trending-up',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            title: 'Almost there!',
            body: `You're ${Math.round((savings / goal) * 100)}% towards your Rs.${goal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} goal. Just Rs.${(goal - savings).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more!`,
            time: 'Today',
          })
        }

        // Savings rate milestones
        if (savingsRate > 30) {
          notes.push({
            id: `great-saver-${stmt.id}`,
            icon: 'award',
            color: 'text-primary',
            bg: 'bg-primary/10',
            title: 'Outstanding Saver!',
            body: `Your savings rate is ${savingsRate.toFixed(0)}%. That's well above the ideal 20%. Impressive!`,
            time: 'This month',
          })
        } else if (savingsRate < 10 && totalCredit > 0) {
          notes.push({
            id: `low-savings-${stmt.id}`,
            icon: 'alert',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            title: 'Savings Rate Warning',
            body: `Your savings rate is only ${savingsRate.toFixed(0)}%. Try to aim for at least 20% of income.`,
            time: 'This month',
          })
        }

        // High spending category alert
        if (topCat && totalDebit > 0 && (topCat[1] / totalDebit) > 0.35) {
          notes.push({
            id: `high-cat-${topCat[0]}-${stmt.id}`,
            icon: 'trending-down',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            title: `High ${topCat[0]} spending`,
            body: `${topCat[0]} accounts for ${Math.round((topCat[1] / totalDebit) * 100)}% of your total spend. Consider reducing it.`,
            time: 'This month',
          })
        }

        // Statement uploaded recently
        if (stmt.parsed_at) {
          const parsed = new Date(stmt.parsed_at)
          const hoursDiff = (Date.now() - parsed.getTime()) / (1000 * 60 * 60)
          if (hoursDiff < 24) {
            notes.push({
              id: `recent-upload-${stmt.id}`,
              icon: 'sparkles',
              color: 'text-cyan-500',
              bg: 'bg-cyan-500/10',
              title: 'Statement Analyzed',
              body: `${stmt.bank_name || 'Bank'} statement processed with ${(txns || []).length} transactions.`,
              time: `${Math.round(hoursDiff)}h ago`,
            })
          }
        }

        // Badge count
        const { data: badges } = await supabase
          .from('badges')
          .select('id')
          .eq('user_id', user.id)
        if (badges && badges.length > 0) {
          notes.push({
            id: `badge-count-${badges.length}`,
            icon: 'award',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            title: `${badges.length} Badge${badges.length > 1 ? 's' : ''} Earned`,
            body: 'Check your achievements section to see all your financial milestones.',
            time: 'Active',
          })
        }

      } catch (err) {
        console.error('Notification generation failed:', err)
      }
      setNotifications(notes)
    }
    generate()
  }, [user])

  const iconMap = {
    'target': Target,
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'award': Award,
    'alert': AlertTriangle,
    'sparkles': Sparkles,
    'upload': Sparkles,
  }

  const unread = notifications.filter(n => !dismissed.has(n.id))
  const handleDismiss = (id) => setDismissed(prev => new Set([...prev, id]))
  const handleDismissAll = () => setDismissed(new Set(notifications.map(n => n.id)))

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        <Bell className="w-4.5 h-4.5 text-text-secondary" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg shadow-primary/40">
            {unread.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[480px] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl z-50 animate-fade-in-up">
          {/* Header */}
          <div className="sticky top-0 bg-card z-10 px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-text text-sm">Notifications</h3>
            {unread.length > 0 && (
              <button onClick={handleDismissAll} className="text-xs text-primary font-semibold hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-sm">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => {
                const IconComp = iconMap[n.icon] || Sparkles
                const isRead = dismissed.has(n.id)
                return (
                  <div
                    key={n.id}
                    className={`px-5 py-4 flex gap-3.5 transition-all ${isRead ? 'opacity-50' : 'hover:bg-primary/5'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${n.bg} flex items-center justify-center shrink-0`}>
                      <IconComp className={`w-4.5 h-4.5 ${n.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-text leading-tight">{n.title}</p>
                        {!isRead && (
                          <button onClick={() => handleDismiss(n.id)} className="shrink-0 p-0.5 rounded-md hover:bg-border/50 transition-colors">
                            <Check className="w-3.5 h-3.5 text-text-secondary" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-text-secondary/60 mt-1.5 font-medium uppercase tracking-wider">{n.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
