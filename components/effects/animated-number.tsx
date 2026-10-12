'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  /** The number to show. When it changes, the display rolls to the new value. */
  value: number
  /** Digits after the decimal point. */
  decimals?: number
  /** How long the roll takes, in milliseconds. */
  duration?: number
  /** Value to start from the first time the number appears. */
  from?: number
  className?: string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A number that counts to its value instead of jumping, like a scoreboard being chalked. */
export function AnimatedNumber({ value, decimals = 0, duration = 700, from = 0, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(from)
  const shownRef = useRef(from)

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(value)) {
      shownRef.current = value
      setShown(value)
      return
    }

    const start = shownRef.current
    const startedAt = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const next = start + (value - start) * easeOutCubic(progress)
      shownRef.current = next
      setShown(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span className={className}>{Number.isFinite(shown) ? shown.toFixed(decimals) : '0'}</span>
}
