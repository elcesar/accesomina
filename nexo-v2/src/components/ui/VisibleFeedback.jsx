import { useEffect, useRef } from 'react'

export function VisibleFeedback({ children, className = '', role = 'alert' }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
    element.focus({ preventScroll: true })
  }, [children])

  return (
    <div
      ref={ref}
      className={className}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      tabIndex={-1}
    >
      {children}
    </div>
  )
}
