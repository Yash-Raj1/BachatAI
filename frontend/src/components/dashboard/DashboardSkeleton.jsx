import React from 'react'
import { Card } from '../ui/Card'
import { Skeleton, SkeletonCircle, SkeletonText } from '../ui/Skeleton'

/* ── Overview Cards Skeleton (4 metric cards) ─── */
function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-2.5 w-16" />
        </Card>
      ))}
    </div>
  )
}

/* ── Chart Skeleton (full-width) ─── */
function ChartSkeleton({ height = 'h-64' }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      {/* Chart area */}
      <div className={`${height} rounded-xl overflow-hidden relative`}>
        <Skeleton className="w-full h-full rounded-xl" />
        {/* Fake bar chart lines */}
        <div className="absolute inset-x-6 bottom-4 flex items-end gap-2 h-2/3">
          {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60, 75, 50].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md opacity-30"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ── Heatmap Skeleton ─── */
function HeatmapSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-44 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
      <div className="flex gap-2 mb-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-7 w-32 rounded-lg" />)}
      </div>
      {/* Grid of tiny squares */}
      <div className="grid grid-cols-[repeat(52,1fr)] gap-[3px]">
        {Array.from({ length: 364 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-sm opacity-20" />
        ))}
      </div>
    </Card>
  )
}

/* ── Side-by-side cards Skeleton ─── */
function SideBySideSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="w-full h-56 rounded-xl" />
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex justify-center">
          <Skeleton className="w-36 h-36 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 mx-auto mt-4" />
        <Skeleton className="h-3 w-24 mx-auto mt-2" />
      </Card>
    </div>
  )
}

/* ── Transaction List Skeleton ─── */
function TransactionsSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-40 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ── Insights Skeleton ─── */
function InsightsSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl mb-4" />
      <div className="grid sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-2xl border border-border/30">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-6 w-24 rounded-full mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   FULL DASHBOARD SKELETON — matches the exact layout of the real dashboard
   ═══════════════════════════════════════════════════════════════════════ */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Row 1: Overview metric cards */}
      <OverviewSkeleton />

      {/* Row 2: Monthly trend chart */}
      <ChartSkeleton height="h-64" />

      {/* Row 3: Spending heatmap */}
      <HeatmapSkeleton />

      {/* Row 4: Pie chart + Savings goal */}
      <SideBySideSkeleton />

      {/* Row 5: Bar chart + Budget meter */}
      <SideBySideSkeleton />

      {/* Row 6: Recurring payments / Insights */}
      <InsightsSkeleton />

      {/* Row 7: Recent transactions */}
      <TransactionsSkeleton />
    </div>
  )
}
