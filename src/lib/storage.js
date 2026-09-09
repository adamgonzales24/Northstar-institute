import { STORAGE_KEY } from './config.js'

const KEY = STORAGE_KEY

export function emptyState() {
  return {
    version: 2,
    onboarded: false,
    profile: {
      name: '',
      hoursPerWeek: 12,
      startDate: '2026-09-07',
      pace: 'standard',
      coursesPerTerm: 2,
      csOnlyMode: false,
      skipPrecalc: true,
      programmingStart: 'CS110',
      placement: { programming: null, math: null, hours: 11 },
      theme: 'night',
      gradingMode: 'complete',
      aiModel: '',
      studioChoice: 'app',
    },
    enrollments: {},
    electives: ['CS410', 'CS420', 'CS430', 'CS450'],
    skippedGenEd: [],
    lastRoute: '/dashboard',
    lastCourseId: null,
    lastModule: null,
    notes: { global: '', courses: {}, professor: {} },
    lifeHappensWeeks: 0,
    announcementsRead: [],
    search: '',
    remindersEnabled: false,
    timeSessions: [],
    clock: null,
  }
}

export function hydrateState(data) {
  if (!data || typeof data !== 'object') throw new Error('Not a JSON object')
  return migrate({ ...emptyState(), ...data, profile: { ...emptyState().profile, ...(data.profile || {}) } })
}

function desktopApi() {
  if (typeof window === 'undefined') return null
  return window.northstarDesktop || null
}

export function getDesktopMeta() {
  const api = desktopApi()
  if (!api) return null
  return {
    isDesktop: true,
    dataPath: api.dataPath(),
    portable: !!api.isPortable(),
  }
}

export function loadState() {
  try {
    const api = desktopApi()
    if (api?.loadState) {
      const fromDisk = api.loadState()
      if (fromDisk && typeof fromDisk === 'object') {
        const hydrated = hydrateState(fromDisk)
        try {
          localStorage.setItem(KEY, JSON.stringify(hydrated))
        } catch {
          /* ignore quota */
        }
        return hydrated
      }
    }
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    return hydrateState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Northstar: persist failed', err)
  }
  try {
    desktopApi()?.saveState?.(state)
  } catch (err) {
    console.warn('Northstar: desktop persist failed', err)
  }
}

export async function exportBackup(state) {
  const name = `northstar-backup-${new Date().toISOString().slice(0, 10)}.json`
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })

  if (typeof navigator.share === 'function') {
    try {
      const payload = { files: [file], title: 'Northstar backup', text: name }
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload)
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseBackupFile(file) {
  return file.text().then((t) => hydrateState(JSON.parse(t)))
}

function migrate(state) {
  if (!state.version) state.version = 1
  if (state.version < 2) state.version = 2
  if (!state.enrollments) state.enrollments = {}
  if (!state.notes) state.notes = { global: '', courses: {}, professor: {} }
  if (!state.timeSessions) state.timeSessions = []
  if (!state.profile.theme) state.profile.theme = 'night'
  if (!state.profile.gradingMode) state.profile.gradingMode = 'complete'
  if (state.profile.aiModel == null) state.profile.aiModel = ''
  if (!state.profile.studioChoice) state.profile.studioChoice = 'app'
  const courses = {}
  for (const [id, val] of Object.entries(state.notes.courses || {})) {
    if (typeof val === 'string') {
      courses[id] = {
        pages: val ? [{ id: 'journal', title: 'Course journal', body: val }] : [],
        readings: [],
      }
    } else if (val && typeof val === 'object') {
      courses[id] = {
        pages: Array.isArray(val.pages) ? val.pages : [],
        readings: Array.isArray(val.readings) ? val.readings : [],
      }
    }
  }
  state.notes = { ...state.notes, courses }
  for (const en of Object.values(state.enrollments || {})) {
    if (!en.chapterChecks) en.chapterChecks = {}
    if (!en.gitChecks) en.gitChecks = {}
    if (!en.gitRecords) en.gitRecords = []
  }
  return state
}

export function seedDemoProgress(state, calendar, firstCourseIds) {
  const next = structuredClone(state)
  const term = calendar[0]
  for (const id of firstCourseIds) {
    if (!next.enrollments[id]) {
      next.enrollments[id] = baseEnrollment(term?.id)
    }
    next.enrollments[id].status = 'in-progress'
    next.enrollments[id].moduleComplete = { 1: true, 2: true }
    next.enrollments[id].lastModule = 3
  }
  if (next.enrollments.WELL101) {
    next.enrollments.WELL101.moduleComplete = { 1: true, 2: true, 3: true, 4: true }
  }
  if (next.enrollments.CS101) {
    next.enrollments.CS101.submissions = {
      ...(next.enrollments.CS101.submissions || {}),
    }
  }
  next.lastCourseId = firstCourseIds[0] || 'CS101'
  next.lastModule = 3
  next.lastRoute = '/dashboard'
  return next
}

export function baseEnrollment(termId) {
  return {
    enrolled: true,
    termId: termId || null,
    status: 'in-progress',
    moduleComplete: {},
    lastModule: 1,
    submissions: {},
    quizAttempts: {},
    notes: '',
    chapterChecks: {},
    gitChecks: {},
    gitRecords: [],
  }
}
