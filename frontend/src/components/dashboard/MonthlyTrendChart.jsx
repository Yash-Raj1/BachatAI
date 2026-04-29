import React, { useMemo } from 'react'
import { Card } from '../ui/Card'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-sm">
        <p className="font-bold text-text mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }} className="font-mono">
            {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function MonthlyTrendChart({ transactions = [] }) {
  const monthlyData = useMemo(() => {
    if (!transactions.length) return []

    const map = {}
    transactions.forEach(t => {
      if (!t.date) return
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
      if (!map[key]) map[key] = { month: label, Income: 0, Expenses: 0 }
      if (t.type === 'credit') map[key].Income += Number(t.amount)
      else map[key].Expenses += Number(t.amount)
    })

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [transactions])

  if (!monthlyData.length) return null

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-bold text-text">Monthly Cash Flow</h3>
          <p className="text-xs text-text-secondary mt-0.5">Income vs Expenses over time</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#0d9488'}} />Income</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#e11d48'}} />Expenses</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false}
            tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Income" stroke="#0d9488" strokeWidth={2.5} fill="url(#incomeGrad)" dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2, fill: 'white' }} />
          <Area type="monotone" dataKey="Expenses" stroke="#e11d48" strokeWidth={2.5} fill="url(#expenseGrad)" dot={{ r: 4, fill: '#e11d48', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#e11d48', strokeWidth: 2, fill: 'white' }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
