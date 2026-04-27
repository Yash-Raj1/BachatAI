import React from 'react'
import { twMerge } from 'tailwind-merge'

export function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: 'bg-primary/15 text-primary-dark dark:text-primary-light border border-primary/20',
    success: 'bg-success/15 text-green-700 dark:text-green-300 border border-success/20',
    warning: 'bg-accent/15 text-amber-700 dark:text-amber-300 border border-accent/20',
    danger:  'bg-danger/15 text-red-700 dark:text-red-300 border border-danger/20',
    outline: 'border border-border text-text-secondary bg-transparent',
  }

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
