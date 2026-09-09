import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useStudent } from '../context/StudentContext.jsx'
import ProgressRing, { moduleProgress } from '../components/ProgressRing.jsx'
import { letterClass } from '../lib/grades.js'

export default function CourseHome() {
  const { courseId } = useParams()
  const s = useStudent()
  const c = s.byId[courseId]
  if (!c) return <div className="page">Unknown course.</div>
  const en = s.state.enrollments[courseId]
  const g = s.courseGrade(courseId)
  const base = `/courses/${courseId}`
  const enrolled = en && (en.status === 'in-progress' || en.status === 'completed' || en.enrolled)

  return (
    <div className="page wide">
      <div className="course-card" style={{ marginBottom: 14, cursor: 'default' }}>
        <ProgressRing value={moduleProgress(en, c.weeks.length)} color={c.color} size={58} />
        <div>
          <div className="code">{c.code} · {c.credits} semester credits</div>
          <div className="title" style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{c.title}</div>
          <div className="meta">
            {(c.prereqs || []).length ? `Prerequisites: ${c.prereqs.join(', ')}` : 'No prerequisites'}
            {' · '}Offered {c.termsOffered.join(', ')}
            {c.enrollWhenReady ? ' · Enroll when ready' : ''}
            {c.heavy ? ' · Heavy reading/load' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`pill ${letterClass(g.letter)}`}>{g.letter || '—'} {g.percent != null ? `${g.percent}%` : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{en?.status || 'not enrolled'}</div>
        </div>
      </div>
      <div className="btn-row" style={{ marginBottom: 8 }}>
        {!enrolled && (
          <button className="btn primary" onClick={() => s.enroll([courseId], s.now?.id, 'in-progress')}>
            Enroll this term
          </button>
        )}
        {en && en.status === 'planned' && (
          <button className="btn primary" onClick={() => s.enroll([courseId], s.now?.id, 'in-progress')}>
            Start now (self-paced unlock)
          </button>
        )}
        {en && en.status === 'in-progress' && (
          <button className="btn" onClick={() => s.completeCourse(courseId)}>
            Mark course complete
          </button>
        )}
        <Link className="btn" to={`${base}/modules/${en?.lastModule || 1}`}>
          Open current module
        </Link>
      </div>
      <nav className="tabs">
        <NavLink end to={base} className={({ isActive }) => (isActive ? 'active' : '')}>Syllabus</NavLink>
        <NavLink to={`${base}/modules`} className={({ isActive }) => (isActive ? 'active' : '')}>Modules</NavLink>
        <NavLink to={`${base}/notebook`} className={({ isActive }) => (isActive ? 'active' : '')}>Notebook</NavLink>
        <NavLink to={`${base}/readings`} className={({ isActive }) => (isActive ? 'active' : '')}>Readings</NavLink>
        <NavLink to={`${base}/assignments`} className={({ isActive }) => (isActive ? 'active' : '')}>Assignments</NavLink>
        <NavLink to={`${base}/grades`} className={({ isActive }) => (isActive ? 'active' : '')}>Grades</NavLink>
        <NavLink to={`${base}/resources`} className={({ isActive }) => (isActive ? 'active' : '')}>Resources</NavLink>
        <NavLink to={`${base}/professor`} className={({ isActive }) => (isActive ? 'active' : '')}>Professor</NavLink>
      </nav>
      <Outlet context={{ c, en }} />
    </div>
  )
}
