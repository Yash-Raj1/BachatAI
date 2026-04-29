import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { createPortal } from 'react-dom'

export function Modal({ isOpen, onClose, title, children, className }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'inherit'
    }
    return () => {
      document.body.style.overflow = 'inherit'
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className={twMerge("relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="mb-4 text-xl font-bold font-display">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  )
}
