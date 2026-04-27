import React from 'react'
import { Card } from '../ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function IndexBar({ indices }) {
  const items = Object.values(indices || {})
  if (!items.length) return null

  return (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
      {items.map(idx => (
        <Card key={idx.name} className="min-w-[180px] flex-shrink-0 p-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{idx.name}</p>
          <p className="text-xl font-bold font-mono text-text mt-1">
            {idx.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${idx.is_up ? 'text-success' : 'text-danger'}`}>
            {idx.is_up
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />
            }
            <span>{idx.is_up ? '+' : ''}{idx.change?.toFixed(2)}</span>
            <span className="text-xs">({idx.is_up ? '+' : ''}{idx.change_pct?.toFixed(2)}%)</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
