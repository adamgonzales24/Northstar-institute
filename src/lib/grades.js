import { PROGRAM } from '../data/program.js'
import { categoryWeights } from '../data/expand.js'

export function letterClass(letter) {
  if (!letter) return ''
  return 'lg-' + letter.replace('+', 'p').replace('-', 'm')
}

export function letterFor(percent) {
  if (percent == null || Number.isNaN(percent)) return null
  for (const row of PROGRAM.letterScale) {
    if (percent >= row.min) return row
  }
  return PROGRAM.letterScale[PROGRAM.letterScale.length - 1]
}

export function gpaPoints(letter) {
  const row = PROGRAM.letterScale.find((r) => r.letter === letter)
  return row ? row.gpa : 0
}

export function scoreItem(item, submission) {
  if (!submission) return null
  if (submission.quizScore != null) return submission.quizScore
  if (submission.aiScore != null) return submission.aiScore
  if (submission.selfScore != null) return submission.selfScore
  return null
}

export function courseGrade(course, enrollment) {
  if (!enrollment) return { percent: null, letter: null, gpa: null, breakdown: {} }
  const weights = categoryWeights(course)
  const byCat = {}
  for (const item of course.gradedItems || []) {
    const cat = item.category || 'assignments'
    if (!byCat[cat]) byCat[cat] = { earned: 0, possible: 0, attempted: 0 }
    const sub = enrollment.submissions?.[item.id]
    const s = scoreItem(item, sub)
    if (item.type === 'participation') {
      const weeks = course.weeks?.length || 15
      const done = Object.values(enrollment.moduleComplete || {}).filter(Boolean).length
      byCat[cat].possible += item.points
      byCat[cat].earned += Math.round((done / weeks) * item.points)
      if (done) byCat[cat].attempted += 1
    } else if (s != null) {
      byCat[cat].possible += item.points
      byCat[cat].earned += s
      byCat[cat].attempted += 1
    }
  }
  const hasRealWork = Object.entries(byCat).some(([k, v]) => k !== 'participation' && v.attempted)
  if (!hasRealWork) return { percent: null, letter: null, gpa: null, breakdown: {} }
  let acc = 0
  let weightPresent = 0
  const breakdown = {}
  for (const [cat, w] of Object.entries(weights)) {
    const row = byCat[cat]
    if (!row || !row.possible || !row.attempted) continue
    const pct = row.earned / row.possible
    breakdown[cat] = { ...row, percent: Math.round(pct * 100), weight: w }
    acc += pct * w
    weightPresent += w
  }
  if (!weightPresent) return { percent: null, letter: null, gpa: null, breakdown }
  const percent = Math.round((acc / weightPresent) * 1000) / 10
  const row = letterFor(percent)
  return { percent, letter: row.letter, gpa: row.gpa, breakdown }
}

export function cumulativeGPA(enrollments, coursesById) {
  let points = 0
  let credits = 0
  for (const [id, en] of Object.entries(enrollments || {})) {
    if (en.status !== 'completed' && en.status !== 'in-progress') continue
    const course = coursesById[id]
    if (!course) continue
    const g = courseGrade(course, en)
    if (g.percent == null) continue
    if (en.status === 'in-progress' && g.percent === 0) continue
    const use = en.status === 'completed' || (en.status === 'in-progress' && hasAnyScore(en))
    if (!use) continue
    if (en.status !== 'completed') continue
    points += g.gpa * course.credits
    credits += course.credits
  }
  return {
    gpa: credits ? Math.round((points / credits) * 100) / 100 : null,
    creditsCompleted: credits,
  }
}

function hasAnyScore(en) {
  return Object.values(en.submissions || {}).some(
    (s) => s && (s.quizScore != null || s.aiScore != null || s.selfScore != null || s.completed)
  )
}

export function runningCompletedCredits(enrollments, coursesById) {
  let n = 0
  for (const [id, en] of Object.entries(enrollments || {})) {
    if (en.status === 'completed' || en.status === 'waived') {
      const c = coursesById[id]
      if (c && c.id !== 'MATH099') n += c.credits
    }
  }
  return n
}

export function quizGrade(quiz, answers) {
  let earned = 0
  let possible = 0
  const details = []
  quiz.questions.forEach((q, i) => {
    possible += q.points
    const a = answers[i]
    let ok = false
    if (q.type === 'mc') ok = Number(a) === Number(q.answer)
    else {
      const t = String(a || '').trim().toLowerCase()
      const key = String(q.answer || '').trim().toLowerCase()
      if (!t) ok = false
      else if (key.includes(t) || t.includes(key.slice(0, Math.min(40, key.length)))) ok = true
      else {
        const keys = key.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        ok = keys.some((k) => t.includes(k.slice(0, 24)))
      }
    }
    if (ok) earned += q.points
    details.push({ index: i, ok, earned: ok ? q.points : 0 })
  })
  return { earned, possible, percent: possible ? Math.round((earned / possible) * 100) : 0, details }
}
