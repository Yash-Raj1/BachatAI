import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  X, IndianRupee, Target, Sliders, Mail,
  CheckCircle2, Pencil, Shield, LogOut, Save, User, Lock, ChevronRight
} from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-border bg-bg text-text px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-text-secondary'

const riskConfig = {
  low:    { label: 'Low',    sub: 'Safe — Fixed Deposits',        color: 'text-success bg-success/10' },
  medium: { label: 'Medium', sub: 'Balanced — Index Funds',       color: 'text-primary bg-primary/10' },
  high:   { label: 'High',   sub: 'Aggressive — Small Cap',       color: 'text-danger  bg-danger/10'  },
}

export function ProfileModal({ isOpen, onClose, profile: initialProfile, onProfileSave, onLogout }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(initialProfile || {})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password state
  const [isChangingPwd, setIsChangingPwd] = useState(false)
  const [pwdData, setPwdData] = useState({ newpwd: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' })

  useEffect(() => { setProfile(initialProfile || {}) }, [initialProfile])
  useEffect(() => { if (!isOpen) { setIsEditing(false); setIsChangingPwd(false); setSaved(false); setPwdMsg({type:'',text:''}) } }, [isOpen])

  const handleChange = e => setProfile(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        monthly_income: Number(profile.monthly_income),
        savings_goal: Number(profile.savings_goal),
        risk_appetite: profile.risk_appetite,
      })
      if (error) throw error
      setSaved(true)
      setIsEditing(false)
      if (onProfileSave) onProfileSave(profile)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Profile save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPwdMsg({ type: '', text: '' })
    if (pwdData.newpwd.length < 6) return setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
    if (pwdData.newpwd !== pwdData.confirm) return setPwdMsg({ type: 'error', text: 'Passwords do not match.' })
    
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdData.newpwd })
      if (error) throw error
      setPwdMsg({ type: 'success', text: 'Password successfully updated!' })
      setPwdData({ newpwd: '', confirm: '' })
      setTimeout(() => { setIsChangingPwd(false); setPwdMsg({type:'',text:''}) }, 2000)
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to update password.' })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const initials = (profile.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const fmt = v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—'
  const risk = riskConfig[profile.risk_appetite] || riskConfig.medium

  return (
    /* Overlay */
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm px-0 sm:px-4"
    >
      {/* Side drawer */}
      <div
        className="relative h-full sm:h-auto sm:max-h-[95vh] w-full sm:w-[400px] overflow-y-auto
          sm:rounded-3xl bg-card border border-border shadow-2xl
          flex flex-col animate-slide-in-right"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        {/* ── Top gradient band ── */}
        <div
          className="relative shrink-0 px-6 py-7"
          style={{ background: 'linear-gradient(135deg,#c2410c 0%,#f97316 60%,#fbbf24 100%)' }}
        >
          {/* dot grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px,white 1px,transparent 0)', backgroundSize: '24px 24px' }} />

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Avatar + name in one row — no overlap */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-display text-2xl font-black shadow-lg backdrop-blur-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">My Profile</p>
              <h2 className="text-white font-display text-xl font-bold leading-tight truncate">
                {profile.full_name || 'Your Profile'}
              </h2>
              <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />{user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-6 py-5 space-y-5">

          {/* Saved confirmation */}
          {saved && !isChangingPwd && (
            <div className="flex items-center gap-2 text-sm text-success font-semibold bg-success/10 border border-success/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile saved successfully!
            </div>
          )}

          {isChangingPwd ? (
            /* ── CHANGE PASSWORD MODE ── */
            <div className="space-y-4">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Change Password</p>

              {pwdMsg.text && (
                <div className={`flex items-center gap-2 text-sm font-semibold border rounded-xl px-4 py-3 ${
                  pwdMsg.type === 'success' ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20'
                }`}>
                  {pwdMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                  {pwdMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">New Password</label>
                <input type="password" value={pwdData.newpwd} onChange={e => setPwdData({ ...pwdData, newpwd: e.target.value })}
                  className={inputClass} placeholder="Enter your new password" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                <input type="password" value={pwdData.confirm} onChange={e => setPwdData({ ...pwdData, confirm: e.target.value })}
                  className={inputClass} placeholder="Re-enter your new password" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setIsChangingPwd(false); setPwdMsg({type:'',text:''}) }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:border-primary/30 hover:text-text transition-colors">
                  Cancel
                </button>
                <button onClick={handleUpdatePassword} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
                  <Lock className="w-4 h-4" /> {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>

          ) : isEditing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-4">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Edit Profile</p>

              {[
                { name: 'full_name',      label: 'Full Name',           type: 'text',   placeholder: 'Rahul Kumar' },
                { name: 'monthly_income', label: 'Monthly Income (₹)',  type: 'number', placeholder: '50000'       },
                { name: 'savings_goal',   label: 'Savings Goal (₹/mo)', type: 'number', placeholder: '15000'       },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">{f.label}</label>
                  <input name={f.name} type={f.type} value={profile[f.name] || ''}
                    onChange={handleChange} className={inputClass} placeholder={f.placeholder} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Risk Appetite</label>
                <select name="risk_appetite" value={profile.risk_appetite || 'medium'}
                  onChange={handleChange} className={inputClass}>
                  <option value="low">🛡️ Low — Safe, Fixed Deposits</option>
                  <option value="medium">⚖️ Medium — Balanced, Index Funds</option>
                  <option value="high">🚀 High — Aggressive, Small Cap</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:border-primary/30 hover:text-text transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

          ) : (
            /* ── VIEW MODE ── */
            <div className="space-y-4">

              {/* Edit action link */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Account Details</p>
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline transition-all">
                  <Pencil className="w-3 h-3" /> Edit Profile
                </button>
              </div>

              {/* Info rows — clean pill style */}
              <div className="space-y-2.5">
                {[
                  { icon: User,         label: 'Full Name',       value: profile.full_name      || '—' },
                  { icon: IndianRupee,  label: 'Monthly Income',  value: fmt(profile.monthly_income)   },
                  { icon: Target,       label: 'Savings Goal',    value: fmt(profile.savings_goal)     },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border/60">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary">{label}</p>
                      <p className="text-sm font-bold text-text truncate">{value}</p>
                    </div>
                  </div>
                ))}

                {/* Risk chip */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border/60">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-secondary">Risk Appetite</p>
                    <p className="text-sm font-bold text-text">{risk.label}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${risk.color}`}>
                    {risk.sub.split('—')[0].trim()}
                  </span>
                </div>
              </div>

              {/* Password change option */}
              <button 
                onClick={() => { setIsChangingPwd(true); setPwdData({ newpwd: '', confirm: '' }); setPwdMsg({ type: '', text: '' }) }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg border border-border/60 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs text-text-secondary">Security</p>
                    <p className="text-sm font-bold text-text">Change Password</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
              </button>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-text-secondary bg-success/5 border border-success/15 rounded-xl px-4 py-3">
                <Shield className="w-3.5 h-3.5 text-success shrink-0" />
                Data is encrypted & stored securely on Supabase.
              </div>

              {/* Sign out */}
              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-danger/30 text-danger text-sm font-bold hover:bg-danger/10 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
