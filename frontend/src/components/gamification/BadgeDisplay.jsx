import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Award, Star, ShieldCheck, TrendingUp, Trophy, Flame } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// Map integer or string ID representations to their actual Lucide components
const iconMap = {
  Award,
  Star,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Flame,
}

export function BadgeDisplay() {
  const { user } = useAuth()
  const [earnedBadges, setEarnedBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBadges() {
      if (!user) return
      try {
        // Evaluate and award any newly met badge conditions
        await api.post('/gamification/badges/check', { user_id: user.id })
        
        // Fetch all badges and their status
        const res = await api.get(`/gamification/badges?user_id=${user.id}`)
        setEarnedBadges(res.data.badges || [])
      } catch (err) {
        console.error('Failed to fetch badges:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBadges()
  }, [user])

  const earnedCount = earnedBadges.filter((b) => b.earned).length

  if (loading) {
    return (
      <Card className="p-6">
        <div className="h-6 w-48 bg-border rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-border/50 rounded-2xl animate-pulse"></div>)}
        </div>
      </Card>
    )
  }

  // Handle case where API is down or returned none
  if (!earnedBadges || earnedBadges.length === 0) return null

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display text-lg font-bold text-text">Achievement Badges</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {earnedCount} of {earnedBadges.length} badges unlocked
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
              style={{ width: `${(earnedCount / earnedBadges.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-primary">{Math.round((earnedCount / earnedBadges.length) * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {earnedBadges.map((badge) => {
          const Icon = iconMap[badge.icon] || Trophy
          // Create a 15% opacity version of the hex color for the background
          const hex = badge.color.replace('P', '').replace('#', '')
          const r = parseInt(hex.substring(0, 2), 16)
          const g = parseInt(hex.substring(2, 4), 16)
          const b = parseInt(hex.substring(4, 6), 16)
          const bg = `rgba(${r},${g},${b},0.15)`

          return (
            <div
              key={badge.id}
              className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 ${
                badge.earned
                  ? 'border-border bg-bg hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-default'
                  : 'border-dashed border-border/60 bg-bg/50 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Earned glow ring */}
              {badge.earned && (
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at center, ${bg}, transparent 70%)` }}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 mb-3 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 ${badge.earned ? 'group-hover:scale-110 shadow-md' : ''}`}
                style={{ background: bg }}
              >
                <Icon
                  className="w-7 h-7"
                  style={{ color: badge.earned ? badge.color : 'var(--color-text-secondary)' }}
                />
              </div>

              {/* Text */}
              <div className="relative z-10">
                <p className="font-bold text-sm text-text leading-tight">{badge.name}</p>
                <p className="mt-1 text-[11px] text-text-secondary leading-snug">{badge.description}</p>

                {badge.earned ? (
                  <p className="mt-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-primary/80">
                    ✓ Earned {badge.earned_at ? new Date(badge.earned_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently'}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-secondary">
                    🔒 Locked
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
