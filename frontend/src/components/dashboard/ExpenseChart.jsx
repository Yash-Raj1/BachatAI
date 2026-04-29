import React, { useMemo } from 'react'
import { Card } from '../ui/Card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

// Modern warm palette — earthy, premium tones that complement the orange brand
const COLORS = [
  '#0d9488', // deep teal
  '#e11d48', // cherry rose
  '#7c3aed', // vivid purple
  '#0284c7', // ocean blue
  '#c026d3', // magenta
  '#059669', // forest green
  '#dc2626', // classic red
  '#2563eb', // royal blue
  '#ca8a04', // warm gold
  '#9333ea', // grape
  '#0891b2', // dark cyan
  '#be123c', // crimson
  '#4f46e5', // deep indigo
  '#15803d', // dark emerald
  '#b91c1c', // deep red
  '#7e22ce', // deep purple
]

export function ExpenseChart({ transactions }) {
  const categoryData = useMemo(() => {
    if (!transactions) return []
    
    // Filter only debits
    const expenses = transactions.filter(t => t.type === 'debit')
    
    const sums = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount
      return acc
    }, {})

    return Object.entries(sums)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-semibold text-text">{payload[0].name}</p>
          <p className="text-primary font-mono">
            ₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6 h-full min-h-[400px]">
      <h3 className="mb-6 font-display text-lg font-bold text-text">Expenses by Category</h3>
      {categoryData.length > 0 ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[300px] items-center justify-center text-text-secondary">
          No expense data available
        </div>
      )}
    </Card>
  )
}
