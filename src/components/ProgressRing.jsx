export default function ProgressRing({ value = 0, size = 52, stroke = 5, color = 'var(--gold)' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-label={`${Math.round(pct)} percent complete`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#243140" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#e7eef5" fontSize="11" fontWeight="700">
          {Math.round(pct)}
        </text>
      </svg>
    </div>
  )
}

export function moduleProgress(enrollment, weeks = 15) {
  if (!enrollment) return 0
  const n = Object.values(enrollment.moduleComplete || {}).filter(Boolean).length
  return Math.round((n / weeks) * 100)
}
