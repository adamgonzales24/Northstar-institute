import { Link, useSearchParams } from 'react-router-dom'
import { useStudent } from '../context/StudentContext.jsx'
import ProgressRing, { moduleProgress } from '../components/ProgressRing.jsx'
import { searchCourses } from '../data/catalog.js'
import { PROGRAM } from '../data/activeProgram.js'

const BUCKETS = PROGRAM.buckets

export default function CourseList() {
  const s = useStudent()
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const list = searchCourses(q)

  return (
    <div className="page wide">
      <h1 className="page-title">Catalog</h1>
      <p className="page-sub">{s.courses.length} courses · {PROGRAM.totalCreditsTarget} semester hours (plus MATH 099 if needed)</p>
      {BUCKETS.map((b) => {
        const rows = list.filter((c) => c.bucket === b.id)
        if (!rows.length) return null
        return (
          <section key={b.id} style={{ marginBottom: 22 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, margin: '0 0 8px' }}>{b.name}</h2>
            <p style={{ color: 'var(--muted)', marginTop: 0 }}>{b.note}</p>
            <div className="grid" style={{ gap: 8 }}>
              {rows.map((c) => {
                const en = s.state.enrollments[c.id]
                return (
                  <Link key={c.id} to={`/courses/${c.id}`} className="course-card">
                    <ProgressRing value={moduleProgress(en, c.weeks.length)} color={c.color} size={46} />
                    <div>
                      <div className="code">
                        {c.code} · {c.credits} cr {c.enrollWhenReady ? '· enroll when ready' : ''} {c.heavy ? '· heavy' : ''}
                      </div>
                      <div className="title">{c.title}</div>
                      <div className="meta">
                        {(c.prereqs || []).length ? `Prereq: ${c.prereqs.join(', ')}` : 'No prereqs'} · {c.hoursPerWeek} h/wk
                        {en?.status ? ` · ${en.status}` : ''}
                      </div>
                    </div>
                    <span className="pill">{en?.status || 'catalog'}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
