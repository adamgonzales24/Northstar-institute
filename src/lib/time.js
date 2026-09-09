export function startOfWeekMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

export function sessionMs(session, now = new Date()) {
  if (!session?.start) return 0
  const start = new Date(session.start).getTime()
  const end = session.end ? new Date(session.end).getTime() : now.getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return end - start
}

export function hoursLoggedThisWeek(sessions, clock, now = new Date()) {
  const start = startOfWeekMonday(now).getTime()
  let ms = 0
  for (const s of sessions || []) {
    if (new Date(s.start).getTime() >= start) ms += sessionMs(s, now)
  }
  if (clock?.start && new Date(clock.start).getTime() >= start) {
    ms += sessionMs({ start: clock.start, end: null }, now)
  }
  return Math.round((ms / 3600000) * 10) / 10
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function newSessionId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
