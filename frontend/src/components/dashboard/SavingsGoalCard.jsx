import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Target, Edit2, Check, X as XIcon } from 'lucide-react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

export function SavingsGoalCard({ totalCredit = 0, totalDebit = 0, savingsGoal = 15000 }) {
  const { user } = useAuth()
  
  // Local state to manage the goal and edit mode
  const [localGoal, setLocalGoal] = useState(savingsGoal)
  const [isEditing, setIsEditing] = useState(false)
  const [tempGoal, setTempGoal] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Sync with prop if it changes from parent
  useEffect(() => {
    setLocalGoal(savingsGoal)
  }, [savingsGoal])

  const actualSavings = Math.max(0, totalCredit - totalDebit)
  const pct = localGoal > 0 ? Math.min(Math.round((actualSavings / localGoal) * 100), 100) : 0
  const fmt = v => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const gaugeData = [{ name: 'Progress', value: pct, fill: pct >= 100 ? '#0d9488' : pct >= 60 ? '#7c3aed' : '#e11d48' }]

  const handleSave = async () => {
    const newGoalVal = parseInt(tempGoal, 10)
    if (isNaN(newGoalVal) || newGoalVal <= 0) {
      alert("Please enter a valid positive number.")
      return
    }

    setIsSaving(true)
    try {
      await api.put('/gamification/goals', {
        user_id: user.id,
        savings_goal: newGoalVal
      })
      setLocalGoal(newGoalVal)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update goal:", err)
      alert("Could not update goal. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempGoal('')
  }

  const startEditing = () => {
    setTempGoal(localGoal.toString())
    setIsEditing(true)
  }

  return (
    <Card className="p-6 flex flex-col items-center text-center relative overflow-hidden">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-text">Savings Goal</h3>
        <button 
          onClick={!isEditing ? startEditing : undefined}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isEditing ? 'bg-primary/5 text-primary/50' : 'bg-primary/10 hover:bg-primary/20 hover:scale-105 text-primary'}`}
          title="Edit Goal"
        >
          <Target className="w-4 h-4" />
        </button>
      </div>

      {/* Radial gauge */}
      <div className="relative w-full" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%"
            startAngle={180} endAngle={0} data={gaugeData}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: 'rgba(150,150,150,0.1)' }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center transition-all duration-300">
          <p className="text-3xl font-display font-extrabold text-text">{pct}%</p>
          <p className="text-xs text-text-secondary whitespace-nowrap">of goal reached</p>
        </div>
      </div>

      <div className="w-full mt-5 space-y-3 text-sm">
        <div className="flex justify-between items-center py-1">
          <span className="text-text-secondary font-medium">Saved so far</span>
          <span className="font-bold text-success text-[15px]">{fmt(actualSavings)}</span>
        </div>
        
        {/* Goal Edit Field or Display */}
        <div className="flex justify-between items-center py-1 border-t border-b border-border/50 bg-bg/50 px-2 -mx-2 rounded-lg">
          <span className="text-text-secondary font-medium flex items-center gap-1.5">
            Monthly goal
            {!isEditing && (
              <button onClick={startEditing} className="text-text-secondary hover:text-primary transition-colors cursor-pointer">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </span>
          
          {isEditing ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">₹</span>
                <input 
                  type="number"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="w-24 pl-5 pr-2 py-1 bg-white dark:bg-stone-900 border border-primary/50 focus:border-primary rounded font-bold text-primary text-right outline-none text-xs shadow-[0_0_10px_rgba(249,115,22,0.1)]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  disabled={isSaving}
                />
              </div>
              <button onClick={handleSave} disabled={isSaving} className="w-6 h-6 rounded bg-success/15 hover:bg-success/30 text-success flex items-center justify-center transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCancel} disabled={isSaving} className="w-6 h-6 rounded bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center transition-colors">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="font-bold text-primary text-[15px]">{fmt(localGoal)}</span>
          )}
        </div>

        {actualSavings < localGoal && (
          <div className="flex justify-between items-center py-1">
            <span className="text-text-secondary font-medium">Gap remaining</span>
            <span className="font-bold text-danger text-[15px]">{fmt(localGoal - actualSavings)}</span>
          </div>
        )}
      </div>

      {pct >= 100 && (
        <div className="mt-5 w-full rounded-xl bg-gradient-to-r from-success/10 to-success/5 border border-success/20 p-3.5 text-sm text-success font-bold flex items-center justify-center gap-2 shadow-sm animate-fade-in-up">
          <span className="text-lg">🎉</span> Goal achieved this period!
        </div>
      )}
    </Card>
  )
}

