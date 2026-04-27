import React from 'react'
import { ShieldAlert, LogOut, MousePointerClick } from 'lucide-react'

/**
 * Session timeout warning banner — slides in from top when user is about to be logged out.
 */
export function SessionWarning({ secondsLeft, onExtend }) {
  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeStr = minutes > 0 
    ? `${minutes}:${secs.toString().padStart(2, '0')}` 
    : `${secs}s`

  // Urgency color — last 30 seconds turns red
  const isUrgent = secondsLeft <= 30

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] animate-fade-in">
      <div className={`max-w-xl mx-auto mb-4 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-colors ${
        isUrgent
          ? 'bg-danger/95 border-danger/50 text-white'
          : 'bg-card/95 border-amber-500/30 text-text'
      }`}>
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isUrgent ? 'bg-white/20' : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <ShieldAlert className={`w-5 h-5 ${isUrgent ? 'text-white' : 'text-amber-500'}`} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">
              {isUrgent ? '⚠️ Logging out soon!' : 'Session Expiring'}
            </p>
            <p className={`text-xs mt-0.5 ${isUrgent ? 'text-white/80' : 'text-text-secondary'}`}>
              You've been inactive. Auto-logout in <span className="font-mono font-bold">{timeStr}</span>
            </p>
          </div>

          {/* Countdown ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                className={isUrgent ? 'stroke-white/20' : 'stroke-border'} />
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                strokeDasharray={`${(secondsLeft / 120) * 94.2} 94.2`}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${isUrgent ? 'stroke-white' : 'stroke-amber-500'}`} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono ${
              isUrgent ? 'text-white' : 'text-text'
            }`}>
              {timeStr}
            </span>
          </div>

          {/* Stay Logged In button */}
          <button
            onClick={onExtend}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
              isUrgent
                ? 'bg-white text-danger hover:bg-white/90'
                : 'bg-primary text-white hover:opacity-90 shadow-md shadow-primary/25'
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            Stay Logged In
          </button>
        </div>

        {/* Progress bar */}
        <div className={`mt-3 h-1 rounded-full overflow-hidden ${isUrgent ? 'bg-white/20' : 'bg-border'}`}>
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? 'bg-white' : 'bg-amber-500'
            }`}
            style={{ width: `${(secondsLeft / 120) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
