import React from 'react'
import { twMerge } from 'tailwind-merge'

export function ProgressBar({ value, max = 100, className, indicatorClassName, ...props }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={twMerge('h-2 w-full overflow-hidden rounded-full bg-gray-200', className)} {...props}>
      <div 
        className={twMerge('h-full bg-primary transition-all duration-500 ease-in-out', indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
