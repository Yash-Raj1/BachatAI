import React from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Lightbulb, Heart, AlertCircle, CheckCircle } from 'lucide-react'

const TaxRow = ({ label, value, className = '' }) => (
  <div className={`flex justify-between items-center py-3 border-b border-border last:border-0 text-sm ${className}`}>
    <span className="text-text">{label}</span>
    <span className="text-primary font-semibold">{value}</span>
  </div>
)

export default function TaxSaving() {
  return (
    <div className="min-h-screen bg-bg p-6 lg:p-12 transition-colors duration-300">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-display font-bold text-text mb-1">Tax Savings Centre</h1>
          <p className="text-text-secondary">Maximise your deductions under Section 80C, 80D, and more.</p>
        </header>

        <div className="space-y-6">
          {/* 80C */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold font-display text-text">Section 80C</h3>
                <p className="text-sm text-text-secondary">Max limit: ₹1,50,000 (Old Tax Regime)</p>
              </div>
              <Badge variant="success">Available</Badge>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2 text-text">
                <span className="font-medium">Utilised: <strong className="text-primary">₹45,000</strong></span>
                <span className="text-text-secondary">Remaining: ₹1,05,000</span>
              </div>
              <ProgressBar value={45000} max={150000} className="h-3" />
            </div>

            <div className="bg-primary/5 rounded-xl p-5 border border-primary/15">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm uppercase tracking-wide text-text-secondary">Smart Suggestions</h4>
              </div>
              <div className="space-y-1">
                <TaxRow label="ELSS Mutual Funds (3yr lock-in)" value="Invest up to ₹1.05L" />
                <TaxRow label="Public Provident Fund (PPF)" value="Safe, 7.1% p.a." />
                <TaxRow label="Term Insurance Premium" value="Protect & save tax" />
              </div>
            </div>
          </Card>

          {/* 80D */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold font-display text-text">Section 80D — Health Insurance</h3>
                <p className="text-sm text-text-secondary">Max limit: ₹25,000 (Self) + ₹50,000 (Parents)</p>
              </div>
              <Badge variant="warning">Action Needed</Badge>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              You currently have no registered health insurance premium payment on record.
            </p>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/25 text-sm">
              <Heart className="text-accent w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-text">
                An adequate health cover protects your savings from medical emergencies and could save you up to{' '}
                <strong className="text-primary">₹7,500</strong> in taxes annually.
              </span>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/5">
            <h3 className="font-bold text-text mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" /> Tax Saving Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Total Deductions', val: '₹45,000', color: 'text-primary' },
                { label: 'Additional Available', val: '₹1,05,000', color: 'text-text' },
                { label: 'Est. Tax Saved', val: '₹13,500', color: 'text-success' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-card rounded-xl p-4 border border-border text-center">
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <p className={`text-xl font-display font-bold ${color}`}>{val}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
