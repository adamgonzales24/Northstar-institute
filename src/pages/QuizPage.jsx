import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { formatLong } from '../lib/dates.js'
import { fetchAiStatus, gradeQuizShortAnswers } from '../lib/ai.js'
import ConfettiBurst from '../components/ConfettiBurst.jsx'
import AskProfessor from '../components/AskProfessor.jsx'

export default function QuizPage({ embed, course, item }) {
  const params = useParams()
  const s = useStudent()
  const c = course || s.byId[params.courseId]
  const it = item || c?.gradedItems.find((i) => i.id === params.itemId)
  const quiz = c?.quizzes?.[it?.quizId]
  useRemember(c && it ? `/courses/${c.id}/work/${it.id}` : '/courses', c?.id, it?.week)
  const existing = (c && it && s.state.enrollments[c.id]?.quizAttempts?.[it.quizId]) || null
  const [answers, setAnswers] = useState(existing?.answers || {})
  const [result, setResult] = useState(existing || null)
  const [celebrate, setCelebrate] = useState(false)
  const [confirm, setConfirm] = useState(!!existing)
  const [grading, setGrading] = useState(false)
  const revealed = existing?.revealed || result?.revealed
  if (!c || !it || !quiz) return <div className="page">Quiz not found. This item may be a project in lieu of an exam — open Assignments.</div>

  async function submit() {
    const r = s.gradeQuiz(c.id, it.id, it.quizId, quiz, answers)
    setResult({ ...r, answers, revealed: false })
    setConfirm(true)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 2800)
    const shorts = quiz.questions.some((q) => q.type !== 'mc')
    if (!shorts) return
    setGrading(true)
    try {
      const st = await fetchAiStatus()
      if (!st.available) return
      const ai = await gradeQuizShortAnswers({ quiz, item: it, answers })
      if (!ai?.details) return
      const details = r.details.map((d) => {
        const hit = (ai.details || []).find((x) => x.index === d.index)
        if (!hit) return d
        const earned = Math.max(0, Math.min(quiz.questions[d.index].points, Number(hit.earned) || 0))
        return { ...d, ok: !!hit.ok, earned, aiComment: hit.comment || '' }
      })
      const earned = details.reduce((a, d) => a + (d.earned || 0), 0)
      const possible = r.possible
      const percent = possible ? Math.round((earned / possible) * 100) : 0
      s.dispatch({
        type: 'QUIZ',
        courseId: c.id,
        itemId: it.id,
        quizId: it.quizId,
        attempt: { earned, possible, percent, details, answers, at: new Date().toISOString(), revealed: false, ai: true },
      })
      setResult({ earned, possible, percent, details, answers, revealed: false })
    } catch {
      /* keep keyword grade */
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="page">
      <ConfettiBurst show={celebrate} />
      <p className="page-sub">
        <Link to={`/courses/${c.id}/assignments`}>← {c.code}</Link>
      </p>
      <h1 className="page-title">{quiz.title || it.title}</h1>
      <p className="page-sub">
        {it.points} points mapped from {quiz.questions.reduce((a, q) => a + q.points, 0)} quiz points · suggested {quiz.timeLimitMin} min · due{' '}
        {formatLong(s.dueFor(c.id, it.week))}
      </p>
      <div className="banner-strip">
        Attempt once honestly. Multiple-choice is scored immediately. Short answers are graded by the local model when it is running.
      </div>
      {confirm && (
        <div className="banner-strip info" role="status">
          <div>
            <div className="eyebrow">Submitted</div>
            <strong>Your quiz attempt is saved.</strong>
            <div>{grading ? 'Local AI is scoring the short answers…' : result ? `Score: ${result.earned}/${result.possible} (${result.percent}%).` : ''}</div>
          </div>
        </div>
      )}
      {quiz.questions.map((q, i) => {
        const det = result?.details?.[i]
        const cls = revealed && det ? (det.ok ? 'correct' : 'wrong') : ''
        return (
          <div key={i} className={`quiz-q ${cls}`}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {i + 1}. {q.prompt} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({q.points} pts)</span>
            </div>
            {q.type === 'mc' ? (
              q.choices.map((ch, ci) => (
                <label key={ci} className="choice">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    disabled={!!result}
                    checked={Number(answers[i]) === ci}
                    onChange={() => setAnswers({ ...answers, [i]: ci })}
                  />
                  <span>{ch}</span>
                </label>
              ))
            ) : (
              <textarea
                className="textarea"
                style={{ minHeight: 80 }}
                disabled={!!result}
                value={answers[i] || ''}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
              />
            )}
            {revealed && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <strong>{det?.ok ? 'Correct enough.' : 'Missed.'}</strong> {q.explanation}
                {det?.aiComment && <div style={{ color: 'var(--muted)' }}>{det.aiComment}</div>}
                {q.type === 'short' && (
                  <div style={{ color: 'var(--muted)' }}>
                    Key: {typeof q.answer === 'string' ? q.answer : q.choices?.[q.answer]}
                  </div>
                )}
                {q.type === 'mc' && !det?.ok && <div style={{ color: 'var(--muted)' }}>Answer: {q.choices[q.answer]}</div>}
              </div>
            )}
          </div>
        )
      })}
      <div className="btn-row">
        {!result && (
          <button className="btn primary" type="button" onClick={submit} disabled={grading}>
            Submit attempt
          </button>
        )}
        {result && !revealed && (
          <button className="btn" onClick={() => { s.revealQuiz(c.id, it.quizId); setResult({ ...result, revealed: true }) }}>
            Reveal answer key
          </button>
        )}
        {result && (
          <span className="pill">
            {result.earned}/{result.possible} ({result.percent}%)
          </span>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <AskProfessor scope={`${c.id}:${it.id}:quiz`} course={c} week={it.week} item={it} compact />
      </div>
    </div>
  )
}
