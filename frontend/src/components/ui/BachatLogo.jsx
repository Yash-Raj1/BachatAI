import React from 'react'

/**
 * BachatLogo — a Shield with the ₹ (Indian Rupee) character inside.
 * Uses a <text> SVG element so the ₹ glyph renders exactly from the system font.
 */
export function BachatLogo({ size = 20, className = '' }) {
  // Scale the font size proportionally with the icon size
  const fontSize = Math.round(size * 0.42)
  const center = 12

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bachat AI — Shield with Rupee"
    >
      {/* Shield body */}
      <path
        d="M12 2.5L3.75 6.25v5.5c0 4.75 3.5 9.2 8.25 10.5 4.75-1.3 8.25-5.75 8.25-10.5v-5.5L12 2.5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* ₹ glyph — rendered via actual Unicode character for pixel-perfect output */}
      <text
        x={center}
        y={center + fontSize * 0.38}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="'Segoe UI', system-ui, Arial, sans-serif"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        ₹
      </text>
    </svg>
  )
}
