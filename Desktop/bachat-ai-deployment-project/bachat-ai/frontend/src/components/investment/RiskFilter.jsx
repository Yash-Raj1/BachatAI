import React from 'react'

const FILTERS = [
  { key: 'all',    label: 'All',         color: 'text-text-secondary', bg: 'bg-border/30',   border: 'border-border' },
  { key: 'low',    label: 'Low Risk',    color: 'text-success',        bg: 'bg-success/10',  border: 'border-success/30' },
  { key: 'medium', label: 'Medium Risk', color: 'text-primary',        bg: 'bg-primary/10',  border: 'border-primary/30' },
  { key: 'high',   label: 'High Risk',   color: 'text-danger',         bg: 'bg-danger/10',   border: 'border-danger/30' },
]

export function RiskFilter({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {FILTERS.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
            ${active === f.key
              ? `${f.bg} ${f.color} ${f.border}`
              : 'bg-transparent text-text-secondary border-border hover:border-primary/30'
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
