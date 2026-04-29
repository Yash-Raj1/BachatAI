import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { BachatLogo } from '../components/ui/BachatLogo'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { ArrowRight, ArrowLeft, User, Target, Sliders } from 'lucide-react'

const inputClass = 'w-full rounded-xl border border-border bg-white dark:bg-stone-900 text-text px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-text-secondary'
const labelClass = 'block text-sm font-semibold text-text mb-1.5'
const hintClass = 'text-xs text-text-secondary mt-1'

const steps = [
  { icon: User,    title: "Let's get to know you",    subtitle: 'Tell us the basics so we can personalise your dashboard.' },
  { icon: Target,  title: 'Set your savings goal',    subtitle: 'Help us understand what you are working towards.' },
  { icon: Sliders, title: 'Customize your experience', subtitle: 'Fine-tune how Bachat AI works for you.' },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '',
    monthly_income: '',
    city_tier: '2',
    dependents: '0',
    savings_goal: '',
    risk_appetite: 'medium',
    preferred_language: 'en'
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })
  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          monthly_income: Number(formData.monthly_income),
          city_tier: Number(formData.city_tier),
          dependents: Number(formData.dependents),
          savings_goal: Number(formData.savings_goal),
          risk_appetite: formData.risk_appetite,
          preferred_language: formData.preferred_language,
          onboarding_complete: true,
        })
      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const StepIcon = steps[step - 1].icon

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center group-hover:scale-105 transition-transform shadow">
            <BachatLogo size={17} className="text-white" />
          </div>
          <span className="font-display font-extrabold text-lg text-gradient-orange">Bachat AI</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg p-8 shadow-2xl animate-fade-in-up">
          {/* Progress */}
          <div className="mb-8">
            <ProgressBar value={(step / 3) * 100} max={100} className="h-1.5" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Step {step} of 3</p>
              <p className="text-xs text-text-secondary">{Math.round((step / 3) * 100)}% complete</p>
            </div>
          </div>

          {/* Step header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-text">{steps[step - 1].title}</h1>
              <p className="text-text-secondary text-sm mt-1">{steps[step - 1].subtitle}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm text-danger font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Step fields */}
          <div className="space-y-5">
            {step === 1 && (
              <>
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="full_name" value={formData.full_name}
                    onChange={handleChange} className={inputClass} placeholder="Rahul Kumar" required />
                </div>
                <div>
                  <label className={labelClass}>Monthly Income (₹)</label>
                  <input type="number" name="monthly_income" value={formData.monthly_income}
                    onChange={handleChange} className={inputClass} placeholder="50000" required />
                  <p className={hintClass}>Your approximate take-home salary per month.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>City Type</label>
                    <select name="city_tier" value={formData.city_tier} onChange={handleChange} className={inputClass}>
                      <option value="1">Tier 1 (Metro)</option>
                      <option value="2">Tier 2</option>
                      <option value="3">Tier 3 / Rural</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Dependents</label>
                    <input type="number" name="dependents" min="0" value={formData.dependents}
                      onChange={handleChange} className={inputClass} placeholder="0" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div>
                <label className={labelClass}>Monthly Savings Goal (₹)</label>
                <input type="number" name="savings_goal" value={formData.savings_goal}
                  onChange={handleChange} className={inputClass} placeholder="15000" required />
                <p className={hintClass}>Ideally, aim for at least 20–30% of your monthly income.</p>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className={labelClass}>Risk Appetite</label>
                  <p className={hintClass + ' mb-2'}>Helps us suggest better investment options for you.</p>
                  <select name="risk_appetite" value={formData.risk_appetite}
                    onChange={handleChange} className={inputClass}>
                    <option value="low">🛡️ Low — Safe, Fixed Deposits</option>
                    <option value="medium">⚖️ Medium — Balanced, Index Funds</option>
                    <option value="high">🚀 High — Aggressive, Small Cap Equities</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Preferred Language</label>
                  <select name="preferred_language" value={formData.preferred_language}
                    onChange={handleChange} className={inputClass}>
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 Hindi</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-10 flex justify-between items-center">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}
              className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {step < 3 ? (
              <Button onClick={handleNext}
                disabled={step === 1 && (!formData.full_name || !formData.monthly_income)}
                className="flex items-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-8">
                {loading ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Complete Setup <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
