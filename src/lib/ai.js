const GRADE_TIMEOUT_MS = 180000

export async function fetchAiStatus() {
  try {
    const r = await fetch('/api/ai/status', { cache: 'no-store' })
    if (!r.ok) return { available: false, error: `HTTP ${r.status}` }
    return await r.json()
  } catch (err) {
    return { available: false, error: err.message || 'Local AI is not reachable' }
  }
}

export async function gradeAssignment({ course, item, work }, signal) {
  const r = await fetch('/api/ai/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'assignment', course, item, work, model: work?.model }),
    signal,
  })
  const data = await readJson(r)
  if (!r.ok || data.error) throw new Error(data.error || `Grading failed (${r.status})`)
  return normalizeAssignmentGrade(data, item)
}

export async function gradeQuizShortAnswers({ quiz, item, answers }, signal) {
  const shorts = quiz.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.type !== 'mc')
  if (!shorts.length) return null
  const r = await fetch('/api/ai/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'quiz',
      item: { title: quiz.title || item.title, points: item.points },
      questions: shorts.map(({ q, i }) => ({
        index: i,
        prompt: q.prompt,
        key: q.answer,
        explanation: q.explanation || '',
        points: q.points,
        student: String(answers[i] ?? ''),
      })),
    }),
    signal,
  })
  const data = await readJson(r)
  if (!r.ok || data.error) throw new Error(data.error || `Quiz grading failed (${r.status})`)
  return data
}

export async function streamChat({ messages, context, signal, onDelta }) {
  const r = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context, stream: true }),
    signal,
  })
  if (!r.ok) {
    const data = await readJson(r)
    throw new Error(data.error || `Tutor failed (${r.status})`)
  }
  if (!r.body) {
    const data = await readJson(r)
    const text = data.text || data.message || ''
    if (text) onDelta?.(text)
    return text
  }
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() || ''
    for (const chunk of chunks) {
      const line = chunk.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const data = JSON.parse(payload)
        const delta = data.delta || data.text || ''
        if (delta) {
          full += delta
          onDelta?.(delta, full)
        }
        if (data.error) throw new Error(data.error)
      } catch (err) {
        if (err instanceof SyntaxError) continue
        throw err
      }
    }
  }
  return full
}

function normalizeAssignmentGrade(data, item) {
  const max = item.points
  const rubric = item.rubric || []
  let scores = Array.isArray(data.scores) ? data.scores : []
  if (rubric.length && scores.length !== rubric.length) {
    scores = rubric.map((r, i) => {
      const hit = scores[i] || scores.find((s) => s.criterion === r.criterion) || {}
      return {
        criterion: r.criterion,
        points: clampNum(hit.points, 0, r.points),
        max: r.points,
        comment: String(hit.comment || ''),
      }
    })
  }
  let total = scores.length ? scores.reduce((a, s) => a + Number(s.points || 0), 0) : Number(data.total)
  if (Number.isNaN(total)) total = 0
  total = Math.max(0, Math.min(max, Math.round(total)))
  return {
    total,
    max,
    letter: data.letter || null,
    feedback: String(data.feedback || ''),
    scores,
    questions: Array.isArray(data.questions) ? data.questions.map(String).filter(Boolean).slice(0, 5) : [],
  }
}

function clampNum(n, lo, hi) {
  const v = Number(n)
  if (Number.isNaN(v)) return lo
  return Math.max(lo, Math.min(hi, v))
}

async function readJson(r) {
  const text = await r.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 200) }
  }
}

export { GRADE_TIMEOUT_MS }
