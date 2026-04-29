import React from 'react'
import { Card } from '../ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'

const RISK = {
  low:    { label: 'Low',    cls: 'bg-success/10 text-success border-success/20' },
  medium: { label: 'Medium', cls: 'bg-primary/10 text-primary border-primary/20' },
  high:   { label: 'High',   cls: 'bg-danger/10 text-danger border-danger/20' },
}

export function StockCard({ stock }) {
  const isUp = stock.is_up
  const risk = RISK[stock.risk] || RISK.medium
  const rangeWidth = stock.year_high > stock.year_low
    ? Math.min(100, ((stock.price - stock.year_low) / (stock.year_high - stock.year_low)) * 100)
    : 50

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-text text-base">{stock.symbol}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${risk.cls}`}>
              {risk.label}
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate mt-0.5">{stock.company}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-border/30 text-text-secondary">
            {stock.sector}
          </span>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="font-bold font-mono text-lg text-text">
            ₹{stock.price?.toLocaleString('en-IN')}
          </p>
          <div className={`flex items-center justify-end gap-1 text-sm font-bold ${isUp ? 'text-success' : 'text-danger'}`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isUp ? '+' : ''}{stock.change?.toFixed(2)}</span>
            <span className="text-xs">({isUp ? '+' : ''}{stock.change_pct?.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* 52-week range bar */}
      {stock.year_high > 0 && stock.year_low > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-text-secondary mb-1">
            <span>52W ₹{stock.year_low?.toLocaleString('en-IN')}</span>
            <span>₹{stock.year_high?.toLocaleString('en-IN')}</span>
          </div>
          <div className="h-1 rounded-full bg-border">
            <div
              className={`h-1 rounded-full transition-all duration-700 ${isUp ? 'bg-success' : 'bg-danger'}`}
              style={{ width: `${rangeWidth}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
