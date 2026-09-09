import { useEffect, useState } from 'react'
import { useStudent } from '../context/StudentContext.jsx'
import { formatDuration, sessionMs } from '../lib/time.js'

export default function TimeControls() {
  const s = useStudent()
  const clock = s.state.clock
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!clock?.start) return undefined
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [clock?.start])

  useEffect(() => {
    if (clock?.kind !== 'pomodoro' || !clock?.start) return undefined
    const started = new Date(clock.start).getTime()
    const left = 25 * 60 * 1000 - (Date.now() - started)
    if (left <= 0) {
      s.clockOut()
      return undefined
    }
    const t = setTimeout(() => s.clockOut(), left)
    return () => clearTimeout(t)
  }, [clock?.kind, clock?.start])

  const elapsed = clock?.start ? sessionMs({ start: clock.start }) : 0

  return (
    <div className="clock-chip">
      {clock?.start ? (
        <>
          <button type="button" className="btn small" onClick={() => s.clockOut()}>
            Clock out {formatDuration(elapsed)}
            {clock.kind === 'pomodoro' ? ' · pomo' : ''}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn small" onClick={() => s.clockIn('clock')}>
            Clock in
          </button>
          <button type="button" className="btn small" onClick={() => s.clockIn('pomodoro')}>
            Pomodoro
          </button>
        </>
      )}
    </div>
  )
}
