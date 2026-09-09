import { useEffect, useRef, useState } from 'react'
import { useStudent } from '../context/StudentContext.jsx'
import { fetchAiStatus, streamChat } from '../lib/ai.js'

export default function AskProfessor({ scope = 'global', course, week, item, compact = false }) {
  const s = useStudent()
  const [status, setStatus] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef(null)
  const [messages, setMessages] = useState(() => s.professorChat(scope))

  useEffect(() => {
    fetchAiStatus().then(setStatus)
  }, [])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [messages, busy])

  async function send(text) {
    const q = (text || draft).trim()
    if (!q || busy) return
    setDraft('')
    setError('')
    const history = [...messages, { role: 'user', content: q }]
    setMessages(history)
    setBusy(true)
    let full = ''
    try {
      await streamChat({
        messages: history,
        context: {
          student: s.state.profile?.name || 'Student',
          course: course ? `${course.code} ${course.title}` : null,
          week: week || null,
          item: item ? `${item.title} (${item.points} pts)` : null,
          prompt: item?.prompt || null,
        },
        onDelta(_delta, all) {
          full = all
          setMessages([...history, { role: 'assistant', content: all }])
        },
      })
      const final = full.trim()
        ? [...history, { role: 'assistant', content: full }]
        : [...history, { role: 'assistant', content: 'I did not get a reply from the local model. Is Ollama running on the Linux machine?' }]
      setMessages(final)
      s.setProfessorChat(scope, final)
    } catch (err) {
      setError(err.message || 'Could not reach the local model')
      setMessages(history)
      s.setProfessorChat(scope, history)
    } finally {
      setBusy(false)
    }
  }

  const ready = status?.available
  return (
    <div className={`card tutor ${compact ? 'compact' : ''}`}>
      <h3>{compact ? 'Ask a question' : 'Ask the professor'}</h3>
      <p className="page-sub">
        {ready
          ? `Local model ${status.model} on this computer — no tokens, no API bill.`
          : status
            ? 'Local AI is offline. On the Linux machine, start Ollama (`ollama serve`) and keep this server running.'
            : 'Checking the local model…'}
      </p>
      {!!messages.length && (
        <div className="tutor-log" ref={box}>
          {messages.map((m, i) => (
            <div key={i} className={`tutor-msg ${m.role}`}>
              <div className="tutor-who">{m.role === 'user' ? 'You' : 'Prof. North'}</div>
              <div className="tutor-body">{m.content}</div>
            </div>
          ))}
          {busy && <div className="page-sub">Thinking…</div>}
        </div>
      )}
      {error && <div className="banner-strip warn">{error}</div>}
      <div className="field-wrap">
        <label className="field" htmlFor={`ask-${scope}`}>
          Your question
        </label>
        <textarea
          id={`ask-${scope}`}
          className="textarea"
          style={{ minHeight: compact ? 72 : 96 }}
          value={draft}
          disabled={busy || status?.available === false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder={course ? `Ask about ${course.code}${week ? ` week ${week}` : ''}…` : 'Ask a question about the reading, a bug, or the prompt…'}
        />
      </div>
      <div className="btn-row">
        <button className="btn primary" type="button" disabled={busy || !draft.trim() || !ready} onClick={() => send()}>
          {busy ? 'Asking…' : 'Ask'}
        </button>
        {messages.length > 0 && (
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => {
              setMessages([])
              s.setProfessorChat(scope, [])
            }}
          >
            Clear chat
          </button>
        )}
      </div>
    </div>
  )
}
