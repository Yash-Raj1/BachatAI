import React from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

export function MiniChart({ data, isUp }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-[60px] rounded-lg bg-border/20 flex items-center justify-center">
        <p className="text-[11px] text-text-secondary">Loading chart…</p>
      </div>
    )
  }

  const color = isUp ? 'var(--color-success, #00B07C)' : 'var(--color-danger, #E53935)'

  return (
    <div className="h-[60px] my-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={800}
          />
          <Tooltip
            formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Price']}
            contentStyle={{
              fontSize: '11px', padding: '4px 8px',
              borderRadius: '8px',
              background: 'var(--color-card, #fff)',
              border: '1px solid var(--color-border, #e2e8f0)',
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
