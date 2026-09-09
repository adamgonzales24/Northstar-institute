import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { COURSES, COURSE_BY_ID } from '../data/catalog.js'
import { PROGRAM } from '../data/activeProgram.js'
import { IS_BOOTCAMP } from '../lib/config.js'
import { hoursLoggedThisWeek, newSessionId } from '../lib/time.js'
import { applyTheme } from '../lib/themes.js'
import { emptyState, loadState, saveState, exportBackup, parseBackupFile, baseEnrollment, seedDemoProgress, getDesktopMeta, hydrateState } from '../lib/storage.js'
import { normalizeNotebook, upsertPage } from '../lib/notes.js'
import { requestPersistentStorage } from '../lib/pwa.js'
import { allowUsbPush, fetchUsbMeta, loadUsbSyncConfig, pullUsbRecord, pushUsbRecord, recordLooksBlank } from '../lib/sync.js'
import { buildCalendar, dueDateForWeek, hoursNeeded, loadWarning, currentTerm } from '../lib/schedule.js'
import { courseGrade, cumulativeGPA, runningCompletedCredits, quizGrade, letterFor } from '../lib/grades.js'
import { buildPlan } from '../lib/plans.js'
import { degreeAudit } from '../lib/audit.js'
import { toISO, parseISO, daysUntil } from '../lib/dates.js'

const Ctx = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'PATCH':
      return { ...state, ...action.patch }
    case 'PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'ENROLL': {
      const enrollments = { ...state.enrollments }
      for (const id of action.ids) {
        enrollments[id] = {
          ...baseEnrollment(action.termId),
          ...(enrollments[id] || {}),
          enrolled: true,
          status: action.status || 'in-progress',
          termId: action.termId || enrollments[id]?.termId,
        }
      }
      return { ...state, enrollments }
    }
    case 'SET_ENROLLMENT':
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [action.id]: { ...baseEnrollment(), ...(state.enrollments[action.id] || {}), ...action.patch },
        },
      }
    case 'SUBMIT': {
      const en = state.enrollments[action.courseId] || baseEnrollment()
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [action.courseId]: {
            ...en,
            submissions: {
              ...(en.submissions || {}),
              [action.itemId]: { ...(en.submissions || {})[action.itemId], ...action.submission, submittedAt: new Date().toISOString() },
            },
          },
        },
      }
    }
    case 'QUIZ': {
      const en = state.enrollments[action.courseId] || baseEnrollment()
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [action.courseId]: {
            ...en,
            quizAttempts: { ...(en.quizAttempts || {}), [action.quizId]: action.attempt },
            submissions: {
              ...(en.submissions || {}),
              [action.itemId]: {
                completed: true,
                quizScore: action.attempt.earned,
                quizPossible: action.attempt.possible,
                selfScore: action.attempt.earned,
                submittedAt: new Date().toISOString(),
              },
            },
          },
        },
      }
    }
    case 'TOGGLE_MODULE': {
      const en = state.enrollments[action.courseId] || baseEnrollment()
      const moduleComplete = { ...(en.moduleComplete || {}) }
      moduleComplete[action.week] = !moduleComplete[action.week]
      const last = moduleComplete[action.week] ? Math.max(en.lastModule || 1, action.week + 1) : en.lastModule
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [action.courseId]: { ...en, moduleComplete, lastModule: last, status: 'in-progress' },
        },
        lastCourseId: action.courseId,
        lastModule: action.week,
      }
    }
    case 'COMPLETE_COURSE': {
      const en = state.enrollments[action.id] || baseEnrollment()
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [action.id]: { ...en, status: 'completed', completedAt: new Date().toISOString() },
        },
      }
    }
    case 'SET_PROFESSOR_CHAT': {
      const notes = state.notes || { global: '', courses: {}, professor: {} }
      const messages = (action.messages || []).slice(-40)
      return {
        ...state,
        notes: {
          ...notes,
          professor: { ...(notes.professor || {}), [action.scope]: messages },
        },
      }
    }
    case 'CLOCK_IN':
      return {
        ...state,
        clock: {
          start: new Date().toISOString(),
          courseId: action.courseId || state.lastCourseId,
          week: action.week || state.lastModule,
          kind: action.kind || 'clock',
        },
      }
    case 'CLOCK_OUT': {
      if (!state.clock?.start) return { ...state, clock: null }
      const session = {
        id: newSessionId(),
        start: state.clock.start,
        end: new Date().toISOString(),
        courseId: state.clock.courseId,
        week: state.clock.week,
        kind: state.clock.kind || 'clock',
      }
      return { ...state, clock: null, timeSessions: [...(state.timeSessions || []), session] }
    }
    case 'RESET':
      return { ...emptyState(), onboarded: false }
    case 'SET_NOTE_PAGE': {
      const current = normalizeNotebook(state.notes?.courses?.[action.courseId])
      return {
        ...state,
        notes: {
          ...state.notes,
          courses: {
            ...(state.notes.courses || {}),
            [action.courseId]: upsertPage(current, action.pageId, action.patch),
          },
        },
      }
    }
    case 'ADD_READING': {
      const current = normalizeNotebook(state.notes?.courses?.[action.courseId])
      const readings = [...current.readings.filter((r) => r.id !== action.reading.id), action.reading]
      return {
        ...state,
        notes: {
          ...state.notes,
          courses: {
            ...(state.notes.courses || {}),
            [action.courseId]: { ...current, readings },
          },
        },
      }
    }
    case 'REMOVE_READING': {
      const current = normalizeNotebook(state.notes?.courses?.[action.courseId])
      return {
        ...state,
        notes: {
          ...state.notes,
          courses: {
            ...(state.notes.courses || {}),
            [action.courseId]: { ...current, readings: current.readings.filter((r) => r.id !== action.id) },
          },
        },
      }
    }
    default:
      return state
  }
}

