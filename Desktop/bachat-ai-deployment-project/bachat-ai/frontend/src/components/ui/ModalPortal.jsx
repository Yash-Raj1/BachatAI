import { createPortal } from 'react-dom'

/**
 * ModalPortal — Renders children into document.body via React Portal.
 * This ensures modals always appear centered on screen, regardless of
 * scroll position or parent container nesting.
 */
export function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
