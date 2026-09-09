import { daysUntil, toISO } from './dates.js'

const NOTIFIED_KEY = 'northstar-due-notified'

export function buildDueIcs(todos, studentName = 'Student') {
  const stamp = icsStamp(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Northstar Institute//Due dates//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Northstar due dates (${esc(studentName)})`,
  ]
  for (const t of todos || []) {
    if (!t.due) continue
    const day = String(t.due).replace(/-/g, '')
    const uid = `northstar-${t.courseId}-${t.id}@northstar.local`
    const summary = `${t.code} — ${t.title}`
    const desc = `${t.code} ${t.title} (${t.points || 0} pts). Open /courses/${t.courseId}/work/${t.id}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay(day)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(desc)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(summary)} is due tomorrow`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(summary)} is due today`,
      'TRIGGER:PT8H',
      'END:VALARM',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadDueIcs(todos, studentName) {
  const body = buildDueIcs(todos, studentName)
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'northstar-due-dates.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function enableDueReminders() {
  if (typeof Notification === 'undefined') {
    return { ok: false, error: 'This browser does not support notifications.' }
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'Notification permission was not granted.' }
  return { ok: true }
}

export function scanDueTodos(todos, today = new Date()) {
  const overdue = []
  const dueToday = []
  const dueTomorrow = []
  for (const t of todos || []) {
    const n = daysUntil(t.due, today)
    if (n < 0) overdue.push(t)
    else if (n === 0) dueToday.push(t)
    else if (n === 1) dueTomorrow.push(t)
  }
  return { overdue, dueToday, dueTomorrow }
}

export function notifyDueTodos(todos, today = new Date()) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return { sent: 0 }
  }
  const { overdue, dueToday, dueTomorrow } = scanDueTodos(todos, today)
  const day = toISO(today)
  const seen = loadNotified()
  const already = new Set(seen[day] || [])
  let sent = 0

  function ping(id, title, body) {
    if (already.has(id)) return
    try {
      new Notification(title, { body, tag: id })
      already.add(id)
      sent += 1
    } catch {
      /* iOS Safari may ignore until installed to Home Screen */
    }
  }

  if (overdue.length) {
    ping(
      'overdue',
      `${overdue.length} Northstar item${overdue.length === 1 ? '' : 's'} overdue`,
      overdue
        .slice(0, 3)
        .map((t) => `${t.code}: ${t.title}`)
        .join(' · ')
    )
  }
  if (dueToday.length) {
    ping(
      'today',
      `${dueToday.length} due today`,
      dueToday
        .slice(0, 3)
        .map((t) => `${t.code}: ${t.title}`)
        .join(' · ')
    )
  }
  if (dueTomorrow.length) {
    ping(
      'tomorrow',
      `${dueTomorrow.length} due tomorrow`,
      dueTomorrow
        .slice(0, 3)
        .map((t) => `${t.code}: ${t.title}`)
        .join(' · ')
    )
  }
  seen[day] = [...already]
  saveNotified(seen)
  return { sent, overdue: overdue.length, dueToday: dueToday.length, dueTomorrow: dueTomorrow.length }
}

function loadNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveNotified(map) {
  const keys = Object.keys(map).sort()
  const trimmed = {}
  for (const k of keys.slice(-14)) trimmed[k] = map[k]
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}

function icsStamp(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function nextDay(yyyymmdd) {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6))
  const d = Number(yyyymmdd.slice(6, 8))
  const dt = new Date(y, m - 1, d + 1)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
}

function esc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}
