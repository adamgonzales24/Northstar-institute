import { Link, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { gitCommit, gitStatus } from '../lib/git.js'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { formatLong } from '../lib/dates.js'
import LinedEditor from '../components/LinedEditor.jsx'
import AskProfessor from '../components/AskProfessor.jsx'
import { moduleLink, pageTitleForWeek, weekPageId } from '../lib/notes.js'
import { readingHref, readingKey, oreillySearchUrl } from '../lib/oreilly.js'

export default function ModuleViewer() {
  const { courseId, week } = useParams()
  const s = useStudent()
  const c = s.byId[courseId]
  const n = Number(week)
  const w = c?.weeks.find((x) => x.week === n)
  useRemember(`/courses/${courseId}/modules/${n}`, courseId, n)
  if (!c || !w) return <div className="page">Module not found.</div>
  const en = s.state.enrollments[courseId]
  const done = !!en?.moduleComplete?.[n]
  const due = s.dueFor(courseId, n)
  const items = (c.gradedItems || []).filter((i) => i.week === n)

  return (
    <div className="page">
      <p className="page-sub">
        <Link to={`/courses/${courseId}`}>← {c.code}</Link>
      </p>
      <h1 className="page-title">
        Week {w.week}: {w.title}
      </h1>
      <p className="page-sub">
        Suggested due {formatLong(due)} · ~{w.hours} hours · {done ? 'marked complete' : 'open'} · content is never locked
      </p>
      <div className="banner-strip">
        <div>
          <div className="eyebrow">Professor note</div>
          {w.professorNote}
        </div>
      </div>
      <div className="grid-2 grid">
        <div className="card">
          <h3>Outcomes</h3>
          <ul>
            {w.outcomes.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h3>Topics</h3>
          <ul>
            {w.topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3>Lab</h3>
          <p>{w.lab || 'See assignments.'}</p>
        </div>
        <div className="card">
          <h3>Readings (do these)</h3>
          <ReadList courseId={c.id} week={w.week} items={w.readings} checks={en?.chapterChecks} />
          <h3>Lectures (optional)</h3>
          <ReadList items={w.lectures} />
        </div>
      </div>
      {c.gitChecklist && <GitRecordCard course={c} enrollment={en} week={n} />}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>This week’s graded work</h3>
        {items.length === 0 && <p className="page-sub">No formal graded item this week — do the lab and mark complete.</p>}
        {items.map((it) => (
          <div key={it.id} style={{ marginBottom: 8 }}>
            <Link to={`/courses/${courseId}/work/${it.id}`}>
              {it.title} ({it.points} pts, ~{it.hours}h)
            </Link>
          </div>
        ))}
      </div>
      <WeekNotes course={c} week={w} />
      <div style={{ marginTop: 12 }}>
        <AskProfessor scope={`${courseId}:week-${n}`} course={c} week={n} compact />
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={() => s.toggleModule(courseId, n)}>
          {done ? 'Mark incomplete' : 'Mark week complete'}
        </button>
        {n > 1 && (
          <Link className="btn" to={`/courses/${courseId}/modules/${n - 1}`}>
            Previous
          </Link>
        )}
        {n < c.weeks.length && (
          <Link className="btn" to={`/courses/${courseId}/modules/${n + 1}`}>
            Next week (unlocked)
          </Link>
        )}
      </div>
    </div>
  )
}

function WeekNotes({ course, week }) {
  const s = useStudent()
  const editor = useRef(null)
  const pageId = weekPageId(week.week)
  const page = s.courseNotebook(course.id).pages.find((p) => p.id === pageId)
  const body = page?.body || ''
  const title = pageTitleForWeek(week.week, week.title)
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Notebook — this week</h3>
      <p className="page-sub">
        Saved only for {course.code}. Use <code>[[week {week.week}]]</code> or a markdown link to jump back here.
      </p>
      <div className="btn-row" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className="btn small"
          onClick={() => editor.current?.insert(moduleLink(course.id, week.week, week.title) + '\n')}
        >
          Insert link to this week
        </button>
        {(week.readings || [])
          .filter((r) => r.url)
          .slice(0, 4)
          .map((r) => (
            <button key={r.title} type="button" className="btn small" onClick={() => editor.current?.insert(`[${r.title}](${r.url})\n`)}>
              Link: {r.title}
            </button>
          ))}
        <Link className="btn small" to={`/courses/${course.id}/notebook/${pageId}`}>
          Open full notebook
        </Link>
      </div>
      <LinedEditor
        ref={editor}
        value={body}
        onChange={(next) => s.setNotePage(course.id, pageId, { title, body: next, week: week.week })}
        placeholder={`Week ${week.week} notes…\n${moduleLink(course.id, week.week, week.title)}`}
      />
    </div>
  )
}

function ReadList({ items, courseId, week, checks }) {
  const s = useStudent()
  if (!items?.length) return <p className="page-sub">None assigned — use the course resources tab.</p>
  return (
    <ul>
      {items.map((r, i) => {
        const href = readingHref(r)
        const key = courseId ? readingKey(week, r, i) : String(i)
        const checked = !!(checks && checks[key])
        return (
          <li key={key}>
            {courseId && (
              <label className="check" style={{ display: 'inline-flex', marginRight: 8 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => s.setChapterCheck(courseId, key, e.target.checked)}
                />
              </label>
            )}
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            ) : (
              r.title
            )}
            {(r.search || r.oreilly) && (
              <a href={oreillySearchUrl(r.search || r.title)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 12 }}>
                O’Reilly
              </a>
            )}
            {r.source && <span style={{ color: 'var(--muted)' }}> — {r.source}</span>}
            {checked && r.todo && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Todo: {r.todo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

function GitRecordCard({ course, enrollment, week }) {
  const s = useStudent()
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState(null)
  const checks = enrollment?.gitChecks || {}
  const records = enrollment?.gitRecords || []

  useEffect(() => {
    gitStatus()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [records.length])

  async function commitAndPush() {
    const text = comment.trim()
    if (!text) {
      setErr('Write what you did. That becomes the commit message.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const result = await gitCommit({ comment: text, courseId: course.id, week })
      s.addGitRecord(course.id, {
        comment: text,
        url: result.url || '',
        hash: result.hash || '',
        branch: result.branch || '',
        pushed: !!result.pushed,
      })
      if (result.hash) s.setGitCheck(course.id, 'Initialize a git repo (or clone your Northstar workspace).', true)
      setComment('')
      setInfo((prev) => ({ ...prev, ...result, head: result.short || result.hash, dirty: false }))
      if (!result.pushed && result.pushError) setErr(`Saved the commit, but push failed: ${result.pushError}`)
    } catch (e) {
      setErr(e.message || 'Git commit failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Git workflow</h3>
      <p className="page-sub">
        Write a real sentence, then commit and push to GitHub from this app. On iPad this uses the Linux server — you do not need the files on the tablet.
        {info?.branch ? ` Current branch: ${info.branch}${info.head ? ` @ ${info.head}` : ''}.` : ''}
      </p>
      <div className="progress-list">
        {course.gitChecklist.map((g) => (
          <label key={g} className="check">
            <input type="checkbox" checked={!!checks[g]} onChange={(e) => s.setGitCheck(course.id, g, e.target.checked)} />
            <span>{g}</span>
          </label>
        ))}
      </div>
      <div className="field-wrap" style={{ marginTop: 12 }}>
        <label className="field">Commit message</label>
        <textarea
          className="textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Document PATH, editor, and git version for bootcamp week 1."
        />
      </div>
      <div className="btn-row">
        <button type="button" className="btn primary" disabled={busy} onClick={commitAndPush}>
          {busy ? 'Committing…' : 'Commit and push'}
        </button>
      </div>
      {err && <div className="banner-strip warn" style={{ marginTop: 12 }}>{err}</div>}
      {records.length > 0 && (
        <ul style={{ marginTop: 12 }}>
          {records
            .slice()
            .reverse()
            .slice(0, 6)
            .map((r, i) => (
              <li key={r.at || i}>
                {r.at ? new Date(r.at).toLocaleString() : ''} — {r.comment}
                {r.hash ? ` (${String(r.hash).slice(0, 7)})` : ''}
                {r.url ? (
                  <>
                    {' '}
                    <a href={r.url} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </>
                ) : null}
                {r.pushed === false ? ' · local only' : ''}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
