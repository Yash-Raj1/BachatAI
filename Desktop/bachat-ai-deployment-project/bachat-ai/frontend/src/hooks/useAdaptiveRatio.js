import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export function useAdaptiveRatio() {
  const [ratio,   setRatio]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const fetchRatio = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get('/ratio/recommended')
      setRatio(data)
    } catch (err) {
      setError(err.message)
      // Graceful fallback
      setRatio({
        mode: 'auto',
        recommended_needs_pct: 60,
        recommended_savings_pct: 40,
        current_actual_expense_pct: 60,
        preset: {
          key: 'balanced', short_label: '60:40', label: 'Balanced (60:40)',
          color: '#0D9488', bg_color: '#F0FDFA',
          description: 'The classic personal finance rule.',
          advice: 'Split savings: emergency fund 15%, SIP 15%, goals 10%.',
          difficulty: 'Standard',
        },
        explanation: 'Could not connect to AI engine. Showing default 60:40.',
        improvement_monthly: 0, improvement_yearly: 0,
        all_presets: [], improvement_path: { needs_improvement: false, steps: [] },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const saveRatio = useCallback(async ({ mode, needs_pct, savings_pct }) => {
    try {
      setSaving(true)
      await api.post('/ratio/save', { mode, needs_pct, savings_pct })
      await fetchRatio()
    } catch (err) {
      console.error('[useAdaptiveRatio] saveRatio error:', err)
    } finally {
      setSaving(false)
    }
  }, [fetchRatio])

  useEffect(() => { fetchRatio() }, [fetchRatio])

  // Derived helpers
  const isManual        = ratio?.mode === 'manual'
  const activePct       = isManual ? (ratio?.needs_pct ?? 60) : (ratio?.recommended_needs_pct ?? 60)
  const activeSavingsPct = 100 - activePct

  return { ratio, loading, saving, error, activePct, activeSavingsPct, saveRatio, refetch: fetchRatio }
}
