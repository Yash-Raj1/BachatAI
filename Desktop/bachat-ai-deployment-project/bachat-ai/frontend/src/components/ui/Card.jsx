import React from 'react'
import { twMerge } from 'tailwind-merge'

export function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-border bg-card text-text shadow-sm transition-all duration-300',
        hover && 'hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
