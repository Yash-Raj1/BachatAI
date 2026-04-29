import React from 'react'
import { twMerge } from 'tailwind-merge'

/**
 * Base skeleton pulse block.
 * Usage: <Skeleton className="h-4 w-20" />
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={twMerge(
        'animate-pulse rounded-lg bg-border/40',
        className
      )}
      {...props}
    />
  )
}

/**
 * Skeleton circle (for avatars / icons).
 */
export function SkeletonCircle({ size = 40, className }) {
  return (
    <Skeleton
      className={twMerge('rounded-full shrink-0', className)}
      style={{ width: size, height: size }}
    />
  )
}

/**
 * Skeleton text lines — multiple lines with decreasing width.
 */
export function SkeletonText({ lines = 3, className }) {
  const widths = ['100%', '85%', '70%', '60%', '50%']
  return (
    <div className={twMerge('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  )
}
