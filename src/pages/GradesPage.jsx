import { Link } from 'react-router-dom'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { letterClass } from '../lib/grades.js'

export default function GradesPage() {
  const s = useStudent()
  useRemember('/grades')
  const rows = Object.entries(s.state.enrollments)
    .map(([id, en]) => ({ id, en, c: s.byId[id], g: s.courseGrade(id) }))
    .filter((r) => r.c && (r.en.status === 'in-progress' || r.en.status === 'completed' || r.en.status === 'planned'))

  return (
    <div className="page">
      <h1 className="page-title">Gradebook</h1>
      <p className="page-sub">
        Cumulative GPA {s.gpa.gpa != null ? s.gpa.gpa.toFixed(2) : '—'} · {s.credits} completed credits. In-progress grades are running estimates.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Course</th>
            <th>Status</th>
            <th>%</th>
            <th>Letter</th>
            <th>GPA hrs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link to={`/courses/${r.id}/grades`}>
                  {r.c.code} {r.c.title}
                </Link>
              </td>
              <td>{r.en.status}</td>
              <td>{r.g.percent ?? '—'}</td>
              <td>
                <span className={`pill ${letterClass(r.g.letter)}`}>{r.g.letter || '—'}</span>
              </td>
              <td>{r.c.credits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
