/**
 * What you see where a dart lands: the dart drops in, two rings spread out
 * from the point, and the score floats up. Position is given as a fraction
 * of the board (0 to 1), so it works at any board size.
 */

interface DartImpactProps {
  x: number
  y: number
  score?: number
}

export function DartImpact({ x, y, score }: DartImpactProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <span className="impact-ring absolute left-0 top-0 block h-6 w-6 rounded-full border-2 border-brass-300" />
      <span className="impact-ring-late absolute left-0 top-0 block h-6 w-6 rounded-full border border-chalk/70" />
      <span className="impact-pin absolute left-0 top-0 block h-3 w-3 rounded-full border-2 border-baize-950 bg-brass-300 shadow-[0_0_14px_rgb(239_201_90/0.9)]" />
      {score !== undefined && (
        <span className="impact-score font-display absolute left-0 top-0 whitespace-nowrap rounded-md bg-baize-950/85 px-2 py-0.5 text-lg font-extrabold text-brass-300">
          +{score}
        </span>
      )}
    </div>
  )
}
