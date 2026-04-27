import React from 'react'

export function OverspendAlert({ streak = 0, message = '' }) {
  if (!message) return null
  const isCritical = streak >= 4

  return (
    <div className={`rounded-xl px-3.5 py-2.5 mt-2 border animate-fade-in ${
      isCritical
        ? 'bg-danger/10 border-danger/30'
        : 'bg-warning/10 border-warning/30'
    }`}>
      <p className={`text-sm font-semibold leading-relaxed ${
        isCritical ? 'text-danger' : 'text-warning'
      }`}>
        {message}
      </p>
    </div>
  )
}
