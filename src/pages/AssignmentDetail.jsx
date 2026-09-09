import { Link, useParams } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { formatLong } from '../lib/dates.js'
import { fetchAiStatus, gradeAssignment } from '../lib/ai.js'
import AskProfessor from '../components/AskProfessor.jsx'
import ConfettiBurst from '../components/ConfettiBurst.jsx'
import QuizPage from './QuizPage.jsx'
import { newNoteId } from '../lib/notes.js'
import { saveReadingFile, sniffMime } from '../lib/readings.js'

export default function AssignmentDetail() {
  const { courseId, itemId } = useParams()
  const s = useStudent()
  const c = s.byId[courseId]
  const item = c?.gradedItems.find((i) => i.id === itemId)
  if (!c || !item) return <div className="page">Item not found.</div>
  if (item.quizId && c.quizzes?.[item.quizId]) {
    return <QuizPage embed course={c} item={item} />
  }
  return <WorkForm course={c} item={item} />
}

function WorkForm({ course, item }) {
  const s = useStudent()
  const en = s.state.enrollments[course.id]
  const existing = en?.submissions?.[item.id] || {}
  const [text, setText] = useState(existing.text || '')
  const [url, setUrl] = useState(existing.githubUrl || '')
  const [hash, setHash] = useState(existing.commit || '')
  const [checks, setChecks] = useState(existing.checks || {})
  const [files, setFiles] = useState(existing.files || [])
  const [fileErr, setFileErr] = useState('')
  const fileRef = useRef()
  const [celebrate, setCelebrate] = useState(false)
  const [confirm, setConfirm] = useState(!!existing.completed)
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState('')
  const [showNotes, setShowNotes] = useState(!!existing.professorKeyRevealed)
  useRemember(`/courses/${course.id}/work/${item.id}`, course.id, item.week)
  const due = s.dueFor(course.id, item.week)
  const noteLink = `[${item.title}](/courses/${course.id}/work/${item.id})`
  const max = item.points
  const aiScore = existing.aiScore
  const aiFeedback = existing.aiFeedback
  const aiQuestions = existing.aiQuestions || []
  const aiRubric = existing.aiRubric || []

  function payload(extra = {}) {
    return {
      text,
      githubUrl: url,
      commit: hash,
      checks,
      files,
      completed: true,
      ...extra,
    }
  }

  async function submitWork() {
    setGradeError('')
    s.submit(course.id, item.id, payload())
    setConfirm(true)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 2800)
    await runGrade()
  }

  async function runGrade() {
    setGrading(true)
    setGradeError('')
    try {
      const st = await fetchAiStatus()
      if (!st.available) {
        setGradeError('Work is saved. Start Ollama on the Linux machine to grade it with the local model.')
        return
      }
      const result = await gradeAssignment({
        course: { code: course.code, title: course.title },
        item: {
          title: item.title,
          prompt: item.prompt,
          points: item.points,
          rubric: item.rubric || [],
        },
        work: {
          text,
          githubUrl: url,
          commit: hash,
          checks,
          files: files.map((f) => ({ name: f.name, mime: f.mime, size: f.size })),
          model: s.state.profile.aiModel || undefined,
        },
      })
      s.submit(course.id, item.id, payload({
        aiScore: result.total,
        aiFeedback: result.feedback,
        aiQuestions: result.questions,
        aiRubric: result.scores,
        aiLetter: result.letter,
        aiGradedAt: new Date().toISOString(),
      }))
    } catch (err) {
      setGradeError(err.message || 'Local grading failed. Your submission is still saved.')
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="page">
      <ConfettiBurst show={celebrate} />
      <p className="page-sub">
        <Link to={`/courses/${course.id}/assignments`}>← {course.code}</Link>
      </p>
      <h1 className="page-title">{item.title}</h1>
      <p className="page-sub">
        {item.points} points · ~{item.hours} hours · suggested due {formatLong(due)} · week {item.week}
      </p>
      {confirm && (
        <div className="banner-strip info" role="status">
          <div>
            <div className="eyebrow">Submitted</div>
            <strong>Your assignment is saved.</strong>
            <div>
              {grading
                ? 'Local AI is reading it against the rubric — this can take a minute on the 32B model.'
                : aiScore != null
                  ? s.state.profile.gradingMode === 'letters'
                    ? `Grade: ${aiScore}/${max}${existing.aiLetter ? ` (${existing.aiLetter})` : ''}.`
                    : `Tutor notes are in. This item is complete (${aiScore}/${max} if you want the number).`
                  : 'You can ask the professor to comment whenever Ollama is running.'}
            </div>
          </div>
        </div>
      )}
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <Link className="btn small" to={`/courses/${course.id}/notebook/${item.week ? `week-${item.week}` : 'journal'}`}>
          Open week notebook
        </Link>
        <button
          type="button"
          className="btn small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(noteLink)
            } catch {
              /* ignore */
            }
          }}
        >
          Copy note link
        </button>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Prompt</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{item.prompt}</p>
        {item.submissionNotes && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{item.submissionNotes}</p>
        )}
        {item.githubStructure && (
          <p>
            Suggested repo layout: <code>{item.githubStructure.join(' / ')}</code>
          </p>
        )}
      </div>
      {(item.rubric || []).length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Rubric</h3>
          <p className="page-sub">The local tutor grades against this. You do not score yourself.</p>
          {(item.rubric || []).map((r) => (
            <div key={r.criterion} style={{ marginBottom: 12 }}>
              <strong>
                {r.criterion} ({r.points} pts)
              </strong>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Excellent: {r.excellent} Adequate: {r.adequate} Poor: {r.poor}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Submission</h3>
        {(item.deliverable === 'github' || item.type === 'project') && (
          <>
            <div className="field-wrap">
              <label className="field">GitHub URL</label>
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/you/repo" />
            </div>
            <div className="field-wrap">
              <label className="field">Commit hash to grade</label>
              <input className="input" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="abc123…" />
            </div>
          </>
        )}
        {item.deliverable === 'checklist' && (
          <div>
            {course.weeks.map((w) => (
              <label key={w.week} className="check">
                <input
                  type="checkbox"
                  checked={!!checks[w.week]}
                  onChange={(e) => setChecks({ ...checks, [w.week]: e.target.checked })}
                />
                Week {w.week}: {w.title}
              </label>
            ))}
          </div>
        )}
        <div className="field-wrap">
          <label className="field">Attach files (PDF, Word, zip, images, text)</label>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.zip,.png,.jpg,.jpeg,.py,.js"
            onChange={async (e) => {
              const list = [...(e.target.files || [])]
              e.target.value = ''
              setFileErr('')
              try {
                const next = [...files]
                for (const file of list) {
                  const id = newNoteId('w')
                  const mime = sniffMime(file.name, file.type)
                  const bytes = new Uint8Array(await file.arrayBuffer())
                  const meta = { id, title: file.name, name: file.name, mime, kind: 'work', addedAt: new Date().toISOString() }
                  await saveReadingFile(course.id, meta, bytes)
                  next.push({ id, name: file.name, mime, size: bytes.byteLength })
                }
                setFiles(next)
              } catch (err) {
                setFileErr(err.message || 'Could not attach that file')
              }
            }}
          />
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Upload file
            </button>
          </div>
          {files.map((f) => (
            <div key={f.id} style={{ fontSize: 13, marginTop: 6 }}>
              {f.name} ({Math.round((f.size || 0) / 1024)} KB)
            </div>
          ))}
          {fileErr && <div className="banner-strip warn">{fileErr}</div>}
        </div>
        <div className="field-wrap">
          <label className="field">Work / reflection / AI disclosure</label>
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste prose, or describe what you shipped. Disclose AI: what you asked, what you kept." />
        </div>
        <div className="btn-row">
          <button className="btn primary" type="button" disabled={grading} onClick={submitWork}>
            {existing.completed ? 'Update submission' : 'Submit assignment'}
          </button>
          {existing.completed && (
            <button className="btn" type="button" disabled={grading} onClick={runGrade}>
              {grading ? 'Grading…' : 'Grade with local AI'}
            </button>
          )}
          <button className="btn" type="button" onClick={() => setShowNotes(true)}>
            Professor notes
          </button>
        </div>
      </div>
      {gradeError && <div className="banner-strip warn">{gradeError}</div>}
      {aiScore != null && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>
            Local AI grade — {aiScore}/{max}
            {existing.aiLetter ? ` (${existing.aiLetter})` : ''}
          </h3>
          {aiRubric.map((r) => (
            <p key={r.criterion} style={{ marginBottom: 8 }}>
              <strong>
                {r.criterion}: {r.points}/{r.max ?? r.points}
              </strong>
              {r.comment ? ` — ${r.comment}` : ''}
            </p>
          ))}
          {aiFeedback && <p style={{ whiteSpace: 'pre-wrap' }}>{aiFeedback}</p>}
          {aiQuestions.length > 0 && (
            <>
              <h3>Oral-defense questions</h3>
              <ul>
                {aiQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <p className="page-sub">Answer these in the tutor below. If you cannot, the grade is ahead of the understanding.</p>
            </>
          )}
        </div>
      )}
      {showNotes && (
        <div className="banner-strip info">
          <div>
            <div className="eyebrow">Professor notes</div>
            <p>
              A {Math.round(max * 0.85)}+ means the prompt is hit, tests or citations exist, and there is an honest limitation note.
              Below {Math.round(max * 0.7)} usually means a missing deliverable or an explanation you could not give out loud.
            </p>
          </div>
        </div>
      )}
      <AskProfessor scope={`${course.id}:${item.id}`} course={course} week={item.week} item={item} />
    </div>
  )
}