export function StudentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)
  const [usbSync, setUsbSync] = useState({ checking: !getDesktopMeta(), available: false, meta: null, offer: false, error: '' })

  useEffect(() => {
    saveState(state)
    pushUsbRecord(state)
  }, [state])

  useEffect(() => {
    requestPersistentStorage()
  }, [])

  useEffect(() => {
    applyTheme(state.profile?.theme || 'night')
  }, [state.profile?.theme])

  useEffect(() => {
    if (getDesktopMeta()) {
      setUsbSync((s) => ({ ...s, checking: false }))
      return
    }
    let cancelled = false
    ;(async () => {
      const cfg = await loadUsbSyncConfig()
      if (cancelled) return
      if (!cfg) {
        allowUsbPush()
        setUsbSync({ checking: false, available: false, meta: null, offer: false, error: '' })
        return
      }
      const meta = await fetchUsbMeta()
      if (cancelled) return
      const local = loadState()
      if (meta?.onboarded && recordLooksBlank(local)) {
        try {
          const remote = hydrateState(await pullUsbRecord())
          if (cancelled) return
          dispatch({ type: 'HYDRATE', state: remote })
          allowUsbPush()
          setUsbSync({ checking: false, available: true, meta, offer: false, error: '' })
          return
        } catch (err) {
          if (cancelled) return
          allowUsbPush()
          setUsbSync({ checking: false, available: true, meta, offer: true, error: err.message || 'Could not load USB record' })
          return
        }
      }
      const same =
        local.onboarded &&
        meta?.onboarded &&
        local.lastCourseId === meta.lastCourseId &&
        local.lastModule === meta.lastModule &&
        (local.profile?.name || '') === (meta.name || '')
      allowUsbPush()
      setUsbSync({
        checking: false,
        available: !!meta,
        meta,
        offer: !!(meta?.onboarded && local.onboarded && !same),
        error: '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const calendar = useMemo(
    () => buildCalendar(state.profile.startDate || PROGRAM.defaultStart, 8),
    [state.profile.startDate]
  )

  const plan = useMemo(
    () =>
      buildPlan({
        pace: state.profile.pace,
        skipPrecalc: state.profile.skipPrecalc,
        programmingStart: state.profile.programmingStart,
        electives: state.electives,
        csOnly: state.profile.csOnlyMode,
      }),
    [state.profile.pace, state.profile.skipPrecalc, state.profile.programmingStart, state.electives, state.profile.csOnlyMode]
  )

  const derived = useMemo(() => {
    const enrollList = Object.entries(state.enrollments || {})
      .map(([id, en]) => ({ id, ...en, course: COURSE_BY_ID[id] }))
      .filter((x) => x.course)

    const active = enrollList.filter((x) => x.status === 'in-progress' || x.status === 'enrolled')
    const completed = enrollList.filter((x) => x.status === 'completed')
    const now = currentTerm(calendar)
    const shift = state.lifeHappensWeeks || 0

    const todos = []
    for (const row of active) {
      const term = calendar.find((t) => t.id === row.termId) || now
      for (const item of row.course.gradedItems || []) {
        const sub = row.submissions?.[item.id]
        if (sub?.completed || sub?.quizScore != null || sub?.aiScore != null || sub?.selfScore != null) continue
        const due = dueDateForWeek(term, item.week, row.course.weeks?.length || 15, shift)
        todos.push({
          id: item.id,
          courseId: row.id,
          code: row.course.code,
          color: row.course.color,
          title: item.title,
          type: item.type,
          due,
          week: item.week,
          points: item.points,
        })
      }
    }
    todos.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))

    const gpa = cumulativeGPA(state.enrollments, COURSE_BY_ID)
    const credits = runningCompletedCredits(state.enrollments, COURSE_BY_ID)
    const audit = degreeAudit(state, COURSE_BY_ID)
    const plannedHours = hoursNeeded(active.map((a) => a.course))
    const hours = hoursLoggedThisWeek(state.timeSessions, state.clock)
    const warning = loadWarning(active.map((a) => a.course))

    return { enrollList, active, completed, now, todos, gpa, credits, audit, hours, plannedHours, warning, shift }
  }, [state, calendar])

  const api = {
    state,
    dispatch,
    calendar,
    plan,
    courses: COURSES,
    byId: COURSE_BY_ID,
    ...derived,
    saveLastRoute(path, courseId, week) {
      dispatch({
        type: 'PATCH',
        patch: {
          lastRoute: path,
          lastCourseId: courseId ?? state.lastCourseId,
          lastModule: week ?? state.lastModule,
        },
      })
    },
    finishOnboarding(profile, opts = {}) {
      const nextProfile = { ...state.profile, ...profile }
      const cal = buildCalendar(nextProfile.startDate, 8)
      const built = buildPlan({
        pace: nextProfile.pace,
        skipPrecalc: nextProfile.skipPrecalc,
        programmingStart: nextProfile.programmingStart,
        electives: opts.electives || state.electives,
        csOnly: nextProfile.csOnlyMode,
      })
      const first = IS_BOOTCAMP ? ['BOOT'] : built.terms[0]?.courseIds || []
      let enrollments = {}
      if (IS_BOOTCAMP) {
        enrollments.BOOT = { ...baseEnrollment(cal[0]?.id), status: 'in-progress' }
      } else {
        built.terms.forEach((t, idx) => {
          const term = cal[idx]
          const status = idx === 0 ? 'in-progress' : 'planned'
          for (const id of t.courseIds) {
            enrollments[id] = { ...baseEnrollment(term?.id), status }
          }
        })
        if (nextProfile.programmingStart === 'CS120') {
          enrollments.CS110 = { ...baseEnrollment(null), status: 'waived', enrolled: false }
        }
        if (nextProfile.skipPrecalc) {
          enrollments.MATH099 = { ...baseEnrollment(null), status: 'skipped', enrolled: false }
        }
      }
      let next = {
        ...state,
        onboarded: true,
        profile: nextProfile,
        enrollments,
        electives: opts.electives || state.electives,
        lastRoute: '/dashboard',
        lastCourseId: first[0] || null,
        lastModule: 1,
      }
      if (opts.seed !== false && !IS_BOOTCAMP) next = seedDemoProgress(next, cal, first)
      dispatch({ type: 'HYDRATE', state: next })
    },
    setProfile(patch) {
      dispatch({ type: 'PROFILE', patch })
    },
    clockIn(kind = 'clock') {
      dispatch({ type: 'CLOCK_IN', kind, courseId: state.lastCourseId, week: state.lastModule })
    },
    clockOut() {
      dispatch({ type: 'CLOCK_OUT' })
    },
    setChapterCheck(courseId, key, on) {
      const en = state.enrollments[courseId] || baseEnrollment()
      dispatch({
        type: 'SET_ENROLLMENT',
        id: courseId,
        patch: { chapterChecks: { ...(en.chapterChecks || {}), [key]: on } },
      })
    },
    setGitCheck(courseId, label, on) {
      const en = state.enrollments[courseId] || baseEnrollment()
      dispatch({
        type: 'SET_ENROLLMENT',
        id: courseId,
        patch: { gitChecks: { ...(en.gitChecks || {}), [label]: on } },
      })
    },
    addGitRecord(courseId, record) {
      const en = state.enrollments[courseId] || baseEnrollment()
      dispatch({
        type: 'SET_ENROLLMENT',
        id: courseId,
        patch: {
          gitRecords: [...(en.gitRecords || []), { ...record, at: new Date().toISOString() }],
        },
      })
    },
    toggleModule(courseId, week) {
      dispatch({ type: 'TOGGLE_MODULE', courseId, week })
    },
    submit(courseId, itemId, submission) {
      dispatch({ type: 'SUBMIT', courseId, itemId, submission })
    },
    professorChat(scope = 'global') {
      return state.notes?.professor?.[scope] || []
    },
    setProfessorChat(scope, messages) {
      dispatch({ type: 'SET_PROFESSOR_CHAT', scope, messages })
    },
    setRemindersEnabled(enabled) {
      dispatch({ type: 'PATCH', patch: { remindersEnabled: !!enabled } })
    },
    gradeQuiz(courseId, itemId, quizId, quiz, answers) {
      const result = quizGrade(quiz, answers)
      dispatch({
        type: 'QUIZ',
        courseId,
        itemId,
        quizId,
        attempt: { ...result, answers, at: new Date().toISOString(), revealed: false },
      })
      return result
    },
    revealQuiz(courseId, quizId) {
      const en = state.enrollments[courseId]
      const attempt = { ...(en?.quizAttempts?.[quizId] || {}), revealed: true }
      dispatch({
        type: 'SET_ENROLLMENT',
        id: courseId,
        patch: { quizAttempts: { ...(en?.quizAttempts || {}), [quizId]: attempt } },
      })
    },
    completeCourse(id) {
      dispatch({ type: 'COMPLETE_COURSE', id })
    },
    enroll(ids, termId, status) {
      dispatch({ type: 'ENROLL', ids, termId, status })
    },
    lifeHappens(weeks) {
      dispatch({ type: 'PATCH', patch: { lifeHappensWeeks: (state.lifeHappensWeeks || 0) + weeks } })
    },
    setNotes(scope, value, courseId) {
      if (scope === 'global') dispatch({ type: 'PATCH', patch: { notes: { ...state.notes, global: value } } })
      else {
        dispatch({ type: 'SET_NOTE_PAGE', courseId, pageId: 'journal', patch: { title: 'Course journal', body: value } })
      }
    },
    courseNotebook(courseId) {
      return normalizeNotebook(state.notes?.courses?.[courseId])
    },
    setNotePage(courseId, pageId, patch) {
      dispatch({ type: 'SET_NOTE_PAGE', courseId, pageId, patch })
    },
    addReading(courseId, reading) {
      dispatch({ type: 'ADD_READING', courseId, reading })
    },
    removeReading(courseId, id) {
      dispatch({ type: 'REMOVE_READING', courseId, id })
    },
    exportBackup() {
      exportBackup(state)
    },
    async importBackup(file) {
      const next = await parseBackupFile(file)
      dispatch({ type: 'HYDRATE', state: next })
    },
    usbSync,
    async pullUsb() {
      const remote = hydrateState(await pullUsbRecord())
      dispatch({ type: 'HYDRATE', state: remote })
      setUsbSync((s) => ({ ...s, offer: false, error: '', meta: { ...s.meta, name: remote.profile?.name, lastCourseId: remote.lastCourseId, lastModule: remote.lastModule } }))
      return remote
    },
    desktop: getDesktopMeta(),
    openDataFolder() {
      return window.northstarDesktop?.openDataFolder?.()
    },
    reset() {
      dispatch({ type: 'RESET' })
    },
    startFresh() {
      const profile = state.profile
      dispatch({ type: 'HYDRATE', state: { ...emptyState(), onboarded: false, profile: { ...emptyState().profile, ...profile, name: profile.name } } })
    },
    markCourseCompleteIfReady(id) {
      const course = COURSE_BY_ID[id]
      const en = state.enrollments[id]
      if (!course || !en) return false
      const g = courseGrade(course, en)
      const weeks = course.weeks.length
      const done = Object.values(en.moduleComplete || {}).filter(Boolean).length
      if (g.percent != null && g.percent >= PROGRAM.passingPercent && done >= weeks - 1) {
        dispatch({ type: 'COMPLETE_COURSE', id })
        return true
      }
      return false
    },
    courseGrade: (id) => courseGrade(COURSE_BY_ID[id], state.enrollments[id]),
    letterFor,
    dueFor(courseId, week) {
      const en = state.enrollments[courseId]
      const term = calendar.find((t) => t.id === en?.termId) || derived.now
      const weeks = COURSE_BY_ID[courseId]?.weeks?.length || 15
      return dueDateForWeek(term, week, weeks, state.lifeHappensWeeks || 0)
    },
    continuePath() {
      if (state.lastCourseId && state.lastModule) {
        return `/courses/${state.lastCourseId}/modules/${state.lastModule}`
      }
      if (state.lastCourseId) return `/courses/${state.lastCourseId}`
      return '/courses'
    },
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStudent() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStudent outside provider')
  return v
}

export function useRemember(path, courseId, week) {
  const { saveLastRoute } = useStudent()
  useEffect(() => {
    saveLastRoute(path, courseId, week)
  }, [path, courseId, week]) // eslint-disable-line
}

export { toISO, parseISO, daysUntil }
