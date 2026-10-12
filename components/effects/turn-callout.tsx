'use client'

import { useEffect } from 'react'

interface TurnCalloutProps {
  /** Three-dart total to announce. */
  total: number
  /** Called when the announcement has finished. */
  onDone: () => void
}

const CALLOUT_MS = 1900

/** What the caller says for a three-dart total. */
export function callFor(total: number): string {
  if (total === 180) return 'One hundred and eighty!'
  if (total >= 140) return 'Ton forty and more'
  if (total >= 100) return 'Ton plus'
  if (total === 26) return 'Bed and breakfast'
  if (total >= 60) return 'Good darts'
  if (total === 0) return 'No score'
  return 'Scored'
}

/** The caller: announces the turn total over the board, then steps aside. */
export function TurnCallout({ total, onDone }: TurnCalloutProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, CALLOUT_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  const big = total >= 100

  return (
    <div
      role="status"
      aria-live="polite"
      className="callout-veil pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-lg bg-baize-950/75 text-center"
    >
      <span
        className={`callout-number font-display font-black leading-none ${
          big ? 'text-[7rem] text-brass-300' : 'text-[6rem] text-chalk'
        }`}
        style={{ textShadow: big ? '0 0 40px rgb(239 201 90 / 0.55)' : '0 6px 24px rgb(0 0 0 / 0.6)' }}
      >
        {total}
      </span>
      <span className="callout-words font-display mt-1 text-2xl font-bold text-ember-300">{callFor(total)}</span>
    </div>
  )
}
