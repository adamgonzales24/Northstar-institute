import { PROGRAM } from '../data/activeProgram.js'
import { addDays, addWeeks, parseISO, toISO, endOfWeekSunday } from './dates.js'

export function buildCalendar(startISO, years = 8) {
  const start = parseISO(startISO || PROGRAM.defaultStart)
  const seq = PROGRAM.termModel.sequence
  const terms = []
  let cursor = new Date(start)
  let yearOffset = 0
  let i = 0
  const max = years * seq.length
  while (i < max) {
    const spec = seq[i % seq.length]
    if (i % seq.length === 0 && i > 0) yearOffset++
    const termStart = new Date(cursor)
    const termEnd = addDays(termStart, spec.weeks * 7 - 1)
    const academicYear = termStart.getFullYear()
    const id = `${spec.season.toLowerCase()}-${academicYear}-${toISO(termStart)}`
    terms.push({
      id,
      season: spec.season,
      name: `${spec.season} ${academicYear}`,
      weeks: spec.weeks,
      start: toISO(termStart),
      end: toISO(termEnd),
      index: i,
      intensive: spec.weeks < 15,
    })
    cursor = addDays(termEnd, spec.breakAfter * 7 + 1)
    i++
  }
  return terms
}

export function dueDateForWeek(term, weekNumber, contentWeeks = 15, shiftWeeks = 0) {
  const start = parseISO(term.start)
  const end = parseISO(term.end)
  const span = Math.max(1, (end - start) / 86400000)
  const frac = weekNumber / contentWeeks
  const raw = addDays(start, Math.round(frac * span) - 1)
  const shifted = addWeeks(raw, shiftWeeks)
  return toISO(endOfWeekSunday(shifted))
}

export function allDueDates(course, term, shiftWeeks = 0) {
  const map = {}
  for (const item of course.gradedItems || []) {
    map[item.id] = dueDateForWeek(term, item.week, 15, shiftWeeks)
  }
  for (const wk of course.weeks || []) {
    map[`module-${course.id}-${wk.week}`] = dueDateForWeek(term, wk.week, 15, shiftWeeks)
  }
  return map
}

export function remainingDueShift(itemDueISO, shiftWeeks, today = new Date()) {
  if (!shiftWeeks) return itemDueISO
  const due = parseISO(itemDueISO)
  if (due < today) return itemDueISO
  return toISO(addWeeks(due, shiftWeeks))
}

export function currentTerm(terms, date = new Date()) {
  const iso = toISO(date)
  return terms.find((t) => t.start <= iso && iso <= t.end) || terms[0]
}

export function hoursNeeded(courses) {
  return courses.reduce((s, c) => s + (c.hoursPerWeek || 8), 0)
}

export function loadWarning(courses) {
  const heavies = courses.filter((c) => c.heavy)
  if (heavies.length >= 2) {
    return {
      level: 'warn',
      text: `Reading-load warning: ${heavies.map((c) => c.code).join(' + ')} are both heavy. That pairing is a 16–22 hour week. If you work full time, swap one for a lighter course (WELL, COMM, a gen-ed) or use Life Happens before you drown.`,
    }
  }
  return null
}

export function termLengthNote(term) {
  if (!term?.intensive) return null
  return `${term.season} is an intensive ${term.weeks}-week term. Fifteen modules are packed into that window. Weekly hours go up. If your budget is ~11 hours, take one course, not two.`
}
