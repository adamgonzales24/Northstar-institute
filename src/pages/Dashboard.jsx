import { Link } from 'react-router-dom'
import { useStudent } from '../context/StudentContext.jsx'
import ProgressRing, { moduleProgress } from '../components/ProgressRing.jsx'
import { ANNOUNCEMENTS } from '../data/announcements.js'
import { PROGRAM } from '../data/activeProgram.js'
import { IS_BOOTCAMP } from '../lib/config.js'
import { readingHref, readingKey } from '../lib/oreilly.js'
import { daysUntil, formatShort } from '../lib/dates.js'
import { useRemember } from '../context/StudentContext.jsx'

function PathMap() {
  const s = useStudent()
  const course = s.byId.BOOT
  if (!course) return null
  const en = s.state.enrollments.BOOT
  const current = en?.lastModule || 1
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h2>24-week path</h2>
      <div className="path-map">
        {course.weeks.map((w) => {
          const done = !!en?.moduleComplete?.[w.week]
          return (
            <Link
              key={w.week}
              to={`/courses/BOOT/modules/${w.week}`}
              className={`path-dot ${done ? 'done' : ''} ${w.week === current ? 'current' : ''}`}
              title={`Week ${w.week}: ${w.title}`}
            >
              {w.week}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function ThisWeekReadings() {
  const s = useStudent()
  const row = s.active[0]
  if (!row) return null
  const week = row.lastModule || 1
  const w = row.course.weeks.find((x) => x.week === week)
  const readings = w?.readings || []
  const checks = row.chapterChecks || s.state.enrollments[row.id]?.chapterChecks || {}
  const checked = readings.filter((r, i) => checks[readingKey(week, r, i)]).length
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h2>This week’s chapters</h2>
      <p className="page-sub">
        {row.course.code} week {week}: {w?.title}. {checked}/{readings.length || 0} checked.
      </p>
      {readings.length === 0 && <p className="page-sub">No chapter list — open the module.</p>}
      {readings.map((r, i) => {
        const href = readingHref(r)
        return (
          <div key={readingKey(week, r, i)} style={{ marginBottom: 6 }}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            ) : (
              r.title
            )}
          </div>
        )
      })}
      <Link className="btn small" to={`/courses/${row.id}/modules/${week}`}>
        Open week
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const s = useStudent()
  useRemember('/dashboard')
  const name = s.state.profile.name || 'Student'
  const weekTodos = s.todos.filter((t) => daysUntil(t.due) <= 7)
  const unread = ANNOUNCEMENTS.filter((a) => !s.state.announcementsRead?.includes(a.id))

  return (
    <div className="page">
      <h1 className="page-title">Hello, {name}.</h1>
      <p className="page-sub">
        {s.now?.name} · {s.state.profile.pace} pace · {s.state.profile.hoursPerWeek} h/week budget · start {s.state.profile.startDate}
      </p>

      {unread[0] && (
        <div className="banner-strip">
          <div>
            <div className="eyebrow">Announcement · {PROGRAM.professor.name}</div>
            <strong>{unread[0].title}</strong>
            <div>{unread[0].body}</div>
          </div>
        </div>
      )}

      {s.warning && <div className="banner-strip warn">{s.warning.text}</div>}

      <div className="stat-row" style={{ marginBottom: 16 }}>
        {!IS_BOOTCAMP && (
          <div className="stat">
            <div className="k">Credits completed</div>
            <div className="v">{s.credits}</div>
            <div className="s">of {s.audit.target} toward the B.S.</div>
          </div>
        )}
        {IS_BOOTCAMP && (
          <div className="stat">
            <div className="k">Path</div>
            <div className="v">
              {Object.values(s.active[0]?.moduleComplete || {}).filter(Boolean).length}/24
            </div>
            <div className="s">weeks marked complete</div>
          </div>
        )}
        {!IS_BOOTCAMP && (
          <div className="stat">
            <div className="k">Cumulative GPA</div>
            <div className="v">{s.gpa.gpa != null ? s.gpa.gpa.toFixed(2) : '—'}</div>
            <div className="s">Completed courses only</div>
          </div>
        )}
        <div className="stat">
          <div className="k">Hours logged this week</div>
          <div className="v">{s.hours}h</div>
          <div className="s">budget {s.state.profile.hoursPerWeek}h · planned load {s.plannedHours || 0}h</div>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 18 }}>
        <Link className="btn primary" to={s.continuePath()}>
          Continue where you left off
        </Link>
        <Link className="btn" to="/audit">
          Degree audit
        </Link>
        <Link className="btn" to="/calendar">
          Calendar
        </Link>
      </div>

      <div className="dash-grid">
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            {IS_BOOTCAMP && <PathMap />}
            <h2>{IS_BOOTCAMP ? 'Current week' : 'Current courses'}</h2>
            {s.active.length === 0 && <div className="empty">No active courses. Open Courses to enroll from your plan.</div>}
            <div className="grid" style={{ gap: 8 }}>
              {s.active.map((row) => (
                <Link key={row.id} to={`/courses/${row.id}`} className="course-card">
                  <ProgressRing value={moduleProgress(row, row.course.weeks.length)} color={row.course.color} />
                  <div>
                    <div className="code">{row.course.code}</div>
                    <div className="title">{row.course.title}</div>
                    <div className="meta">
                      {row.course.credits} cr · {row.course.hoursPerWeek} h/wk · last week {row.lastModule || 1}
                    </div>
                  </div>
                  <span className="pill">{s.courseGrade(row.id).letter || '—'}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>Study protocol</h2>
            <ul>
              {PROGRAM.studyProtocol.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}.</strong> {p.body}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h2>To do · next 7 days</h2>
            {weekTodos.length === 0 && <div className="empty">Nothing due in the next week. That is either peace or denial — check the calendar.</div>}
            {weekTodos.map((t) => {
              const d = daysUntil(t.due)
              return (
                <Link key={t.id} to={`/courses/${t.courseId}/work/${t.id}`} className="todo-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="dot" style={{ background: t.color }} />
                  <div>
                    <div>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.code}</div>
                  </div>
                  <div className={`due ${d < 0 ? 'over' : d <= 2 ? 'soon' : ''}`}>{d < 0 ? `${-d}d late` : d === 0 ? 'today' : formatShort(t.due)}</div>
                </Link>
              )
            })}
          </div>
          <ThisWeekReadings />
          <div className="card">
            <h2>Hours this week</h2>
            <div className="hours-widget">
              <div className={`bar-track ${s.hours > s.state.profile.hoursPerWeek ? 'over' : ''}`} style={{ height: 10 }}>
                <i style={{ width: `${Math.min(100, (s.hours / Math.max(1, s.state.profile.hoursPerWeek)) * 100)}%` }} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Logged {s.hours}h of a {s.state.profile.hoursPerWeek}h budget (clock in on the top bar). Planned course load is {s.plannedHours || 0}h.
            </p>
            <Link className="btn small" to="/settings#time">
              Hours log / Life Happens
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
