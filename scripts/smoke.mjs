import { emptyState, hydrateState } from '../src/lib/storage.js'
import { resolveWikiTarget } from '../src/lib/noteLinks.js'
import { normalizeNotebook, weekPageId } from '../src/lib/notes.js'
import { buildCalendar, dueDateForWeek, hoursNeeded, loadWarning } from '../src/lib/schedule.js'
import { quizGrade, letterFor, courseGrade, scoreItem } from '../src/lib/grades.js'
import { buildDueIcs } from '../src/lib/reminders.js'
import { buildPlan } from '../src/lib/plans.js'
import { degreeAudit } from '../src/lib/audit.js'
import { COURSE_BY_ID, COURSES } from '../src/data/catalog.js'
import { PROGRAM } from '../src/data/program.js'
import { placementAdvice, scoreSection, PLACEMENT } from '../src/data/placement.js'

if (COURSES.length !== 43) throw new Error('expected 43 courses, got ' + COURSES.length)
if (!COURSE_BY_ID.CS110.title.includes('Python')) throw new Error('CS110')
if (PROGRAM.defaultStart !== '2026-09-07') throw new Error('start date')

const cal = buildCalendar(PROGRAM.defaultStart, 8)
if (cal[0].season !== 'Fall' || cal[0].start !== '2026-09-07') throw new Error('fall ' + cal[0].start)
if (cal[1].season !== 'Winter' || cal[1].weeks !== 8) throw new Error('winter')
if (cal[2].season !== 'Spring' || cal[2].weeks !== 15) throw new Error('spring')
if (cal[3].season !== 'Summer' || cal[3].weeks !== 12) throw new Error('summer')

const due = dueDateForWeek(cal[0], 1, 15, 0)
if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error('due')

const plan = buildPlan({ pace: 'standard', skipPrecalc: true, programmingStart: 'CS110' })
if (!plan.terms[0].courseIds.includes('CS101')) throw new Error('plan start')
if (plan.sequence.includes('MATH099')) throw new Error('precalc should skip')

const q = COURSE_BY_ID.CS110.quizzes.q1
const g = quizGrade(q, { 0: q.questions[0].answer, 1: q.questions[1].answer })
if (g.earned < 2) throw new Error('quiz grade')
if (letterFor(93).letter !== 'A') throw new Error('letter')

const en = {
  status: 'in-progress',
  submissions: { [COURSE_BY_ID.CS110.gradedItems[0].id]: { completed: true, selfScore: 18 } },
  moduleComplete: { 1: true, 2: true },
}
const cg = courseGrade(COURSE_BY_ID.CS110, en)
if (cg.percent == null) throw new Error('course grade')
if (scoreItem(COURSE_BY_ID.CS110.gradedItems[0], { completed: true }) != null) throw new Error('unscored submit should not auto-full-credit')
if (scoreItem(COURSE_BY_ID.CS110.gradedItems[0], { completed: true, aiScore: 12 }) !== 12) throw new Error('ai score')
const ics = buildDueIcs([{ id: 'a1', courseId: 'CS110', code: 'CS 110', title: 'Hello', due: '2026-09-14', points: 10 }])
if (!ics.includes('BEGIN:VEVENT') || !ics.includes('DTSTART;VALUE=DATE:20260914')) throw new Error('ics')

const warn = loadWarning([COURSE_BY_ID.MATH182, COURSE_BY_ID.CS310])
if (!warn) throw new Error('heavy overlap warning')
if (hoursNeeded([COURSE_BY_ID.CS110, COURSE_BY_ID.ENG101]) < 10) throw new Error('hours')

const advice = placementAdvice(20, 40, 11)
if (advice.skipPrecalc) throw new Error('should not skip precalc')
if (advice.programmingStart === 'CS120') throw new Error('should not start at 120')

const scored = scoreSection(PLACEMENT.math, { 0: 0, 1: 1, 2: 1, 3: 0, 4: 2, 5: 1, 6: '2x', 7: 1 })
if (scored.possible < 8) throw new Error('placement possible')

const restored = hydrateState({
  onboarded: true,
  lastRoute: '/courses/CS110/modules/4',
  profile: { name: 'Ada' },
})
if (restored.profile.name !== 'Ada') throw new Error('hydrate name')
if (restored.lastRoute !== '/courses/CS110/modules/4') throw new Error('hydrate lastRoute')
if (restored.profile.hoursPerWeek !== 12) throw new Error('hydrate defaults')

const state = emptyState()
state.profile.skipPrecalc = true
state.enrollments.CS101 = { status: 'completed', submissions: {}, moduleComplete: {} }
const audit = degreeAudit(state, COURSE_BY_ID)
if (!audit.buckets.find((b) => b.id === 'cs-core')) throw new Error('audit buckets')

for (const c of COURSES) {
  if (c.weeks.length !== 15) throw new Error(c.id + ' weeks')
  if (c.gradedItems.length < 8) throw new Error(c.id + ' items')
}

const migrated = hydrateState({ notes: { courses: { CS101: 'old string note' } } })
if (normalizeNotebook(migrated.notes.courses.CS101).pages[0].body !== 'old string note') throw new Error('note migrate')
if (weekPageId(7) !== 'week-7') throw new Error('week page id')
if (resolveWikiTarget('week 7', 'CS101', COURSE_BY_ID) !== '/courses/CS101/modules/7') throw new Error('wiki week')
if (resolveWikiTarget('CS 110', 'CS101', COURSE_BY_ID) !== '/courses/CS110') throw new Error('wiki course')

console.log('smoke ok', COURSES.length, 'courses,', cal.length, 'terms, first due', due)
