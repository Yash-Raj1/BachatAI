import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import {
  ShieldCheck, TrendingUp, BarChart2, BarChart3, ChevronRight, ChevronLeft, Brain, Zap, Star, Quote,
  BadgeCheck, X, Users, Lock, FileText, Heart, Mail, Globe, Scale,
  Upload, PieChart, Sparkles, Target, MessageCircle, ArrowRight
} from 'lucide-react'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { BachatLogo } from '../components/ui/BachatLogo'
import { WorldMap } from '../components/ui/WorldMap'

/* ═══════════════════════════════════════════════════════════════
   ORBITAL TIMELINE — "How It Works" section
   Adapted from radial-orbital-timeline for Bachat AI (JSX, no TS)
   ═══════════════════════════════════════════════════════════════ */

const ORBITAL_STEPS = [
  {
    id: 1,
    icon: Upload,
    title: 'Upload Statement',
    desc: 'Drop your bank PDF or CSV — we support SBI, HDFC, ICICI, Axis and 20+ Indian banks.',
    tag: 'Bank Connect',
    color: '#f97316',
  },
  {
    id: 2,
    icon: PieChart,
    title: 'Smart Budgeting',
    desc: 'Our Adaptive Budget Engine sets personalised need/want/save ratios based on your income, city tier, and dependents.',
    tag: 'AI Engine',
    color: '#8b5cf6',
  },
  {
    id: 3,
    icon: BarChart2,
    title: 'Visual Insights',
    desc: 'Interactive charts, heatmaps, and trend lines reveal your complete financial picture.',
    tag: 'Analytics',
    color: '#06b6d4',
  },
  {
    id: 4,
    icon: Sparkles,
    title: 'Smart Alerts',
    desc: 'Get notified about recurring payment changes, spending spikes, and savings milestones.',
    tag: 'Real-time',
    color: '#ec4899',
  },
  {
    id: 5,
    icon: MessageCircle,
    title: 'Chat with Money',
    desc: 'Ask our AI chatbot anything — "How much did I spend on food?" and get instant answers.',
    tag: 'AI Chat',
    color: '#10b981',
  },
  {
    id: 6,
    icon: Target,
    title: 'Achieve Goals',
    desc: 'Set savings targets, track progress with gamified badges, and forecast your financial future.',
    tag: 'Gamification',
    color: '#eab308',
  },
]

