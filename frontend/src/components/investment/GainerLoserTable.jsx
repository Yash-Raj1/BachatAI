import React from 'react'
import { Card } from '../ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function GainerLoserTable({ title, stocks, type }) {
  return (
    <Card className="p-5">
      <h4 className="font-display font-bold text-text mb-4 text-sm">{title}</h4>
      {!stocks?.length ? (
        <p className="text-sm text-text-secondary">No data yet</p>
      ) : (
        <div className="space-y-1">
          {stocks.map(s => (
            <div
              key={s.symbol}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-border/20 transition-colors"
            >
              <div className="min-w-0">
                <span className="font-bold text-sm text-text">{s.symbol}</span>
                <span className="text-[11px] text-text-secondary ml-2">{s.sector}</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold font-mono text-text">
                  ₹{s.price?.toLocaleString('en-IN')}
                </p>
                <div className={`flex items-center justify-end gap-1 text-xs font-bold
                  ${type === 'gainer' ? 'text-success' : 'text-danger'}`}>
                  {type === 'gainer'
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  <span>{type === 'gainer' ? '+' : ''}{s.change_pct?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
