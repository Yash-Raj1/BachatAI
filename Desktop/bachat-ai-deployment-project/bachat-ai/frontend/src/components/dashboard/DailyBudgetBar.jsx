import React from 'react'

const statusColor = {
  on_track: { bar: 'bg-success',  text: 'text-success' },
  warning:  { bar: 'bg-warning',  text: 'text-warning' },
  critical: { bar: 'bg-danger',   text: 'text-danger'  },
}

export function DailyBudgetBar({ dailyAvgSpent = 0, idealDaily = 0, burnRatePct = 0, status = 'on_track' }) {
  const s = statusColor[status] || statusColor.on_track
  const pct = Math.min(burnRatePct, 150)

  return (
    <div>
      <div className="flex justify-between text-xs text-text-secondary mb-1">
        <span>
          Avg spend/day:{' '}
          <strong className={s.text}>₹{Math.round(dailyAvgSpent).toLocaleString('en-IN')}</strong>
        </span>
        <span>Ideal: ₹{Math.round(idealDaily).toLocaleString('en-IN')}/day</span>
      </div>
      <div className="relative h-2 rounded-full bg-border overflow-hidden">
        {/* Ideal marker at 66.6% of track (100/150) */}
        <div className="absolute left-[66.6%] top-0 bottom-0 w-0.5 bg-text-secondary/30 z-10" />
        {/* Actual burn bar */}
        <div
          className={`h-full rounded-full ${s.bar} transition-all duration-500`}
          style={{ width: `${(pct / 150) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-text-secondary">
        {pct <= 100
          ? `Spending at ${pct.toFixed(0)}% of daily budget — on track`
          : `Spending ${(pct - 100).toFixed(0)}% over daily budget`
        }
      </p>
    </div>
  )
}
