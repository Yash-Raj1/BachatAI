import React from 'react'
import { Card } from '../ui/Card'
import { AlertOctagon, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'

export function AnomalyDetection({ transactions }) {
  // Filter only DEBIT transactions marked as anomalies by the ML model.
  // Credit transactions (salary, refunds, transfers) should never be flagged.
  const anomalies = transactions?.filter(t => t.is_anomaly && t.type !== 'credit') || []

  if (anomalies.length === 0) return null

  return (
    <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shadow-inner border border-amber-500/20">
             <AlertOctagon className="w-5 h-5 text-amber-500" />
           </div>
           <div>
             <h3 className="font-display font-bold text-lg text-text">AI Anomaly Detection</h3>
             <p className="text-xs text-text-secondary">Our ML model flagged {anomalies.length} unusual pattern{anomalies.length > 1 ? 's' : ''} in your recent spending.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anomalies.slice(0, 6).map((txn, idx) => (
            <div key={txn.id || idx} className="bg-card p-4 rounded-xl border border-amber-500/20 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                {txn.type === 'credit' ? <ArrowUpRight className="w-5 h-5 text-amber-500" /> : <ArrowDownRight className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-text truncate" title={txn.description}>{txn.description || 'Unknown Transaction'}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-secondary">{new Date(txn.date).toLocaleDateString()}</p>
                  <p className={`font-bold text-sm ${txn.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                    {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="mt-3 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span className="leading-tight">Highly unusual amount/freq for <strong className="font-bold">{txn.category || 'this category'}</strong>.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
