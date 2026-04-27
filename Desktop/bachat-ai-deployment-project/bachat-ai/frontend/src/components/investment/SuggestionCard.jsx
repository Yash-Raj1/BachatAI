import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { MiniChart } from './MiniChart'
import { TrendingUp, TrendingDown, Lightbulb, IndianRupee } from 'lucide-react'

const RISK = {
  low:    { label: 'Low Risk',    cls: 'bg-success/10 text-success border-success/20' },
  medium: { label: 'Medium Risk', cls: 'bg-primary/10 text-primary border-primary/20' },
  high:   { label: 'High Risk',   cls: 'bg-danger/10 text-danger border-danger/20' },
}

export function SuggestionCard({ stock, fetchChart }) {
  const [chartData, setChartData] = useState([])
  const risk = RISK[stock.risk] || RISK.medium
  const isUp = stock.is_up

  useEffect(() => {
    if (fetchChart) {
      fetchChart(stock.symbol).then(setChartData)
    }
  }, [stock.symbol, fetchChart])

  return (
    <Card hover className="p-5 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-text text-lg">{stock.symbol}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${risk.cls}`}>
                {risk.label}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {stock.company} · {stock.sector}
            </p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="font-bold font-mono text-xl text-text">
              ₹{stock.price?.toLocaleString('en-IN')}
            </p>
            <div className={`flex items-center justify-end gap-1 font-bold text-sm ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{stock.change_pct?.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Sparkline chart */}
        <MiniChart data={chartData} isUp={isUp} />

        {/* Investment suggestion */}
        <div className="bg-bg rounded-xl p-4 mt-3 border border-border">
          <p className="text-xs text-text-secondary mb-1">With your savings you can buy</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-display text-text">
              {stock.shares_can_buy} share{stock.shares_can_buy > 1 ? 's' : ''}
            </span>
            <span className="text-sm text-text-secondary">
              for ≈
            </span>
            <span className="text-lg font-bold font-mono text-primary flex items-center">
              <IndianRupee className="w-3.5 h-3.5" />
              {stock.invest_amount?.toLocaleString('en-IN')}
            </span>
          </div>
          {stock.sip_monthly > 0 && (
            <p className="text-xs text-success font-semibold mt-1.5">
              Or start a SIP of ₹{stock.sip_monthly?.toLocaleString('en-IN')}/month
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="flex items-start gap-2 mt-3 text-xs text-text-secondary leading-relaxed">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          <span>{stock.why}</span>
        </div>
      </div>
    </Card>
  )
}
