import { useRef, useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DottedMap from 'dotted-map'

/**
 * WorldMap — dotted world map with animated connection arcs.
 * Adapted from shadcn/map for React + Vite (no Next.js, no TS).
 * Uses the project's orange theme colors.
 */
export function WorldMap({
  dots = [],
  lineColor = '#f97316',
  showLabels = true,
  animationDuration = 2,
  loop = true,
}) {
  const svgRef = useRef(null)
  const [hoveredLocation, setHoveredLocation] = useState(null)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode from the document
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const map = useMemo(() => new DottedMap({ height: 100, grid: 'diagonal' }), [])

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius: 0.22,
        color: isDark ? '#FFFF7F40' : '#00000040',
        shape: 'circle',
        backgroundColor: 'transparent',
      }),
    [map, isDark]
  )

  const projectPoint = (lat, lng) => {
    const x = (lng + 180) * (800 / 360)
    const y = (90 - lat) * (400 / 180)
    return { x, y }
  }

  const createCurvedPath = (start, end) => {
    const midX = (start.x + end.x) / 2
    const midY = Math.min(start.y, end.y) - 50
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
  }

  const staggerDelay = 0.3
  const totalAnimationTime = dots.length * staggerDelay + animationDuration
  const pauseTime = 2
  const fullCycleDuration = totalAnimationTime + pauseTime

  return (
    <div className="w-full aspect-[2/1] rounded-2xl relative font-sans overflow-hidden">
      {/* Map background image */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full pointer-events-none select-none object-cover"
        style={{ maskImage: 'linear-gradient(to bottom, transparent, white 10%, white 90%, transparent)' }}
        alt="world map"
        draggable={false}
      />

      {/* Animated paths overlay */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-auto select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="map-path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="map-glow">
            <feMorphology operator="dilate" radius="0.5" />
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arcs */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng)
          const endPoint = projectPoint(dot.end.lat, dot.end.lng)
          const startTime = (i * staggerDelay) / fullCycleDuration
          const endTime = (i * staggerDelay + animationDuration) / fullCycleDuration
          const resetTime = totalAnimationTime / fullCycleDuration

          return (
            <g key={`path-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#map-path-gradient)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={loop ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }}
                transition={
                  loop
                    ? {
                        duration: fullCycleDuration,
                        times: [0, startTime, endTime, resetTime, 1],
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatDelay: 0,
                      }
                    : {
                        duration: animationDuration,
                        delay: i * staggerDelay,
                        ease: 'easeInOut',
                      }
                }
              />
              {loop && (
                <motion.circle
                  r="4"
                  fill={lineColor}
                  initial={{ offsetDistance: '0%', opacity: 0 }}
                  animate={{
                    offsetDistance: [null, '0%', '100%', '100%', '100%'],
                    opacity: [0, 0, 1, 0, 0],
                  }}
                  transition={{
                    duration: fullCycleDuration,
                    times: [0, startTime, endTime, resetTime, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 0,
                  }}
                  style={{ offsetPath: `path('${createCurvedPath(startPoint, endPoint)}')` }}
                />
              )}
            </g>
          )
        })}

        {/* Points */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng)
          const endPoint = projectPoint(dot.end.lat, dot.end.lng)

          return (
            <g key={`points-${i}`}>
              {[
                { point: startPoint, info: dot.start, delay: 0 },
                { point: endPoint, info: dot.end, delay: 0.5 },
              ].map((loc, j) => (
                <g key={`loc-${i}-${j}`}>
                  <motion.g
                    onHoverStart={() => setHoveredLocation(loc.info.label || `Point ${i}-${j}`)}
                    onHoverEnd={() => setHoveredLocation(null)}
                    className="cursor-pointer"
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <circle cx={loc.point.x} cy={loc.point.y} r="3" fill={lineColor} filter="url(#map-glow)" />
                    <circle cx={loc.point.x} cy={loc.point.y} r="3" fill={lineColor} opacity="0.5">
                      <animate attributeName="r" from="3" to="12" dur="2s" begin={`${loc.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin={`${loc.delay}s`} repeatCount="indefinite" />
                    </circle>
                  </motion.g>

                  {showLabels && loc.info.label && (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 * i + 0.3 + loc.delay, duration: 0.5 }}
                      className="pointer-events-none"
                    >
                      <foreignObject x={loc.point.x - 50} y={loc.point.y - 30} width="100" height="24">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm"
                            style={{
                              background: isDark ? 'rgba(28,25,23,0.9)' : 'rgba(255,255,255,0.92)',
                              color: isDark ? '#fafaf9' : '#1c1917',
                              border: `1px solid ${isDark ? '#292524' : '#fed7aa'}`,
                            }}
                          >
                            {loc.info.label}
                          </span>
                        </div>
                      </foreignObject>
                    </motion.g>
                  )}
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Mobile tooltip */}
      <AnimatePresence>
        {hoveredLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 left-3 bg-card text-text px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm sm:hidden border border-border shadow-lg"
          >
            {hoveredLocation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
