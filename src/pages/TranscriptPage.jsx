import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { PROGRAM } from '../data/activeProgram.js'

export default function TranscriptPage() {
  const s = useStudent()
  useRemember('/transcript')
  const rows = Object.entries(s.state.enrollments)
    .map(([id, en]) => ({ id, en, c: s.byId[id], g: s.courseGrade(id) }))
    .filter((r) => r.c && (r.en.status === 'completed' || r.en.status === 'waived' || r.en.status === 'in-progress'))
    .sort((a, b) => a.c.code.localeCompare(b.c.code))

  return (
    <div className="page">
      <h1 className="page-title">Unofficial transcript</h1>
      <p className="page-sub no-print">This is not an official document. Print to PDF from your browser if you need a snapshot.</p>
      <div className="transcript">
        <h2>Northstar Institute</h2>
        <div className="muted">Self-directed · {PROGRAM.degree}</div>
        <div className="muted">Student: {s.state.profile.name || 'Student'} · Start {s.state.profile.startDate}</div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Cr</th>
              <th>Grade</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.c.code}</td>
                <td>{r.c.title}</td>
                <td>{r.c.id === 'MATH099' ? `${r.c.credits}*` : r.c.credits}</td>
                <td>{r.en.status === 'waived' ? 'WV' : r.en.status === 'in-progress' ? 'IP' : r.g.letter || '—'}</td>
                <td>{r.en.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          GPA (completed): {s.gpa.gpa != null ? s.gpa.gpa.toFixed(2) : '—'} · Credits completed toward plan: {s.credits}
        </p>
        <p className="muted">* MATH 099 is remedial and does not count toward the 124-hour target. WV = waived by placement. IP = in progress.</p>
      </div>
    </div>
  )
}
