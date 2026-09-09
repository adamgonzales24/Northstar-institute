import { Link } from 'react-router-dom'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { INTERVIEW_APPENDIX } from '../data/interview.js'

const SPINE = [
  { id: 'CS110', tag: 'CLI tools', repo: 'northstar-cli-tools' },
  { id: 'CS215', tag: 'Data structures library', repo: 'northstar-ds' },
  { id: 'CS220', tag: 'Nand2Tetris from-scratch components', repo: 'northstar-nand2tetris' },
  { id: 'CS340', tag: 'Relational schema + SQL app', repo: 'northstar-sql-app' },
  { id: 'CS420', tag: 'REST API + simple frontend', repo: 'northstar-web' },
  { id: 'SE310', tag: 'Team-style SE project (issues, PRs, tests, CI notes)', repo: 'northstar-helpdesk' },
  { id: 'SE491', tag: 'Capstone product', repo: 'northstar-capstone' },
]

const README = `# <project-name>

Self-directed coursework at **Northstar Institute** (unaccredited B.S.-equivalent, Software Engineering & Computer Science).
This repository is a course deliverable for **<CODE> — <TITLE>**, not a product of an accredited university.

## What it is
- One paragraph.

## Run
\`\`\`bash
# install / build / test commands
\`\`\`

## Design notes
- Tradeoffs.

## Tests
- How to run them and what they cover.

## Honest limitations
- What you would do with another week.

## License
MIT unless the assignment says otherwise.
`

export default function PortfolioPage() {
  const s = useStudent()
  useRemember('/portfolio')
  const projects = s.courses.flatMap((c) =>
    (c.projects || []).map((p) => ({ ...p, courseId: c.id, code: c.code, courseTitle: c.title }))
  )

  return (
    <div className="page">
      <h1 className="page-title">Portfolio</h1>
      <p className="page-sub">A coherent public GitHub org beats forty disconnected toys. Suggested spine:</p>
      {SPINE.map((sp) => {
        const c = s.byId[sp.id]
        return (
          <div key={sp.id} className="resource">
            <div className="kind">{c?.code || sp.id}</div>
            <Link to={`/courses/${sp.id}`}>{sp.tag}</Link>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Suggested repo: {sp.repo}</div>
          </div>
        )
      })}
      <h2 style={{ fontFamily: 'var(--serif)' }}>GitHub-ready README template</h2>
      <pre className="card" style={{ overflow: 'auto', fontSize: 12 }}>
        {README}
      </pre>
      <h2 style={{ fontFamily: 'var(--serif)' }}>Course projects</h2>
      {projects.map((p) => (
        <div key={p.courseId + p.id} className="resource">
          <div className="kind">{p.code}</div>
          <strong>{p.title}</strong>
          <p>{p.brief}</p>
          <Link to={`/courses/${p.courseId}`}>Open course</Link>
        </div>
      ))}
      <h2 style={{ fontFamily: 'var(--serif)' }}>{INTERVIEW_APPENDIX.title}</h2>
      <div className="banner-strip danger">
        <div>
          {INTERVIEW_APPENDIX.never.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Resume language</h3>
        <p>{INTERVIEW_APPENDIX.resume.educationLine}</p>
        <p>{INTERVIEW_APPENDIX.resume.alternative}</p>
        <p>{INTERVIEW_APPENDIX.resume.projectsOverEducation}</p>
      </div>
      {INTERVIEW_APPENDIX.scripts.map((sc) => (
        <div key={sc.prompt} className="card" style={{ marginTop: 10 }}>
          <h3>{sc.prompt}</h3>
          <p>{sc.answer}</p>
        </div>
      ))}
      <div className="card" style={{ marginTop: 10 }}>
        <h3>When they require a degree</h3>
        <ul>
          {INTERVIEW_APPENDIX.whenTheyWantADegree.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
