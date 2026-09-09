import { Link, useOutletContext } from 'react-router-dom'
import { useStudent } from '../context/StudentContext.jsx'
import { letterClass, scoreItem } from '../lib/grades.js'
import AskProfessor from '../components/AskProfessor.jsx'
import { itemLabel } from '../data/expand.js'

export function SyllabusTab() {
  const { c } = useOutletContext()
  return (
    <article className="syllabus prose">
      <h3>Catalog description</h3>
      <p>{c.description}</p>
      <h3>Why these materials</h3>
      <p>{c.whyLanguageOrBook}</p>
      <h3>Learning outcomes</h3>
      <ol>
        {c.outcomes.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ol>
      <h3>Estimated load</h3>
      <p>
        {c.hoursPerWeek} hours/week over {c.termWeeks || c.weeks.length} weeks ({c.estimatedHours} hours).
        {c.credits ? ` Credits: ${c.credits}.` : ' Bootcamp path — no semester credits.'}
      </p>
      <h3>Grading</h3>
      <table className="data">
        <thead>
          <tr>
            <th>Category</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(c.gradingWeights || {}).map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Letter grades use the Institute scale (A 93, A− 90, … C− 70, F below 60). Passing a course requires 70% and completed modules.</p>
      <h3>Required / primary free resources</h3>
      <ResourceList items={c.materials?.primaryFree} />
      <h3>O’Reilly Online Learning</h3>
      <p>You have a subscription. Prefer these when a textbook is the right tool.</p>
      <ResourceList items={c.materials?.oreilly} oreilly />
      {(c.materials?.optionalPaid || []).length > 0 && (
        <>
          <div className="paid-card">
            <strong>Paid option — ask student first.</strong>
            <p style={{ margin: '6px 0 0' }}>The default path is free. Do not buy these unless you want them.</p>
            <ul>
              {c.materials.optionalPaid.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}.</strong> {p.note}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <h3>15-week outline</h3>
      <ol>
        {c.weeks.map((w) => (
          <li key={w.week}>
            <strong>Week {w.week}: {w.title}.</strong> {w.topics.join('; ')}
          </li>
        ))}
      </ol>
      <h3>Academic integrity</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{c.integrity}</p>
      <h3>Late policy</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{c.late}</p>
      {c.gitChecklist && (
        <>
          <h3>Git workflow (required in this course)</h3>
          <ol>
            {c.gitChecklist.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
        </>
      )}
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Print this page if you want a paper syllabus (browser print). PDFs are optional; this screen is official.</p>
    </article>
  )
}

export function ModulesTab() {
  const { c, en } = useOutletContext()
  const s = useStudent()
  return (
    <div>
      <p className="page-sub">Self-paced: later weeks are never locked. Suggested due dates stay visible so you have a target.</p>
      {c.weeks.map((w) => {
        const done = en?.moduleComplete?.[w.week]
        const due = s.dueFor(c.id, w.week)
        return (
          <Link key={w.week} to={`/courses/${c.id}/modules/${w.week}`} className={`module-row ${done ? 'done' : ''}`}>
            <div className="week-num">W{w.week}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{w.topics.slice(0, 4).join(' · ')}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
              {done ? 'complete' : 'open'}
              <div>due {due}</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function AssignmentsTab() {
  const { c, en } = useOutletContext()
  const s = useStudent()
  const items = (c.gradedItems || []).filter((i) => i.type !== 'participation')
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th>Week</th>
          <th>Due</th>
          <th>Pts</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const sub = en?.submissions?.[it.id]
          const score = scoreItem(it, sub)
          return (
            <tr key={it.id}>
              <td>
                <Link to={`/courses/${c.id}/work/${it.id}`}>{it.title}</Link>
              </td>
              <td>{itemLabel(it.type)}</td>
              <td>{it.week}</td>
              <td>{s.dueFor(c.id, it.week)}</td>
              <td>{it.points}</td>
              <td>{score != null ? `${score}/${it.points}` : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function CourseGradesTab() {
  const { c, en } = useOutletContext()
  const s = useStudent()
  const g = s.courseGrade(c.id)
  return (
    <div>
      <p>
        Running grade: <strong className={`pill ${letterClass(g.letter)}`}>{g.letter || '—'} {g.percent ?? '—'}%</strong>
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Category</th>
            <th>Earned</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(g.breakdown || {}).map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>
                {v.earned}/{v.possible} ({v.percent}%)
              </td>
              <td>{v.weight}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResourcesTab() {
  const { c } = useOutletContext()
  return (
    <div>
      <h3>Primary free path</h3>
      <ResourceList items={c.materials?.primaryFree} />
      <h3>O’Reilly</h3>
      <ResourceList items={c.materials?.oreilly} oreilly />
      {(c.materials?.optionalPaid || []).length > 0 && (
        <div className="paid-card">
          <strong>Paid option — ask student first.</strong>
          <ul>
            {c.materials.optionalPaid.map((p) => (
              <li key={p.title}>
                {p.title} — {p.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.projects?.length > 0 && (
        <>
          <h3>Project briefs</h3>
          {c.projects.map((p) => (
            <div key={p.id} className="resource">
              <div className="kind">Project · {p.points} pts</div>
              <strong>{p.title}</strong>
              <p>{p.brief}</p>
              {p.githubStructure && <code>{p.githubStructure.join(' · ')}</code>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function CourseProfessorTab() {
  const { c } = useOutletContext()
  const s = useStudent()
  const note = s.courseNotebook(c.id).pages.find((p) => p.id === 'journal')?.body || ''
  return (
    <div className="grid-2 grid">
      <div className="card">
        <h3>Office hours (async)</h3>
        <ul>
          {(c.officeHours || []).map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <h3>Study questions</h3>
        <ul>
          {(c.studyQuestions || []).map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Your notes</h3>
        <p className="page-sub">Course journal. Week-by-week pages live under Notebook.</p>
        <textarea className="textarea" value={note} onChange={(e) => s.setNotes('course', e.target.value, c.id)} placeholder="Private notes for this course. Saved with your student record." />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <Link className="btn small" to={`/courses/${c.id}/notebook`}>
            Open notebook
          </Link>
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <AskProfessor scope={c.id} course={c} />
      </div>
    </div>
  )
}

function ResourceList({ items, oreilly }) {
  if (!items?.length) return <p className="page-sub">None listed.</p>
  return items.map((r) => (
    <div key={r.title} className="resource">
      <div className="kind">{r.kind || (oreilly ? 'O’Reilly' : 'Resource')}</div>
      {r.url ? (
        <a href={r.url} target="_blank" rel="noreferrer">
          {r.title}
        </a>
      ) : (
        <strong>{r.title}</strong>
      )}
      {r.authors && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{r.authors}</div>}
      {oreilly && r.search && (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Search O’Reilly for: {r.search}</div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{r.note}</div>
    </div>
  ))
}
