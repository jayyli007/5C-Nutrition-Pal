const ARCS = ['#e5484d', '#f2803a', '#f5c518', '#30a46c', '#3b82f6']

/** The 5C ring: five arcs, one per college, around the wordmark. */
export function Logo({ size = 112 }: { size?: number }) {
  const r = 40
  const circumference = 2 * Math.PI * r
  const seg = circumference / ARCS.length
  const gap = 9
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="5C Fit logo">
      {ARCS.map((color, i) => (
        <circle
          key={color}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${seg - gap} ${circumference}`}
          transform={`rotate(${-90 + (360 / ARCS.length) * i + 7} 50 50)`}
        />
      ))}
      <text x="50" y="59" textAnchor="middle" fontSize="26" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif" fill="#111">
        5C
      </text>
    </svg>
  )
}
