import React, { useState, useMemo } from 'react'
import { Card } from '../ui/Card'
import {
  ArrowUpRight, ArrowDownRight, Coffee, ShoppingBag, Car, Film, Wallet,
  MoreHorizontal, SmartphoneNfc, ShoppingCart, Lightbulb, TrendingUp,
  X, Search, ChevronLeft, ChevronRight, AlertTriangle,
  Shield, GraduationCap, HeartPulse, Plane, CreditCard, Home, Heart, Landmark, Banknote
} from 'lucide-react'
import { ModalPortal } from '../ui/ModalPortal'

// Helper to map category strings to an icon (supports all 15+ categories)
const getCategoryIcon = (category) => {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('food') || cat.includes('dine'))   return <Coffee className="w-4 h-4" />
  if (cat.includes('grocer'))                          return <ShoppingCart className="w-4 h-4" />
  if (cat.includes('shop'))                            return <ShoppingBag className="w-4 h-4" />
  if (cat.includes('transport'))                       return <Car className="w-4 h-4" />
  if (cat.includes('entertain'))                       return <Film className="w-4 h-4" />
  if (cat.includes('util'))                            return <Lightbulb className="w-4 h-4" />
  if (cat.includes('rent') || cat.includes('housing')) return <Home className="w-4 h-4" />
  if (cat.includes('invest'))                          return <TrendingUp className="w-4 h-4" />
  if (cat.includes('insurance'))                       return <Shield className="w-4 h-4" />
  if (cat.includes('education'))                       return <GraduationCap className="w-4 h-4" />
  if (cat.includes('health') || cat.includes('medical')) return <HeartPulse className="w-4 h-4" />
  if (cat.includes('travel'))                          return <Plane className="w-4 h-4" />
  if (cat.includes('emi') || cat.includes('loan'))     return <CreditCard className="w-4 h-4" />
  if (cat.includes('income') || cat.includes('salary'))return <Wallet className="w-4 h-4" />
  if (cat.includes('charity'))                         return <Heart className="w-4 h-4" />
  if (cat.includes('bank charge'))                     return <Landmark className="w-4 h-4" />
  if (cat.includes('cash withdrawal'))                 return <Banknote className="w-4 h-4" />
  if (cat.includes('transfer'))                        return <ArrowUpRight className="w-4 h-4" />
  if (cat.includes('upi'))                             return <SmartphoneNfc className="w-4 h-4" />
  return <MoreHorizontal className="w-4 h-4" />
}

/* ─── Transaction Row (shared) ─── */
function TxnRow({ txn, idx }) {
  const isAnomaly = txn.is_anomaly === true
  return (
    <div key={txn.id || idx} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
      isAnomaly
        ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
        : 'border-border/50 bg-bg/50 hover:bg-bg'
    }`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
          isAnomaly
            ? 'bg-amber-500/15 text-amber-500'
            : txn.type === 'credit' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {isAnomaly
            ? <AlertTriangle className="w-5 h-5" />
            : txn.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text truncate max-w-[200px] sm:max-w-xs">{txn.description}</p>
            {isAnomaly && (
              <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                Unusual
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-secondary">{new Date(txn.date).toLocaleDateString()}</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-text-secondary flex items-center gap-1">
              {getCategoryIcon(txn.category)}
              {txn.category || 'Uncategorized'}
            </span>
          </div>
        </div>
      </div>
      <div className={`font-display font-bold text-lg shrink-0 ml-3 ${
        txn.type === 'credit' ? 'text-success' : 'text-text'
      }`}>
        {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  )
}

/* ─── All Transactions Modal ─── */
const PAGE_SIZE = 20

function AllTransactionsModal({ transactions, onClose }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all, credit, debit
  const [catFilter, setCatFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category || 'Uncategorized'))
    return ['all', ...Array.from(cats).sort()]
  }, [transactions])

  // Filtered + searched list
  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (catFilter !== 'all' && (t.category || 'Uncategorized') !== catFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (t.description || '').toLowerCase().includes(q) ||
                 (t.category || '').toLowerCase().includes(q) ||
                 (t.date || '').includes(q)
        }
        return true
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions, search, typeFilter, catFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Stats for filtered
  const totalCredit = filtered.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
  const totalDebit = filtered.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)

  // Reset page on filter change
  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1) }

  return (
    <ModalPortal>
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div className="w-full max-w-3xl max-h-[95vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-text">All Transactions</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {filtered.length} of {transactions.length} transactions
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-border/50 hover:bg-border flex items-center justify-center text-text-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs font-bold text-success">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Income: ₹{totalCredit.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-xs font-bold text-danger">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Spent: ₹{totalDebit.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search description, category..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => handleFilterChange(setTypeFilter)(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit Only</option>
              <option value="debit">Debit Only</option>
            </select>
            <select
              value={catFilter}
              onChange={e => handleFilterChange(setCatFilter)(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {paged.length > 0 ? paged.map((txn, i) => (
            <TxnRow key={txn.id || i} txn={txn} idx={i} />
          )) : (
            <div className="text-center py-12 text-sm text-text-secondary">
              No transactions match your filters.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 px-6 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}

/* ─── Main Component ─── */
export function RecentTransactions({ transactions = [] }) {
  const [showAll, setShowAll] = useState(false)

  if (!transactions.length) return null

  const anomalyCount = transactions.filter(t => t.is_anomaly === true).length
  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  return (
    <>
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-display font-bold text-text">Recent Transactions</h3>
            {anomalyCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {anomalyCount} anomal{anomalyCount > 1 ? 'ies' : 'y'}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAll(true)}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full transition-colors hover:bg-primary/20"
          >
            View All ({transactions.length})
          </button>
        </div>

        <div className="space-y-4">
          {recentTxns.map((txn, idx) => (
            <TxnRow key={txn.id || idx} txn={txn} idx={idx} />
          ))}
        </div>
      </Card>

      {/* All Transactions Modal */}
      {showAll && (
        <AllTransactionsModal
          transactions={transactions}
          onClose={() => setShowAll(false)}
        />
      )}
    </>
  )
}
