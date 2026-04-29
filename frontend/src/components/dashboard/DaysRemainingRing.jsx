import React from 'react'

export function DaysRemainingRing({ daysRemaining, daysInCycle = 30, color = '#00B07C' }) {
  const radius = 22
  const stroke = 4
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, daysRemaining / daysInCycle)
  const dashOffset = circ * (1 - pct)

  return (
    <div className="flex flex-col items-center">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none"
          className="stroke-border" strokeWidth={stroke} />
        <circle cx="28" cy="28" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="28" y="25" textAnchor="middle"
          fontSize="13" fontWeight="700" className="fill-text">
          {daysRemaining}
        </text>
        <text x="28" y="36" textAnchor="middle"
          fontSize="7" className="fill-text-secondary">
          days
        </text>
      </svg>
    </div>
  )
}
