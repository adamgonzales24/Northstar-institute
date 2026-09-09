import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { monthMatrix, formatMonthYear, sameDay, toISO } from '../lib/dates.js'
import { downloadDueIcs, enableDueReminders } from '../lib/reminders.js'

export default function CalendarPage() {
  const s = useStudent()
  useRemember('/calendar')
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [filter, setFilter] = useState('all')
  const [note, setNote] = useState('')
  const weeks = monthMatrix(cursor.getFullYear(), cursor.getMonth())

  const events = useMemo(() => {
    const list = s.todos.concat(
      // include completed? skip
    )
    return filter === 'all' ? list : list.filter((t) => t.courseId === filter)
  }, [s.todos, filter])

  const byDay = {}
  for (const e of events) {
    if (!byDay[e.due]) byDay[e.due] = []
    byDay[e.due].push(e)
  }

  const courses = s.active.map((a) => a.course)

  return (
    <div className="page wide">
      <h1 className="page-title">Calendar</h1>
      <p className="page-sub">Suggested due dates. Self-paced unlock does not move these unless you use Life Happens.</p>
      {note && <div className="banner-strip info">{note}</div>}
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          Previous
        </button>
        <strong>{formatMonthYear(cursor)}</strong>
        <button className="btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          Next
        </button>
        <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All active courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => s.lifeHappens(1)}>
          Life Happens +1 week
        </button>
        <button className="btn" onClick={() => s.lifeHappens(2)}>
          +2 weeks
        </button>
        <button
          className="btn"
          onClick={() => {
            downloadDueIcs(s.todos, s.state.profile.name)
            setNote('Calendar file downloaded. Open it on your phone to get lock-screen alerts (and SMS if your calendar app texts you).')
          }}
        >
          Download calendar (.ics)
        </button>
        <button
          className="btn"
          onClick={async () => {
            const r = await enableDueReminders()
            if (r.ok) {
              s.setRemindersEnabled(true)
              setNote('Reminders on. Keep this site (or the Home Screen app) open on this device.')
            } else {
              setNote(r.error || 'Could not enable notifications.')
            }
          }}
        >
          {s.state.remindersEnabled ? 'Reminders on' : 'Enable due reminders'}
        </button>
      </div>
      {s.state.lifeHappensWeeks > 0 && (
        <div className="banner-strip warn">Remaining due dates are shifted by {s.state.lifeHappensWeeks} week(s). Past dues stay put.</div>
      )}
      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="cal-hd">
            {d}
          </div>
        ))}
        {weeks.flat().map((d) => {
          const iso = toISO(d)
          const out = d.getMonth() !== cursor.getMonth()
          const ev = byDay[iso] || []
          return (
            <div key={iso} className={`cal-cell ${out ? 'out' : ''} ${sameDay(d, today) ? 'today' : ''}`}>
              <div>{d.getDate()}</div>
              {ev.map((e) => (
                <Link key={e.id} className="cal-event" style={{ background: e.color }} to={`/courses/${e.courseId}/work/${e.id}`}>
                  {e.code} {e.title}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
      <div className="cal-agenda">
        <h2>This month</h2>
        {events
          .filter((e) => {
            const d = new Date(e.due + 'T12:00:00')
            return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()
          })
          .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
          .map((e) => (
            <Link key={e.id} className="todo-item" to={`/courses/${e.courseId}/work/${e.id}`}>
              <span className="dot" style={{ background: e.color }} />
              <span>
                {e.code} {e.title}
              </span>
              <span className="due">{e.due}</span>
            </Link>
          ))}
        {events.length === 0 && <div className="empty">No remaining suggested dues.</div>}
      </div>
    </div>
  )
}
