import React from 'react'
import { twMerge } from 'tailwind-merge'

export function Button({ className, variant = 'primary', size = 'default', children, ...props }) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    primary:     'bg-gradient-to-r from-primary to-primary-dark text-white hover:brightness-110 hover:shadow-lg hover:shadow-primary/30 active:scale-95',
    destructive: 'bg-danger text-white hover:bg-red-600 shadow-sm active:scale-95',
    outline:     'border-2 border-primary/40 bg-transparent hover:bg-primary/10 hover:border-primary text-text',
    ghost:       'hover:bg-primary/10 text-text',
    subtle:      'bg-primary/10 text-primary hover:bg-primary/20',
  }
  
  const sizes = {
    default: 'h-10 px-5 py-2 text-sm',
    sm:      'h-9 rounded-lg px-3 text-sm',
    lg:      'h-12 rounded-xl px-8 text-base',
    icon:    'h-10 w-10',
  }

  return (
    <button
      className={twMerge(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
