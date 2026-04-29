import React from 'react'

/**
 * YouTube-style shimmer skeleton page loader.
 * Shows a full-page skeleton with animated shimmer effect
 * that makes users feel data is loading — keeps them engaged.
 */

/* ─── Shimmer bar (single rectangle with shimmer) ─── */
function Shimmer({ className = '', style }) {
  return (
    <div
      className={`shimmer-block rounded-lg ${className}`}
      style={style}
    />
  )
}

/* ─── Header skeleton ─── */
function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <Shimmer className="w-20 h-5 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <Shimmer className="w-24 h-7 rounded-lg" />
            <Shimmer className="w-20 h-7 rounded-lg" />
            <Shimmer className="w-20 h-7 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shimmer className="w-9 h-9 rounded-full" />
          <Shimmer className="w-9 h-9 rounded-full" />
          <Shimmer className="w-9 h-9 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─── KPI cards row ─── */
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shimmer className="w-10 h-10 rounded-xl" />
            <Shimmer className="w-20 h-3" />
          </div>
          <Shimmer className="w-28 h-7 mb-2" />
          <Shimmer className="w-16 h-2.5" />
        </div>
      ))}
    </div>
  )
}

/* ─── Chart skeleton ─── */
function ChartCardSkeleton({ height = 'h-64' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Shimmer className="w-10 h-10 rounded-xl" />
          <div>
            <Shimmer className="w-40 h-5 mb-2" />
            <Shimmer className="w-28 h-3" />
          </div>
        </div>
        <Shimmer className="w-20 h-8 rounded-full" />
      </div>
      <div className={`${height} rounded-xl relative overflow-hidden`}>
        <Shimmer className="w-full h-full rounded-xl" />
        {/* Fake chart bars */}
        <div className="absolute inset-x-6 bottom-4 flex items-end gap-2 h-3/5">
          {[45, 70, 30, 85, 55, 90, 40, 65, 35, 75, 50, 60].map((h, i) => (
            <Shimmer
              key={i}
              className="flex-1 rounded-t-md !opacity-40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Transaction list skeleton ─── */
function TransactionListSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <Shimmer className="w-44 h-6" />
        <Shimmer className="w-24 h-7 rounded-full" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-4">
              <Shimmer className="w-10 h-10 rounded-full" />
              <div>
                <Shimmer className="w-36 h-4 mb-2" />
                <div className="flex gap-2">
                  <Shimmer className="w-14 h-3" />
                  <Shimmer className="w-20 h-3 rounded-md" />
                </div>
              </div>
            </div>
            <Shimmer className="w-20 h-5" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Two-column layout skeleton ─── */
function TwoColSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shimmer className="w-10 h-10 rounded-xl" />
          <Shimmer className="w-36 h-5" />
        </div>
        <Shimmer className="w-full h-52 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shimmer className="w-10 h-10 rounded-xl" />
          <Shimmer className="w-28 h-5" />
        </div>
        <div className="flex justify-center">
          <Shimmer className="w-36 h-36 rounded-full" />
        </div>
        <Shimmer className="w-32 h-4 mx-auto mt-4" />
        <Shimmer className="w-24 h-3 mx-auto mt-2" />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   FULL PAGE SKELETON LOADER — YouTube-style shimmer effect
   ═══════════════════════════════════════════════════════════ */
export function PageShimmerLoader() {
  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      <HeaderSkeleton />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <KPISkeleton />
        <ChartCardSkeleton height="h-60" />
        <TwoColSkeleton />
        <TransactionListSkeleton />
      </div>
    </div>
  )
}

/**
 * A smaller inline skeleton loader for sections within a page.
 * Use this inside components that load data asynchronously.
 */
export function SectionShimmerLoader({ rows = 3 }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shimmer className="w-10 h-10 rounded-xl" />
            <div>
              <Shimmer className="w-32 h-4 mb-2" />
              <Shimmer className="w-20 h-3" />
            </div>
          </div>
          <Shimmer className="w-full h-3 mb-2" />
          <Shimmer className="w-4/5 h-3 mb-2" />
          <Shimmer className="w-3/5 h-3" />
        </div>
      ))}
    </div>
  )
}
