const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g
const WIKI = /\[\[([^\]]+)\]\]/g
const BARE_URL = /https?:\/\/[^\s<>[\]()]+/g

export function resolveWikiTarget(raw, courseId, byId) {
  const t = String(raw || '').trim()
  if (!t) return null
  const weekOnly = /^(?:week|w|module)\s*(\d{1,2})$/i.exec(t)
  if (weekOnly) return `/courses/${courseId}/modules/${Number(weekOnly[1])}`
  const courseWeek = /^([A-Za-z]{2,6}\s*\d{2,4})\s+(?:week|w|module)\s*(\d{1,2})$/i.exec(t)
  if (courseWeek) {
    const id = findCourseId(courseWeek[1], byId)
    if (id) return `/courses/${id}/modules/${Number(courseWeek[2])}`
  }
  const id = findCourseId(t, byId)
  if (id) return `/courses/${id}`
  if (t.startsWith('/')) return t
  return null
}

function findCourseId(label, byId) {
  const compact = label.replace(/\s+/g, '').toUpperCase()
  if (byId[label]) return label
  if (byId[compact]) return compact
  for (const [id, c] of Object.entries(byId || {})) {
    if (id.toUpperCase() === compact) return id
    if ((c.code || '').replace(/\s+/g, '').toUpperCase() === compact) return id
  }
  return null
}

export function noteTokens(text) {
  const src = text || ''
  const hits = []
  let m
  MD_LINK.lastIndex = 0
  while ((m = MD_LINK.exec(src))) hits.push({ type: 'md', start: m.index, end: m.index + m[0].length, label: m[1], href: m[2] })
  WIKI.lastIndex = 0
  while ((m = WIKI.exec(src))) hits.push({ type: 'wiki', start: m.index, end: m.index + m[0].length, label: m[1] })
  BARE_URL.lastIndex = 0
  while ((m = BARE_URL.exec(src))) {
    const overlapping = hits.some((h) => m.index >= h.start && m.index < h.end)
    if (!overlapping) hits.push({ type: 'url', start: m.index, end: m.index + m[0].length, href: m[0] })
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  const kept = []
  let cursor = 0
  for (const h of hits) {
    if (h.start < cursor) continue
    kept.push(h)
    cursor = h.end
  }
  return kept
}

export function isInternalPath(href) {
  return typeof href === 'string' && href.startsWith('/')
}

export function isHttp(href) {
  return typeof href === 'string' && /^https?:\/\//i.test(href)
}
