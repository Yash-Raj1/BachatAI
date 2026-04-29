import React, { useMemo } from 'react'
import { Card } from '../ui/Card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#0d9488', '#e11d48', '#7c3aed', '#0284c7', '#c026d3', '#059669', '#2563eb']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-sm">
        <p className="font-bold text-text">{payload[0].payload.name}</p>
        <p className="text-primary font-mono">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
        <p className="text-text-secondary text-xs">{payload[0].payload.count} transactions</p>
      </div>
    )
  }
  return null
}

export function TopCategoriesChart({ transactions = [] }) {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'debit')
    const map = {}
    expenses.forEach(t => {
      const cat = t.category || 'Other'
      if (!map[cat]) map[cat] = { name: cat, value: 0, count: 0 }
      map[cat].value += Number(t.amount)
      map[cat].count += 1
    })
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [transactions])

  if (!data.length) return null

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold text-text">Top Spending Categories</h3>
        <p className="text-xs text-text-secondary mt-0.5">Where your money goes the most</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.1)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false}
            tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
