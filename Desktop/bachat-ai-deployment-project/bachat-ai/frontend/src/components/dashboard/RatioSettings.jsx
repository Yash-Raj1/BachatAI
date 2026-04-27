import React, { useState } from 'react'
import { ModalPortal } from '../ui/ModalPortal'
import { X, Sparkles, Settings2, ChevronRight, Info, TrendingUp } from 'lucide-react'

const PRESETS = [
  {
    key: 'aggressive_saver', needs: 50,
    label: '50:50 — Aggressive Saver', short: '50:50',
    color: '#00B07C', bg: '#E6F7F2',
    desc: 'Save half your income. Best for high earners or minimalists.',
  },
  {
    key: 'balanced', needs: 60,
    label: '60:40 — Balanced', short: '60:40',
    color: '#0D9488', bg: '#F0FDFA',
    desc: 'The classic rule. Ideal for most salaried Indians.',
  },
  {
    key: 'moderate', needs: 70,
    label: '70:30 — Moderate', short: '70:30',
    color: '#F59E0B', bg: '#FEF9EC',
    desc: 'High EMIs, dependents, or metro city costs.',
  },
  {
    key: 'constrained', needs: 80,
    label: '80:20 — Constrained', short: '80:20',
    color: '#F97316', bg: '#FFF7ED',
    desc: "Tight budget. Even 20% savings grows wealth.",
  },
  {
    key: 'survival', needs: 90,
    label: '90:10 — Survival Mode', short: '90:10',
    color: '#E53935', bg: '#FFF0F0',
    desc: 'Every rupee counts. Save whatever you can.',
  },
]

const inputCls =
  'w-full rounded-xl border border-border bg-bg text-text px-4 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

export function RatioSettings({ isOpen, onClose, ratio, onSave, saving }) {
  const aiNeeds    = ratio?.recommended_needs_pct ?? ratio?.ai_needs_pct ?? 60
  const initMode   = ratio?.mode ?? 'auto'
  const initNeeds  = initMode === 'manual' ? (ratio?.needs_pct ?? ratio?.custom_needs_pct ?? 60) : aiNeeds

  const [mode,       setMode]       = useState(initMode)
  const [needsPct,   setNeedsPct]   = useState(initNeeds)
  const [showSlider, setShowSlider] = useState(false)

  const savings    = 100 - needsPct
  const activePreset = PRESETS.find(p => p.needs === needsPct) || PRESETS[1]

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-fade-in-up">

          {/* ── Header gradient ── */}
          <div className="relative px-6 py-5"
               style={{ background: 'linear-gradient(135deg,#c2410c 0%,#f97316 60%,#fbbf24 100%)' }}>
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-display text-xl font-bold text-white">Set Budget Ratio</h2>
            <p className="text-sm text-white/80 mt-1">
              Choose how you split your income between spending & saving.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* ── Mode toggle ── */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[
                { val: 'auto',   icon: Sparkles,  label: 'AI Recommended' },
                { val: 'manual', icon: Settings2, label: 'Set Manually'   },
              ].map(({ val, icon: Icon, label }) => (
                <button key={val}
                  onClick={() => { setMode(val); if (val === 'auto') setNeedsPct(aiNeeds) }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
                    mode === val
                      ? 'bg-primary text-white'
                      : 'bg-bg text-text-secondary hover:text-text'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* ── Auto mode ── */}
            {mode === 'auto' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    AI Recommendation: {aiNeeds}:{100 - aiNeeds}
                  </p>
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 leading-relaxed">
                    {ratio?.explanation || 'Based on your income and spending history.'}
                  </p>
                </div>

                {(ratio?.improvement_monthly ?? 0) > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Following this ratio could add&nbsp;
                      <strong>₹{(ratio.improvement_monthly).toLocaleString('en-IN')}/month</strong>
                      &nbsp;= <strong>₹{(ratio.improvement_yearly).toLocaleString('en-IN')}/year</strong>&nbsp;to savings.
                    </p>
                  </div>
                )}

                {/* Show all presets with feasibility */}
                {ratio?.all_presets?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">All Options</p>
                    {ratio.all_presets.map(p => (
                      <div key={p.key}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-bg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-2 py-0.5 rounded-md"
                            style={{ background: p.bg_color, color: p.color }}>
                            {p.short_label}
                          </span>
                          <span className="text-text-secondary">{p.difficulty_text}</span>
                        </div>
                        {p.key === ratio.preset?.key && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            AI Pick
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Manual mode ── */}
            {mode === 'manual' && (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Pick a preset or use the slider for a custom value.
                </p>

                {/* Preset buttons */}
                {!showSlider && (
                  <div className="space-y-2">
                    {PRESETS.map(p => (
                      <button key={p.key}
                        onClick={() => setNeedsPct(p.needs)}
                        className="w-full text-left p-3.5 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: needsPct === p.needs ? p.color : 'var(--color-border)',
                          background:  needsPct === p.needs ? p.bg    : 'var(--color-bg)',
                        }}>
                        <span className="font-bold text-sm block"
                          style={{ color: needsPct === p.needs ? p.color : 'var(--color-text)' }}>
                          {p.label}
                        </span>
                        <span className="text-xs text-text-secondary">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom slider */}
                {showSlider && (
                  <div className="p-4 rounded-2xl border border-border bg-bg space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-text">Spending: {needsPct}%</span>
                      <span className="text-primary">Savings: {savings}%</span>
                    </div>
                    <input
                      type="range" min={40} max={90} step={5}
                      value={needsPct}
                      onChange={e => setNeedsPct(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary">
                      <span>40:60 (Very aggressive)</span>
                      <span>90:10 (Survival)</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowSlider(s => !s)}
                  className="w-full py-2 rounded-xl border border-dashed border-border text-xs text-text-secondary hover:text-text hover:border-primary/40 transition-colors"
                >
                  {showSlider ? '← Back to presets' : '⟷ Custom slider'}
                </button>

                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    AI will still analyse your spending in the background. Switch back to Auto anytime.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 pb-6">
            <div className="mb-3 p-3 rounded-xl text-center"
              style={{ background: activePreset.bg, color: activePreset.color }}>
              <p className="text-sm font-bold">
                {mode === 'auto'
                  ? `Saving AI-recommended ${aiNeeds}:${100 - aiNeeds} ratio`
                  : `Saving ${needsPct}:${savings} ratio`}
              </p>
            </div>
            <button
              disabled={saving}
              onClick={() => onSave({ mode, needs_pct: mode === 'auto' ? aiNeeds : needsPct,
                                     savings_pct: mode === 'auto' ? 100 - aiNeeds : savings })}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Ratio'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
