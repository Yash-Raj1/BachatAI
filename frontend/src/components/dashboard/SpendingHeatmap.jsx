import React, { useState, useMemo } from 'react'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { Card } from '../ui/Card'
import {
  Calendar, X, ArrowUpRight, ArrowDownRight, Flame, TrendingDown,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { ModalPortal } from '../ui/ModalPortal'

/* ─── Day Detail Popup ─── */
function DayDetailModal({ date, transactions, onClose }) {
  if (!date) return null

  const dayTxns = transactions
    .filter(t => t.date === date)
    .sort((a, b) => Number(b.amount) - Number(a.amount))

  const totalSpend = dayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome = dayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)

  const dateObj = new Date(date + 'T00:00:00')
  const formatted = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <ModalPortal>
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Daily Breakdown</p>
              <h2 className="font-display text-lg font-bold text-text mt-0.5">{formatted}</h2>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-border/50 hover:bg-border flex items-center justify-center text-text-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-xs font-bold text-danger">
              <ArrowDownRight className="w-3.5 h-3.5" /> Spent: ₹{totalSpend.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs font-bold text-success">
              <ArrowUpRight className="w-3.5 h-3.5" /> Income: ₹{totalIncome.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Scrollable transactions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {dayTxns.length > 0 ? dayTxns.map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-bg/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text truncate">{txn.description || '—'}</p>
                <p className="text-xs text-text-secondary">{txn.category || 'Uncategorized'}</p>
              </div>
              <p className={`text-sm font-bold shrink-0 ml-3 ${txn.type === 'credit' ? 'text-success' : 'text-text'}`}>
                {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
              </p>
            </div>
          )) : (
            <div className="text-center py-8 text-sm text-text-secondary">No transactions on this day.</div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

/* ─── Main Component ─── */
export function SpendingHeatmap({ transactions = [] }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [tooltipData, setTooltipData] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)

  // ── Robust date parser — handles every format seen in Indian bank statements ──
  const MONTH_MAP = {
    jan:1,january:1, feb:2,february:2, mar:3,march:3, apr:4,april:4,
    may:5, jun:6,june:6, jul:7,july:7, aug:8,august:8,
    sep:9,sept:9,september:9, oct:10,october:10, nov:11,november:11, dec:12,december:12,
  }

  const parseDate = (dateStr) => {
    if (!dateStr) return null
    // Clean: trim, remove commas, normalize quotes/apostrophes, collapse spaces
    let s = String(dateStr).trim().replace(/,/g, ' ').replace(/[''`]/g, ' ').replace(/\s+/g, ' ').trim()

    const pad = (n) => String(n).padStart(2, '0')
    const expandYear = (y) => (y < 100 ? (y <= 50 ? 2000 + y : 1900 + y) : y)
    const mkResult = (y, m, d) => {
      if (m < 1 || m > 12 || d < 1 || d > 31) return null
      const iso = `${y}-${pad(m)}-${pad(d)}`
      return { year: y, isoDate: iso }
    }
    const monthNum = (name) => MONTH_MAP[name.toLowerCase().replace('.', '')] || 0

    let m

    // 1. ISO: YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) return mkResult(+m[1], +m[2], +m[3])

    // 2. YYYY/MM/DD or YYYY.MM.DD
    m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
    if (m) return mkResult(+m[1], +m[2], +m[3])

    // 3. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (and single-digit day/month)
    m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
    if (m) {
      const a = +m[1], b = +m[2], y = expandYear(+m[3])
      // Smart DD vs MM disambiguation (Indian default = DD/MM)
      if (a > 12 && b <= 12) return mkResult(y, b, a)     // a must be day
      if (b > 12 && a <= 12) return mkResult(y, a, b)     // b must be day (MM/DD)
      return mkResult(y, b, a)                             // Default: DD/MM/YYYY
    }

    // 4. DD Mon YYYY, DD-Mon-YYYY, DD/Mon/YYYY, DD Mon YY
    //    e.g. "22 Oct 2025", "14-Apr-2026", "1 Feb 26", "22 Oct 25"
    m = s.match(/^(\d{1,2})[/\-.\s]+([A-Za-z]+)[/\-.\s]+(\d{2,4})$/)
    if (m) {
      const mo = monthNum(m[2])
      if (mo) return mkResult(expandYear(+m[3]), mo, +m[1])
    }

    // 5. Mon DD YYYY, Month DD YYYY
    //    e.g. "Apr 14 2026", "April 14 2026"
    m = s.match(/^([A-Za-z]+)[.\s]+(\d{1,2})[,\s]+(\d{2,4})$/)
    if (m) {
      const mo = monthNum(m[1])
      if (mo) return mkResult(expandYear(+m[3]), mo, +m[2])
    }

    // 6. DD Mon (no year — assume current year)
    m = s.match(/^(\d{1,2})[/\-.\s]+([A-Za-z]+)$/)
    if (m) {
      const mo = monthNum(m[2])
      if (mo) return mkResult(new Date().getFullYear(), mo, +m[1])
    }

    // 7. YYYYMMDD (compact)
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (m) return mkResult(+m[1], +m[2], +m[3])

    // 8. Fallback: let JS parse (works for ISO-like strings)
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        return mkResult(d.getFullYear(), d.getMonth() + 1, d.getDate())
      }
    } catch {}

    return null
  }

  // Extract all available years from transaction data
  const availableYears = useMemo(() => {
    const years = new Set()
    transactions.forEach(t => {
      const parsed = parseDate(t.date)
      if (parsed && !isNaN(parsed.year)) years.add(parsed.year)
    })
    return Array.from(years).sort((a, b) => b - a) // newest first
  }, [transactions])

  // Auto-select the latest year
  useMemo(() => {
    if (availableYears.length && !selectedYear) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears])

  const { dailyData, startDate, endDate, maxSpend, avgSpend, highDays, lowDays, totalYearSpend, txnDaysCount } = useMemo(() => {
    const empty = { dailyData: [], startDate: new Date(), endDate: new Date(), maxSpend: 0, avgSpend: 0, highDays: 0, lowDays: 0, totalYearSpend: 0, txnDaysCount: 0 }
    if (!transactions.length || !selectedYear) return empty

    // Filter to debits in the selected year, normalizing date format as we go
    const daily = {}
    transactions.forEach(t => {
      if (t.type !== 'debit') return
      const parsed = parseDate(t.date)
      if (!parsed || parsed.year !== selectedYear) return
      const iso = parsed.isoDate
      daily[iso] = (daily[iso] || 0) + Number(t.amount)
    })

    const values = Object.values(daily)
    if (!values.length) return empty

    const max = Math.max(...values)
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const total = values.reduce((s, v) => s + v, 0)
    const data = Object.entries(daily).map(([date, count]) => ({ date, count }))

    return {
      dailyData: data,
      startDate: new Date(selectedYear, 0, 1),   // Jan 1
      endDate:   new Date(selectedYear, 11, 31),  // Dec 31
      maxSpend: max,
      avgSpend: avg,
      highDays: values.filter(v => v > avg * 1.5).length,
      lowDays:  values.filter(v => v < avg * 0.5).length,
      totalYearSpend: total,
      txnDaysCount: values.length,
    }
  }, [transactions, selectedYear])

  // Color by intensity — green (low) to red (high)
  const getClassForValue = (value) => {
    if (!value || !value.count) return 'heatmap-empty'
    const ratio = value.count / (maxSpend || 1)
    if (ratio <= 0.2) return 'heatmap-low'
    if (ratio <= 0.4) return 'heatmap-medium-low'
    if (ratio <= 0.6) return 'heatmap-medium'
    if (ratio <= 0.8) return 'heatmap-medium-high'
    return 'heatmap-high'
  }

  const canGoBack = availableYears.indexOf(selectedYear) < availableYears.length - 1
  const canGoForward = availableYears.indexOf(selectedYear) > 0

  const goYear = (dir) => {
    const idx = availableYears.indexOf(selectedYear)
    if (dir === -1 && canGoBack) setSelectedYear(availableYears[idx + 1])
    if (dir === 1 && canGoForward) setSelectedYear(availableYears[idx - 1])
  }

  if (!transactions.length || !availableYears.length) return null

  return (
    <>
      <Card className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

        {/* Header with year selector */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text">Spending Heatmap</h3>
              <p className="text-xs text-text-secondary">Click any day to view transactions</p>
            </div>
          </div>

          {/* Year Picker */}
          <div className="flex items-center gap-1">
            <button onClick={() => goYear(-1)} disabled={!canGoBack}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 min-w-[80px] text-center">
              <span className="text-sm font-display font-bold text-primary">{selectedYear}</span>
            </div>
            <button onClick={() => goYear(1)} disabled={!canGoForward}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-xs font-bold text-danger">
            <Flame className="w-3.5 h-3.5" />
            {highDays} high spend day{highDays !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs font-bold text-success">
            <TrendingDown className="w-3.5 h-3.5" />
            {lowDays} low spend day{lowDays !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            Avg: ₹{Math.round(avgSpend).toLocaleString('en-IN')}/day
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-border/30 text-xs font-bold text-text-secondary">
            {txnDaysCount} active day{txnDaysCount !== 1 ? 's' : ''} • Total: ₹{Math.round(totalYearSpend).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Heatmap */}
        {dailyData.length > 0 ? (
          <div className="spending-heatmap-wrapper">
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={dailyData}
              classForValue={getClassForValue}
              showWeekdayLabels={true}
              showMonthLabels={true}
              onClick={(value) => {
                if (value && value.date) setSelectedDate(value.date)
              }}
              onMouseOver={(e, value) => {
                if (value && value.count) {
                  setTooltipData({
                    date: value.date,
                    amount: value.count,
                    x: e?.clientX,
                    y: e?.clientY,
                  })
                }
              }}
              onMouseLeave={() => setTooltipData(null)}
              titleForValue={(value) => {
                if (!value) return 'No transactions'
                return `${value.date}: ₹${Number(value.count).toLocaleString('en-IN')}`
              }}
            />
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-text-secondary">
            No spending data for {selectedYear}.
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-text-secondary">Less</span>
          <div className="flex gap-1">
            {['heatmap-empty', 'heatmap-low', 'heatmap-medium-low', 'heatmap-medium', 'heatmap-medium-high', 'heatmap-high'].map(cls => (
              <div key={cls} className={`w-3.5 h-3.5 rounded-sm ${cls}`} />
            ))}
          </div>
          <span className="text-xs text-text-secondary">More</span>
        </div>

        {/* Hover tooltip */}
        {tooltipData && (
          <div
            className="fixed z-[60] px-3 py-2 rounded-lg bg-card border border-border shadow-xl text-xs pointer-events-none"
            style={{ left: (tooltipData.x || 0) + 12, top: (tooltipData.y || 0) - 40 }}
          >
            <p className="font-bold text-text">{tooltipData.date}</p>
            <p className="text-primary font-mono">₹{Number(tooltipData.amount).toLocaleString('en-IN')}</p>
          </div>
        )}
      </Card>

      {/* Day detail popup */}
      <DayDetailModal
        date={selectedDate}
        transactions={transactions}
        onClose={() => setSelectedDate(null)}
      />

      {/* Heatmap custom styles */}
      <style>{`
        .spending-heatmap-wrapper .react-calendar-heatmap {
          width: 100%;
        }
        .spending-heatmap-wrapper .react-calendar-heatmap text {
          font-size: 8px;
          fill: var(--color-text-secondary, #888);
        }
        .spending-heatmap-wrapper .react-calendar-heatmap rect {
          rx: 3;
          ry: 3;
          stroke: var(--color-border, #333);
          stroke-width: 1;
          cursor: pointer;
          transition: all 0.15s;
        }
        .spending-heatmap-wrapper .react-calendar-heatmap rect:hover {
          stroke: #7c3aed;
          stroke-width: 2;
          filter: brightness(1.15);
        }
        /* Color scale — teal (low spend = good) → purple → rose (high spend) */
        .react-calendar-heatmap .heatmap-empty  { fill: var(--color-border, #2a2a2a); opacity: 0.3; }
        .react-calendar-heatmap .heatmap-low          { fill: #0d9488; }
        .react-calendar-heatmap .heatmap-medium-low    { fill: #0284c7; }
        .react-calendar-heatmap .heatmap-medium        { fill: #7c3aed; }
        .react-calendar-heatmap .heatmap-medium-high   { fill: #e11d48; }
        .react-calendar-heatmap .heatmap-high          { fill: #dc2626; }
        /* Legend squares */
        .heatmap-empty        { background: var(--color-border, #2a2a2a); opacity: 0.3; }
        .heatmap-low          { background: #0d9488; }
        .heatmap-medium-low   { background: #0284c7; }
        .heatmap-medium       { background: #7c3aed; }
        .heatmap-medium-high  { background: #e11d48; }
        .heatmap-high         { background: #dc2626; }
      `}</style>
    </>
  )
}
