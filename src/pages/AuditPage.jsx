import { Link } from 'react-router-dom'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { planYears } from '../lib/plans.js'


export default function AuditPage() {
  const s = useStudent()
  useRemember('/audit')
  const audit = s.audit
  const years = planYears(s.plan, s.calendar)

  return (
    <div className="page wide">
      <h1 className="page-title">Degree audit</h1>
      <p className="page-sub">
        {audit.towardDegree} / {audit.target} credits · unofficial · {s.state.profile.pace} plan
      </p>
      {audit.csOnly && (
        <div className="banner-strip warn">
          CS-only mode is on. A real U.S. B.S. includes general education. You are building job-ready CS/SE, not claiming a liberal-arts degree.
        </div>
      )}
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="k">Progress</div>
          <div className="v">{Math.round((audit.towardDegree / audit.target) * 100) || 0}%</div>
          <div className="audit-bar" style={{ marginTop: 8 }}>
            <span style={{ width: `${Math.min(100, (audit.towardDegree / audit.target) * 100)}%` }} />
          </div>
        </div>
      </div>
      {audit.buckets.map((b) => (
        <div key={b.id} className="card" style={{ marginBottom: 12 }}>
          <h3>
            {b.name} · {b.earned}/{b.target || b.credits} cr {b.waived ? '(waived)' : ''}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{b.note}</p>
          <div className="audit-bar" style={{ marginBottom: 10 }}>
            <span style={{ width: `${Math.min(100, (b.earned / (b.target || b.credits || 1)) * 100)}%` }} />
          </div>
          <table className="data">
            <tbody>
              {b.courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/courses/${c.id}`}>
                      {c.code} {c.title}
                    </Link>
                  </td>
                  <td>{c.rawCredits} cr</td>
                  <td>
                    <span className="pill">{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2 className="page-title" style={{ fontSize: 22, marginTop: 28 }}>
        Sample plan ({s.state.profile.pace})
      </h2>
      <p className="page-sub">Winter and summer are enabled. Click a course to open it. Plans rebuild if you change pace or start date in Settings.</p>
      <div className="roadmap">
        {years.map((y) => (
          <div key={y.id} className="year-block">
            <h3>{y.label}</h3>
            <div className="term-row">
              {y.terms.map((t) => (
                <div key={t.termIndex} className="term-chip">
                  <div className="t">
                    {t.calendar?.name} · {t.calendar?.weeks} weeks
                    {t.calendar?.intensive ? ' · intensive' : ''}
                  </div>
                  {t.courseIds.map((id) => {
                    const c = s.byId[id]
                    return (
                      <div key={id}>
                        <Link to={`/courses/${id}`}>{c ? `${c.code} ${c.title}` : id}</Link>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