function OrbitalTimeline() {
  const [activeId, setActiveId] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef(null)

  // Auto-rotate
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setRotation(prev => (prev + 0.25) % 360)
    }, 50)
    return () => clearInterval(timer)
  }, [paused])

  const handleNodeClick = (id) => {
    if (activeId === id) {
      setActiveId(null)
      setPaused(false)
    } else {
      setActiveId(id)
      setPaused(true)
      // Center the node at top
      const idx = ORBITAL_STEPS.findIndex(s => s.id === id)
      setRotation(270 - (idx / ORBITAL_STEPS.length) * 360)
    }
  }

  const handleBgClick = (e) => {
    if (e.target === containerRef.current) {
      setActiveId(null)
      setPaused(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onClick={handleBgClick}
      className="relative w-full flex items-center justify-center"
      style={{ height: '560px' }}
    >
      {/* Outer decorative ring */}
      <div className="absolute w-[420px] h-[420px] rounded-full orbital-ring opacity-50 animate-orbital-spin-reverse" />

      {/* Main orbit ring */}
      <div className="absolute w-[360px] h-[360px] rounded-full border border-primary/20 dark:border-primary/10" />

      {/* Inner ring */}
      <div className="absolute w-[300px] h-[300px] rounded-full orbital-ring opacity-30" />

      {/* Center nucleus */}
      <div className="absolute z-10 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary-dark to-accent flex items-center justify-center orbital-center-glow animate-orbital-pulse">
            <BachatLogo size={32} className="text-white" />
          </div>
          {/* Ping rings */}
          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary/30 animate-ping" />
          <div className="absolute -inset-2 w-24 h-24 rounded-full border border-primary/15 animate-ping" style={{ animationDelay: '0.7s' }} />
        </div>
        <p className="mt-3 text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-card/80 border border-primary/20 shadow-sm">Bachat AI</p>
      </div>

      {/* Orbital nodes */}
      {ORBITAL_STEPS.map((step, i) => {
        const angle = ((i / ORBITAL_STEPS.length) * 360 + rotation) % 360
        const radian = (angle * Math.PI) / 180
        const radius = 180
        const x = radius * Math.cos(radian)
        const y = radius * Math.sin(radian)
        const depth = (1 + Math.sin(radian)) / 2 // 0→1 for depth
        const scale = 0.75 + depth * 0.35
        const opacity = 0.45 + depth * 0.55
        const zIndex = Math.round(10 + depth * 50)
        const isActive = activeId === step.id
        const Icon = step.icon

        return (
          <div
            key={step.id}
            className="absolute cursor-pointer"
            style={{
              transform: `translate(${x}px, ${y}px) scale(${isActive ? 1.3 : scale})`,
              zIndex: isActive ? 200 : zIndex,
              opacity: isActive ? 1 : opacity,
              transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={(e) => { e.stopPropagation(); handleNodeClick(step.id) }}
          >
            {/* Glow */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${step.color}33 0%, transparent 70%)`,
                width: '80px',
                height: '80px',
                left: '-16px',
                top: '-16px',
              }}
            />

            {/* Node */}
            <div
              className={`
                orbital-node w-12 h-12 rounded-full flex items-center justify-center
                border-2 backdrop-blur-sm
                ${isActive
                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/40 scale-110'
                  : 'bg-white/80 dark:bg-stone-900/80 border-primary/30 dark:border-primary/20 text-primary'
                }
              `}
              style={isActive ? {} : { borderColor: `${step.color}50` }}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Label */}
            <div
              className={`
                absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-center
                transition-all duration-300
                ${isActive ? 'opacity-100 scale-110' : 'opacity-90 scale-90'}
              `}
            >
              <p className="text-[11px] font-bold text-text px-2.5 py-1 rounded-full bg-card/90 dark:bg-card/90 border border-border/60 shadow-sm backdrop-blur-sm">
                {step.title}
              </p>
            </div>

            {/* Expanded card */}
            {isActive && (
              <div
                className="absolute top-20 left-1/2 -translate-x-1/2 w-64 z-50 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3" style={{ background: step.color }} />
                <div className="rounded-2xl p-5 shadow-2xl glow-orange overflow-visible border border-primary/20 bg-card dark:bg-card">
                  {/* Tag + Step number */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: `${step.color}18`, color: step.color }}
                    >
                      {step.tag}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary">Step {step.id} / 6</span>
                  </div>

                  <h4 className="font-display font-bold text-text text-sm mb-1.5">{step.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   REVIEW CAROUSEL — 3D auto-sliding with pause-on-hover
   ═══════════════════════════════════════════════════════════════ */

const ALL_REVIEWS = [
  {
    name: 'Singh Nitish Kumar',
    role: 'Asst. Professor, UCER Prayagraj',
    stars: 5,
    review: 'Outstanding tool for financial tracking. The AI categorization is incredibly accurate with Indian bank statements. My students and I both use it — the heatmap feature alone changed how I view my monthly spending.',
    initials: 'SN',
    gradient: 'from-primary to-primary-dark',
  },
  {
    name: 'Priya Sharma',
    role: 'Software Engineer, Pune',
    stars: 4,
    review: 'I was skeptical about AI parsing my HDFC statement, but Bachat AI nailed every single transaction. The chatbot answering questions about my own data feels like having a personal accountant.',
    initials: 'PS',
    gradient: 'from-[#0d9488] to-[#059669]',
  },
  {
    name: 'Arjun Patel',
    role: 'CA & Tax Consultant, Ahmedabad',
    stars: 5,
    review: 'As a Chartered Accountant, I recommend this to all my clients. The 60:40 budget rule meter and recurring payment detection are exactly what most Indians need. Brilliant execution — the dark mode is gorgeous too.',
    initials: 'AP',
    gradient: 'from-[#7c3aed] to-[#4f46e5]',
  },
  {
    name: 'Meera Iyer',
    role: 'Product Manager, Bangalore',
    stars: 5,
    review: 'The spending heatmap and savings forecasting blew my mind. I finally understand where every paisa goes. The AI chatbot even told me I could save Rs.4,000/month just by cooking twice a week!',
    initials: 'MI',
    gradient: 'from-[#e11d48] to-[#be123c]',
  },
  {
    name: 'Rahul Verma',
    role: 'Freelance Designer, Delhi',
    stars: 5,
    review: 'As a freelancer with irregular income, budgeting was a nightmare. Bachat AI not only categorized my messy SBI statement but also detected all my subscription payments automatically. Game changer!',
    initials: 'RV',
    gradient: 'from-[#2563eb] to-[#1d4ed8]',
  },
]

function ReviewCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = ALL_REVIEWS.length
  const intervalRef = useRef(null)

  // Start auto-slide
  const startAutoSlide = () => {
    stopAutoSlide()
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % total)
    }, 3500)
  }

  // Stop auto-slide
  const stopAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Auto-rotate: start on mount, restart when unpaused
  useEffect(() => {
    if (!paused) {
      startAutoSlide()
    } else {
      stopAutoSlide()
    }
    return () => stopAutoSlide()
  }, [paused])

  const handleMouseEnter = () => setPaused(true)
  const handleMouseLeave = () => setPaused(false)

  const goTo = (i) => { setActive(i); setPaused(true); setTimeout(() => setPaused(false), 5000) }
  const prev = () => { setActive((active - 1 + total) % total) }
  const next = () => { setActive((active + 1) % total) }

  // Calculate position offset from center for each card
  const getOffset = (index) => {
    let diff = index - active
    // Wrap around for circular navigation
    if (diff > Math.floor(total / 2)) diff -= total
    if (diff < -Math.floor(total / 2)) diff += total
    return diff
  }

  return (
    <section id="reviews" className="relative z-10 py-24 bg-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">What People Say</p>
          <h2 className="text-4xl lg:text-5xl font-display font-extrabold text-text mb-4">
            Trusted by <span className="text-gradient-orange">thousands.</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">Real users sharing how Bachat AI transformed their financial habits.</p>
        </div>

        {/* 3D Carousel */}
        <div
          className="relative flex items-center justify-center"
          style={{ height: '380px', perspective: '1200px' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {ALL_REVIEWS.map((review, i) => {
            const offset = getOffset(i)
            const isCenter = offset === 0
            const absOffset = Math.abs(offset)

            // Only show cards within +-2 of center
            if (absOffset > 2) return null

            const translateX = offset * 340
            const translateZ = isCenter ? 60 : -(absOffset * 120)
            const translateY = isCenter ? -16 : absOffset * 12
            const scale = isCenter ? 1.08 : Math.max(0.75, 1 - absOffset * 0.12)
            const opacity = isCenter ? 1 : Math.max(0.5, 1 - absOffset * 0.25)
            const rotateY = offset * -4
            const zIndex = 50 - absOffset * 10

            return (
              <div
                key={review.name}
                className="absolute w-[340px] cursor-pointer"
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
                  opacity,
                  zIndex,
                  transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                  pointerEvents: isCenter ? 'auto' : 'none',
                }}
                onClick={() => goTo(i)}
              >
                <div
                  className={`
                    relative p-6 rounded-2xl border flex flex-col h-full
                    transition-shadow duration-500
                    ${isCenter
                      ? 'bg-card border-primary/40 shadow-2xl shadow-primary/15'
                      : 'bg-card border-border shadow-lg'
                    }
                  `}
                >
                  {/* Glow behind center card */}
                  {isCenter && (
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-xl -z-10" />
                  )}

                  {/* Quote icon */}
                  <Quote className={`absolute top-4 right-4 w-8 h-8 ${isCenter ? 'text-primary/20' : 'text-primary/10'}`} />

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`w-4 h-4 ${j < review.stars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-border fill-border'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs font-bold text-text-secondary">{review.stars}.0</span>
                  </div>

                  {/* Review text */}
                  <p className="text-text font-medium text-sm leading-relaxed flex-1 mb-5">
                    "{review.review}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                      {review.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-text text-sm truncate">{review.name}</p>
                        <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                      </div>
                      <p className="text-xs text-text-secondary font-semibold truncate">{review.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Left / Right arrows */}
          <button
            onClick={prev}
            className="absolute left-4 md:left-8 z-[60] w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/40 hover:shadow-primary/20 transition-all hover:scale-110"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 md:right-8 z-[60] w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/40 hover:shadow-primary/20 transition-all hover:scale-110"
            aria-label="Next review"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot navigation */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {ALL_REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`
                rounded-full transition-all duration-300
                ${i === active
                  ? 'w-8 h-2.5 bg-primary shadow-md shadow-primary/40'
                  : 'w-2.5 h-2.5 bg-border hover:bg-primary/40'
                }
              `}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
        </div>

        {/* Global Network + Trust Stats — compact 2-col */}
        <div className="mt-10 max-w-5xl mx-auto">
          <div className="text-center mb-5">
            <p className="text-primary font-semibold text-[10px] uppercase tracking-widest mb-1">Global Reach</p>
            <h3 className="text-xl lg:text-2xl font-display font-extrabold text-text">
              Serving users across <span className="text-gradient-orange">India & beyond.</span>
            </h3>
          </div>

          <div className="grid lg:grid-cols-4 gap-4 items-stretch">
            {/* World Map — left 3 cols, stretches to match stats height */}
            <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden shadow-md flex items-center">
              <WorldMap
                lineColor="#f97316"
                showLabels={false}
                dots={[
                  { start: { lat: 19.076, lng: 72.8777 }, end: { lat: 28.6139, lng: 77.209 } },
                  { start: { lat: 28.6139, lng: 77.209 }, end: { lat: 51.5074, lng: -0.1278 } },
                  { start: { lat: 19.076, lng: 72.8777 }, end: { lat: 1.3521, lng: 103.8198 } },
                  { start: { lat: 12.9716, lng: 77.5946 }, end: { lat: 37.7749, lng: -122.4194 } },
                  { start: { lat: 22.5726, lng: 88.3639 }, end: { lat: 25.2048, lng: 55.2708 } },
                  { start: { lat: 13.0827, lng: 80.2707 }, end: { lat: -33.8688, lng: 151.2093 } },
                ]}
              />
            </div>

            {/* Trust Stats — right 1 col, stretched to match map */}
            <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3">
              {[
                { value: '10,000+', label: 'Statements Analyzed', icon: '📄' },
                { value: '4.8 ★', label: 'Average Rating', icon: '⭐' },
                { value: '₹2.5Cr+', label: 'Savings Identified', icon: '💰' },
                { value: '98%', label: 'Accuracy Rate', icon: '🎯' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all group">
                  <span className="text-lg group-hover:scale-110 transition-transform">{stat.icon}</span>
                  <div>
                    <p className="text-xl font-display font-extrabold text-gradient-orange leading-tight">{stat.value}</p>
                    <p className="text-[11px] text-text-secondary font-semibold">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function Landing() {
  const [activeModal, setActiveModal] = useState(null) // 'about' | 'privacy' | 'terms' | null

  return (
    <>
    {/* ─── Slide-Over Drawer Panel ─── */}
    <div
      className={`fixed inset-0 z-[200] transition-all duration-500 ${activeModal ? 'visible' : 'invisible'}`}
      onClick={() => setActiveModal(null)}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-500 ${activeModal ? 'opacity-100' : 'opacity-0'}`} />

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-full md:w-[540px] lg:w-[600px] bg-white dark:bg-stone-950 shadow-[-20px_0_60px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-out flex flex-col ${activeModal ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Hero Header */}
        <div className="relative overflow-hidden px-8 pt-8 pb-6 bg-gradient-to-br from-primary via-primary-dark to-accent flex-shrink-0">
          {/* Decorative circles */}
          <div className="absolute top-[-30px] right-[-30px] w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 rounded-full bg-white/5 blur-lg" />

          {/* Close button */}
          <button
            onClick={() => setActiveModal(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all hover:rotate-90 duration-300"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + Title */}
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
              {activeModal === 'about' && <Users className="w-7 h-7 text-white" />}
              {activeModal === 'privacy' && <Lock className="w-7 h-7 text-white" />}
              {activeModal === 'terms' && <Scale className="w-7 h-7 text-white" />}
            </div>
            <h2 className="text-2xl font-display font-extrabold text-white">
              {activeModal === 'about' && 'About Us'}
              {activeModal === 'privacy' && 'Privacy Policy'}
              {activeModal === 'terms' && 'Terms of Service'}
            </h2>
            <p className="text-white/70 text-sm mt-1">
              {activeModal === 'about' && 'Learn about our mission and technology'}
              {activeModal === 'privacy' && 'How we protect your financial data'}
              {activeModal === 'terms' && 'Rules and guidelines for using Bachat AI'}
            </p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-7 text-text">

          {/* ── ABOUT US ── */}
          {activeModal === 'about' && (
            <>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15">
                <p className="text-[15px] leading-relaxed">
                  <strong className="text-gradient-orange">Bachat AI</strong> (बचत = Savings) is an AI-powered personal finance platform designed specifically for Indian users. We believe understanding your money shouldn't require a finance degree.
                </p>
              </div>

              {[
                { icon: Brain, color: '#f97316', bg: 'rgba(249,115,22,0.1)', title: 'Our Mission', desc: "To democratize financial intelligence for every Indian household. We leverage Google's Gemini AI to parse bank statements from SBI, HDFC, ICICI, Axis, and more — automatically categorizing transactions, detecting recurring payments, and generating personalized savings strategies." },
                { icon: Heart, color: '#0d9488', bg: 'rgba(13,148,136,0.1)', title: 'Why We Built This', desc: 'Most finance apps are built for Western banking systems. Indian statements have unique formats — UPI codes, NEFT references, IMPS IDs — that generic parsers can\'t handle. Bachat AI was built from the ground up for Indian banking, understanding 120+ merchants and payment patterns.' },
                { icon: Globe, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', title: 'Our Technology', desc: 'Built with React, Flask, and Supabase. Powered by Google Gemini AI for intelligent parsing and financial coaching. Our 96-test suite ensures every calculation — from health scores to recurring detection — is accurate and reliable.' },
                { icon: Mail, color: '#e11d48', bg: 'rgba(225,29,72,0.1)', title: 'Contact', desc: 'Have questions or feedback? Reach us at support@bachat-ai.com. We\'re a small, passionate team committed to helping Indians save smarter.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{background: item.bg}}>
                    <item.icon className="w-5 h-5" style={{color: item.color}} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] mb-1">{item.title}</h3>
                    <p className="text-text-secondary leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── PRIVACY POLICY ── */}
          {activeModal === 'privacy' && (
            <>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15">
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1">Last updated: March 2026</p>
                <p className="text-[15px] leading-relaxed">Your privacy is critically important to us. This policy explains how <strong className="text-gradient-orange">Bachat AI</strong> collects, uses, and protects your personal and financial data.</p>
              </div>

              {[
                { icon: FileText, color: '#f97316', bg: 'rgba(249,115,22,0.1)', title: '1. Information We Collect', desc: 'We collect your email address during registration, uploaded bank statements (PDF/CSV), and the transactions extracted from them. We also collect usage data (pages visited, features used) to improve our service.' },
                { icon: BarChart3, color: '#0d9488', bg: 'rgba(13,148,136,0.1)', title: '2. How We Use Your Data', desc: 'Your financial data is used exclusively to: (a) parse and categorize your transactions, (b) generate spending insights and savings tips, (c) power the AI chatbot with your real financial context. We never sell your data to third parties.' },
                { icon: ShieldCheck, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', title: '3. Data Storage & Security', desc: 'All data is stored in Supabase (PostgreSQL) with Row Level Security (RLS) — meaning each user can only access their own data. Uploaded PDFs are processed and then the temporary files are deleted. Passwords for encrypted PDFs are never stored.' },
                { icon: Users, color: '#e11d48', bg: 'rgba(225,29,72,0.1)', title: '4. Data Sharing', desc: 'We do not share, sell, or rent your personal or financial data to any third party. Transaction data is sent to Google Gemini AI for processing but is not stored by Google beyond the API call.' },
                { icon: Lock, color: '#0284c7', bg: 'rgba(2,132,199,0.1)', title: '5. Your Rights', desc: 'You have the right to: (a) access all your stored data, (b) delete all your data at any time using the "Reset Data" feature, (c) export your data as Excel reports, (d) close your account by contacting us.' },
                { icon: Globe, color: '#c026d3', bg: 'rgba(192,38,211,0.1)', title: '6. Cookies & Tracking', desc: 'We use localStorage to remember your theme preference (dark/light mode). We do not use advertising cookies or third-party tracking scripts. Session tokens are managed securely via Supabase Auth.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{background: item.bg}}>
                    <item.icon className="w-5 h-5" style={{color: item.color}} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] mb-1">{item.title}</h3>
                    <p className="text-text-secondary leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── TERMS OF SERVICE ── */}
          {activeModal === 'terms' && (
            <>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15">
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1">Effective: March 2026</p>
                <p className="text-[15px] leading-relaxed">By using <strong className="text-gradient-orange">Bachat AI</strong>, you agree to the following terms. Please read them carefully.</p>
              </div>

              {[
                { title: '1. Acceptance of Terms', desc: 'By accessing or using Bachat AI, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.' },
                { title: '2. Service Description', desc: 'Bachat AI is a personal finance analysis tool that parses bank statements using AI and provides spending insights. It is an educational and analytical tool — not a certified financial advisor.' },
                { title: '3. User Responsibilities', desc: 'You are responsible for: (a) maintaining the security of your account credentials, (b) ensuring uploaded statements belong to you or you have authorization, (c) the accuracy of any financial goals you provide.' },
                { title: '4. Acceptable Use', desc: 'You may not: (a) use the service for any illegal purpose, (b) attempt to reverse-engineer, hack, or overload our systems, (c) upload documents that do not belong to you, (d) use automated bots to abuse the API.' },
                { title: '5. Limitation of Liability', desc: 'Bachat AI is provided "as is" without warranties of any kind. We are not liable for: (a) inaccuracies in AI-generated categorizations, (b) financial decisions based on our suggestions, (c) any data loss.' },
                { title: '6. Rate Limits & Fair Use', desc: 'We enforce rate limits: 20 chat messages/hour, 5 statement uploads/day, and 60 analysis requests/hour. Exceeding these limits may result in temporary access restrictions.' },
                { title: '7. Account Termination', desc: 'We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account and all associated data at any time through the dashboard.' },
                { title: '8. Changes to Terms', desc: 'We may update these terms periodically. Continued use of the service after changes constitutes acceptance. Major changes will be communicated via the app.' },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <span className="text-primary font-bold text-sm">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] mb-1">{item.title}</h3>
                    <p className="text-text-secondary leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-border bg-white/80 dark:bg-stone-950/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-text-secondary">© {new Date().getFullYear()} Bachat AI</p>
          <button onClick={() => setActiveModal(null)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>


    <div className="relative min-h-screen bg-bg overflow-hidden text-text transition-colors duration-300">
      {/* Animated background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-primary/25 dark:bg-primary/20 blur-[130px] animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/30 dark:bg-accent/20 blur-[130px] animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] rounded-full bg-primary-dark/15 dark:bg-primary-dark/10 blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
            <BachatLogo size={20} className="text-white" />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-gradient-orange">
            Bachat AI
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden md:flex gap-3">
            <Link to="/auth">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="shadow-md shadow-primary/30">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 flex flex-col lg:flex-row items-center gap-14">
        <div className="flex-1 space-y-8 animate-fade-in-up text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold text-sm shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            AI-Powered Wealth Generation Hub
          </div>

          <h1 className="text-5xl lg:text-7xl font-display font-extrabold tracking-tight leading-tight text-text">
            Master your money with{' '}
            <span className="text-gradient-orange block mt-1 animate-pulse-glow">Intelligence.</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Drop your bank statement. Our AI categorizes expenses, forecasts savings, detects anomalies, and builds a personalized financial roadmap — all in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all flex items-center gap-2 group">
                Start for Free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
                See Features
              </Button>
            </Link>
          </div>

          <div className="pt-6 flex items-center justify-center lg:justify-start gap-6 text-sm text-text-secondary font-medium flex-wrap">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success" /> Bank-grade encryption</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> Instant AI analysis</div>
            <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Indian bank formats</div>
          </div>
        </div>

        {/* Hero card demo */}
        <div className="flex-1 w-full max-w-md relative hidden md:block animate-float">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/20 blur-3xl rounded-full" />
          <div className="relative glass-card rounded-3xl p-7 shadow-2xl glow-orange flex flex-col gap-5">
            {/* Transaction rows */}
            {[
              { initials: 'AI', label: 'Salary Credited', sub: '2 mins ago', amount: '+₹85,000', color: 'text-success', bg: 'bg-primary/10' },
              { initials: 'UD', label: 'Urban Company', sub: 'Services', amount: '-₹1,200', color: 'text-danger', bg: 'bg-danger/10' },
              { initials: 'SB', label: 'Zomato Order', sub: 'Food & Dining', amount: '-₹450', color: 'text-danger', bg: 'bg-orange-100 dark:bg-orange-900/20' },
            ].map((t) => (
              <div key={t.label} className="flex justify-between items-center bg-white/60 dark:bg-stone-900/60 p-4 rounded-xl border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.bg} flex items-center justify-center text-primary font-bold text-sm`}>{t.initials}</div>
                  <div>
                    <h4 className="font-bold text-text text-sm">{t.label}</h4>
                    <p className="text-xs text-text-secondary">{t.sub}</p>
                  </div>
                </div>
                <div className={`${t.color} font-bold font-mono`}>{t.amount}</div>
              </div>
            ))}
            {/* Prediction card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary via-primary-dark to-accent text-white shadow-lg overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-700" />
              <p className="font-medium text-white/80 text-xs mb-1 uppercase tracking-widest">AI Savings Prediction</p>
              <div className="text-4xl font-display font-extrabold">₹15,400</div>
              <p className="text-sm text-white/75 mt-2">On track to hit your MacBook Goal by July. 🎯</p>
            </div>
          </div>
        </div>
      </main>

      {/* ═══ HOW IT WORKS — Orbital Timeline ═══ */}
      <section className="relative z-10 py-24 overflow-hidden bg-bg/60 dark:bg-bg/60 backdrop-blur-sm">
        {/* Section background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[200px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-4">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl lg:text-5xl font-display font-extrabold text-text mb-4">
              Six steps to <span className="text-gradient-orange">financial clarity.</span>
            </h2>
            <p className="text-text-secondary text-base max-w-2xl mx-auto leading-relaxed">Click any node to explore. Your journey from statement upload to financial mastery — powered by AI.</p>
          </div>

          {/* Orbital Timeline */}
          <OrbitalTimeline />

          {/* Bottom CTA */}
          <div className="text-center mt-4">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all flex items-center gap-2 group mx-auto">
                Begin Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="relative z-10 border-y border-border bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Core Intelligence</p>
            <h2 className="text-4xl lg:text-5xl font-display font-extrabold text-text mb-4">
              Every rupee, <span className="text-gradient-orange">understood.</span>
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">Upload any Indian bank statement and watch the magic happen — automatically.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<TrendingUp className="w-7 h-7 text-primary" />}
              title="Predictive Forecasting"
              desc="Prophet ML models analyze your spending trajectory and project savings over 6 months with high confidence."
              gradient="from-primary/10 to-accent/10"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-7 h-7 text-accent" />}
              title="Chat with your Money"
              desc="Interrogate our Gemini-powered AI chatbot with complex personal financial queries instantly in plain language."
              gradient="from-accent/10 to-primary/10"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-7 h-7 text-success" />}
              title="Anomaly Detection"
              desc="Isolation Forest models automatically flag unusually large or suspicious debit transactions in real-time."
              gradient="from-success/10 to-primary/10"
            />
            <FeatureCard
              icon={<BarChart3 className="w-7 h-7 text-primary" />}
              title="Visual Analytics"
              desc="Interactive charts break down your spending by category and time so you always know where money goes."
              gradient="from-primary/10 to-primary-dark/10"
            />
            <FeatureCard
              icon={<Zap className="w-7 h-7 text-accent" />}
              title="Instant Categorization"
              desc="Our ML model recognizes SBI, HDFC, ICICI, Axis and more — automatically labeling every transaction."
              gradient="from-accent/10 to-success/10"
            />
            <FeatureCard
              icon={<Brain className="w-7 h-7 text-primary-dark" />}
              title="Tax Optimization"
              desc="Get personalized Section 80C and 80D suggestions based on your actual spending patterns."
              gradient="from-primary-dark/10 to-accent/10"
            />
          </div>
        </div>
      </section>

      {/* Reviews Section — 3D Carousel */}
      <ReviewCarousel />

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-white/30 dark:bg-stone-950/50 backdrop-blur-xl pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BachatLogo size={17} className="text-white" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-gradient-orange">Bachat AI</span>
              </Link>
              <p className="text-text-secondary text-sm max-w-sm leading-relaxed">
                Your deeply trained AI financial coach. Gain full control of your wealth with automated insights, predictive forecasting, and seamless tracking.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-text mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                <li><button onClick={() => setActiveModal('about')} className="hover:text-primary transition-colors text-left">About Us</button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-primary transition-colors text-left">Privacy Policy</button></li>
                <li><button onClick={() => setActiveModal('terms')} className="hover:text-primary transition-colors text-left">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-text-secondary text-sm">© {new Date().getFullYear()} Bachat AI. All rights reserved.</p>
            <div className="flex gap-3">
              {[
                { label: 'Twitter', path: 'M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' },
                { label: 'GitHub', path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
              ].map(({ label, path }) => (
                <div key={label} className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all cursor-pointer hover:scale-110 hover:shadow-md hover:shadow-primary/30">
                  <span className="sr-only">{label}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={path} fillRule={label === 'GitHub' ? 'evenodd' : undefined} clipRule={label === 'GitHub' ? 'evenodd' : undefined} /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

function FeatureCard({ icon, title, desc, gradient }) {
  return (
    <div className={`group p-7 rounded-2xl bg-gradient-to-br ${gradient} border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1`}>
      <div className="mb-5 inline-flex p-3.5 rounded-xl bg-white/70 dark:bg-stone-800/80 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm border border-border">
        {icon}
      </div>
      <h3 className="text-lg font-bold font-display mb-2 text-text">{title}</h3>
      <p className="text-text-secondary leading-relaxed text-sm">{desc}</p>
    </div>
  )
}
