import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { PROGRAM } from '../data/activeProgram.js'
import { ANNOUNCEMENTS } from '../data/announcements.js'
import AskProfessor from '../components/AskProfessor.jsx'

export default function ProfessorPage() {
  const s = useStudent()
  useRemember('/professor')
  const note = s.state.notes.global || ''

  return (
    <div className="page">
      <h1 className="page-title">Ask the Professor</h1>
      <p className="page-sub">
        {PROGRAM.professor.name}, {PROGRAM.professor.title}. {PROGRAM.professor.voice}
      </p>
      <div style={{ marginBottom: 12 }}>
        <AskProfessor scope="global" />
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Standing guidance</h3>
        <ul>
          <li>If you are stuck more than 45 minutes, write the question as if to a colleague: what you tried, what you expected, what happened.</li>
          <li>Do not skip writing. Engineers who cannot write cannot lead design reviews.</li>
          <li>Two heavy courses together (see the dashboard warning) is how people quit. Change the plan, not the standard.</li>
          <li>Ship weekly. Unshipped weeks are unattended weeks.</li>
          <li>Use AI as a tutor. Do not turn in its first draft. Disclose.</li>
        </ul>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Announcements</h3>
        {ANNOUNCEMENTS.map((a) => (
          <div key={a.id} className="resource">
            <div className="kind">{a.date}</div>
            <strong>{a.title}</strong>
            <p>{a.body}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Your journal (private)</h3>
        <textarea className="textarea" style={{ minHeight: 180 }} value={note} onChange={(e) => s.setNotes('global', e.target.value)} placeholder="What confused you. What you shipped. What you will retrieve tomorrow without notes." />
      </div>
    </div>
  )
}
