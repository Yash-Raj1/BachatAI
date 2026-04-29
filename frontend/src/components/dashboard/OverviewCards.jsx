import React from 'react'
import { Card } from '../ui/Card'
import { ArrowUpRight, ArrowDownRight, IndianRupee, Activity } from 'lucide-react'

const MetricCard = ({ label, value, icon, iconBg, valueColor = 'text-text', sub }) => (
  <Card hover className="p-6">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
    </div>
    <div className={`flex items-baseline text-2xl font-bold font-mono ${valueColor}`}>
      <IndianRupee size={18} className="mr-0.5" />
      {value}
    </div>
    {sub && <p className="text-xs text-text-secondary mt-1.5">{sub}</p>}
  </Card>
)

export function OverviewCards({ data }) {
  const { total_credit, total_debit } = data
  const savings = total_credit - total_debit
  const healthScore = total_credit > 0 ? Math.min(Math.round((savings / total_credit) * 150), 100) : 0
  const savingsRate = total_credit > 0 ? ((savings / total_credit) * 100).toFixed(1) : '0'
  const fmt = (val) => val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const scoreColor = healthScore >= 70 ? 'text-success' : healthScore >= 40 ? 'text-primary' : 'text-danger'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Income"
        value={fmt(total_credit)}
        sub="This statement period"
        valueColor="text-success"
        iconBg="bg-success/15"
        icon={<ArrowDownRight size={18} className="text-success" />}
      />
      <MetricCard
        label="Total Expenses"
        value={fmt(total_debit)}
        sub="Across all categories"
        valueColor="text-danger"
        iconBg="bg-danger/15"
        icon={<ArrowUpRight size={18} className="text-danger" />}
      />
      <MetricCard
        label="Net Savings"
        value={fmt(savings)}
        sub={`${savingsRate}% savings rate`}
        valueColor="text-primary"
        iconBg="bg-primary/15"
        icon={<IndianRupee size={18} className="text-primary" />}
      />
      <Card hover className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-text-secondary">Financial Health</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <Activity size={18} className="text-primary" />
          </div>
        </div>
        <div className={`text-3xl font-bold font-display ${scoreColor}`}>
          {healthScore}
          <span className="text-sm font-medium text-text-secondary ml-1">/ 100</span>
        </div>
        <div className="mt-3 w-full bg-border rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-1000 ${scoreColor === 'text-success' ? 'bg-success' : scoreColor === 'text-primary' ? 'bg-primary' : 'bg-danger'}`}
            style={{ width: `${healthScore}%` }} />
        </div>
        <p className="text-xs text-text-secondary mt-1.5">
          {healthScore >= 70 ? '🟢 Excellent' : healthScore >= 40 ? '🟡 Good' : '🔴 Needs attention'}
        </p>
      </Card>
    </div>
  )
}
