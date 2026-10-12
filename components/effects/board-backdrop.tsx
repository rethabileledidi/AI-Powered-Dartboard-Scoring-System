/**
 * The room behind the app: a lamp over the board and a faint wire dartboard
 * that turns very slowly. Purely decorative, so it is hidden from screen readers
 * and never receives clicks.
 */

const BOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

/* Ring radii follow a real board's proportions (double, treble, outer bull, bull). */
const RINGS = [170, 162, 107, 99, 16, 6.35]
const SPOKES = Array.from({ length: 20 }, (_, i) => (i * 18 - 9) * (Math.PI / 180))

/* Rounded so the server and the browser print exactly the same coordinates. */
const round = (value: number) => Math.round(value * 100) / 100
const pointAt = (angle: number, radius: number) => ({
  x: round(Math.sin(angle) * radius),
  y: round(-Math.cos(angle) * radius),
})

export function BoardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Lamp over the board */}
      <div
        className="absolute left-1/2 top-0 h-[75vh] w-[140vw] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 50% 0%, rgb(239 201 90 / 0.16), rgb(245 130 58 / 0.05) 45%, transparent 70%)',
        }}
      />

      {/* Wire board */}
      <svg
        viewBox="-230 -230 460 460"
        className="absolute -right-[22vmax] -top-[14vmax] h-[78vmax] w-[78vmax] text-brass-300"
      >
        <g className="backdrop-board" fill="none" stroke="currentColor" strokeOpacity="0.13">
          {RINGS.map((radius) => (
            <circle key={radius} r={radius} strokeWidth={radius > 90 ? 1.2 : 0.9} />
          ))}
          {SPOKES.map((angle, i) => {
            const inner = pointAt(angle, 16)
            const outer = pointAt(angle, 170)
            return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} strokeWidth="0.9" />
          })}
          {BOARD_NUMBERS.map((value, i) => {
            const at = pointAt(i * 18 * (Math.PI / 180), 197)
            return (
              <text
                key={value}
                x={at.x}
                y={at.y}
                transform={`rotate(${i * 18} ${at.x} ${at.y})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="30"
                fontWeight="800"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {value}
              </text>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
