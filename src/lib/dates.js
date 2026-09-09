export function parseISO(s) {
  if (!s) return new Date()
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISO(date) {
  const d = date instanceof Date ? date : parseISO(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date, n) {
  const d = new Date(date instanceof Date ? date : parseISO(date))
  d.setDate(d.getDate() + n)
  return d
}

export function addWeeks(date, n) {
  return addDays(date, n * 7)
}

export function startOfWeek(date, weekStartsOn = 1) {
  const d = new Date(date instanceof Date ? date : parseISO(date))
  const day = d.getDay()
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeekSunday(date) {
  const d = new Date(date instanceof Date ? date : parseISO(date))
  const day = d.getDay()
  const add = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + add)
  d.setHours(23, 59, 0, 0)
  return d
}

export function sameDay(a, b) {
  return toISO(a) === toISO(b)
}

export function formatLong(date) {
  const d = date instanceof Date ? date : parseISO(date)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatShort(date) {
  const d = date instanceof Date ? date : parseISO(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMonthYear(date) {
  const d = date instanceof Date ? date : parseISO(date)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function daysUntil(date, from = new Date()) {
  const a = parseISO(toISO(from))
  const b = parseISO(toISO(date))
  return Math.round((b - a) / 86400000)
}

export function clampDate(d) {
  return parseISO(toISO(d))
}

export function monthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const weeks = []
  let cur = new Date(start)
  for (let w = 0; w < 6; w++) {
    const row = []
    for (let i = 0; i < 7; i++) {
      row.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}
