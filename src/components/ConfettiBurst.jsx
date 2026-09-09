const COLORS = ['#d4a017', '#f0c14b', '#4aa3df', '#3cba8a', '#e85d6a', '#9a6bc8', '#ffffff']

export default function ConfettiBurst({ show, count = 72 }) {
  if (!show) return null
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = (i * 137.5) % 100
    const delay = (i % 12) * 0.04
    const dur = 1.6 + (i % 7) * 0.12
    const rot = (i * 47) % 360
    const size = 6 + (i % 5)
    return { i, left, delay, dur, rot, size, color: COLORS[i % COLORS.length] }
  })
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}
