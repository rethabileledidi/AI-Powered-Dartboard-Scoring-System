/**
 * The app's logo: a small dartboard that draws itself, then a dart lands in the bull.
 * It plays once when the page opens. All timing lives in src/styles/animations.css.
 */

const CENTER = 32
const TWO_PI = Math.PI * 2

/* Rounded so the server and the browser print exactly the same numbers. */
const round = (value: number) => Math.round(value * 1000) / 1000

/** Dash pattern that splits a ring of the given radius into 20 equal board segments. */
function segmentDash(radius: number) {
  const segment = round((TWO_PI * radius) / 20)
  return { dash: `${segment} ${segment}`, offset: segment }
}

interface BoardMarkProps {
  /** Rendered size in pixels. */
  size?: number
  className?: string
}

export function BoardMark({ size = 64, className = '' }: BoardMarkProps) {
  const singles = segmentDash(21)
  const doubles = segmentDash(27)
  const trebles = segmentDash(15)

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Dartboard with a dart in the bullseye"
      className={`board-mark shrink-0 overflow-visible ${className}`}
    >
      {/* Board face */}
      <circle cx={CENTER} cy={CENTER} r="30" fill="var(--color-baize-950)" />

      {/* Segments, turned so the 20 sits upright */}
      <g className="mark-segments">
        <g transform={`rotate(-99 ${CENTER} ${CENTER})`}>
          <circle cx={CENTER} cy={CENTER} r="21" fill="none" stroke="#14110f" strokeWidth="9" />
          <circle cx={CENTER} cy={CENTER} r="21" fill="none" stroke="var(--color-chalk)" strokeWidth="9" strokeDasharray={singles.dash} />
          <circle cx={CENTER} cy={CENTER} r="27" fill="none" stroke="var(--color-bull-500)" strokeWidth="3" strokeDasharray={doubles.dash} />
          <circle cx={CENTER} cy={CENTER} r="27" fill="none" stroke="var(--color-mint-500)" strokeWidth="3" strokeDasharray={doubles.dash} strokeDashoffset={doubles.offset} />
          <circle cx={CENTER} cy={CENTER} r="15" fill="none" stroke="var(--color-bull-500)" strokeWidth="3" strokeDasharray={trebles.dash} />
          <circle cx={CENTER} cy={CENTER} r="15" fill="none" stroke="var(--color-mint-500)" strokeWidth="3" strokeDasharray={trebles.dash} strokeDashoffset={trebles.offset} />
        </g>
      </g>

      {/* Brass number ring and inner wire */}
      <circle
        className="mark-ring"
        cx={CENTER} cy={CENTER} r="30" fill="none"
        stroke="var(--color-brass-400)" strokeWidth="2.5"
        style={{ ['--ring-length' as string]: `${round(TWO_PI * 30)}` }}
      />
      <circle
        className="mark-ring mark-ring-2"
        cx={CENTER} cy={CENTER} r="9.5" fill="none"
        stroke="var(--color-brass-300)" strokeWidth="1"
        style={{ ['--ring-length' as string]: `${round(TWO_PI * 9.5)}` }}
      />

      {/* Bull */}
      <g className="mark-bull">
        <circle cx={CENTER} cy={CENTER} r="6" fill="var(--color-mint-500)" />
        <circle cx={CENTER} cy={CENTER} r="2.8" fill="var(--color-bull-500)" />
      </g>

      {/* Dart: point in the bull, flight up and to the right */}
      <g className="mark-dart">
        <line x1="32" y1="32" x2="40" y2="24" stroke="#e8ecef" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="40" y1="24" x2="52" y2="12" stroke="var(--color-brass-300)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M51 13 L65 9 L55 -1 Z" fill="var(--color-ember-400)" stroke="var(--color-baize-950)" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M51 13 L60 4" stroke="var(--color-ember-700)" strokeWidth="1" />
      </g>
    </svg>
  )
}
