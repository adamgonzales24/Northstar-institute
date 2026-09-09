export function newNoteId(prefix = 'p') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function emptyNotebook() {
  return { pages: [], readings: [] }
}

export function normalizeNotebook(raw) {
  if (!raw) return emptyNotebook()
  if (typeof raw === 'string') {
    return {
      pages: raw
        ? [{ id: 'journal', title: 'Course journal', body: raw, updatedAt: null }]
        : [],
      readings: [],
    }
  }
  return {
    pages: Array.isArray(raw.pages) ? raw.pages : [],
    readings: Array.isArray(raw.readings) ? raw.readings : [],
  }
}

export function weekPageId(week) {
  return `week-${Number(week)}`
}

export function pageTitleForWeek(week, weekTitle) {
  return weekTitle ? `Week ${week}: ${weekTitle}` : `Week ${week}`
}

export function upsertPage(notebook, pageId, patch) {
  const nb = normalizeNotebook(notebook)
  const pages = nb.pages.slice()
  const i = pages.findIndex((p) => p.id === pageId)
  const next = {
    id: pageId,
    title: patch.title || pageId,
    body: '',
    ...(i >= 0 ? pages[i] : {}),
    ...patch,
    id: pageId,
    updatedAt: new Date().toISOString(),
  }
  if (i >= 0) pages[i] = next
  else pages.push(next)
  return { ...nb, pages }
}

export function notebookPagesForCourse(course, notebook) {
  const nb = normalizeNotebook(notebook)
  const byId = Object.fromEntries(nb.pages.map((p) => [p.id, p]))
  const list = []
  list.push(byId.journal || { id: 'journal', title: 'Course journal', body: '', stub: true })
  for (const w of course.weeks || []) {
    const id = weekPageId(w.week)
    list.push(byId[id] || { id, title: pageTitleForWeek(w.week, w.title), week: w.week, body: '', stub: true })
  }
  for (const p of nb.pages) {
    if (p.id === 'journal' || /^week-\d+$/.test(p.id)) continue
    list.push(p)
  }
  return list
}

export function moduleLink(courseId, week, title) {
  const label = title ? `Week ${week}: ${title}` : `Week ${week}`
  return `[${label}](/courses/${courseId}/modules/${week})`
}

export function workLink(courseId, item) {
  return `[${item.title}](/courses/${courseId}/work/${item.id})`
}

export function readingFileLink(courseId, reading, extra = '') {
  const hash = extra ? extra : ''
  return `[${reading.title}](/courses/${courseId}/readings/${reading.id}${hash})`
}
