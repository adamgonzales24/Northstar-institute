import { w, mc, sa, item, codeRubric, writingRubric } from '../helpers.js'

export function weeks(rows) {
  return rows.map((r) =>
    w(
      r.week,
      r.title,
      r.topics || [r.title],
      r.readings || [],
      r.lectures || [],
      r.lab || r.work || '',
      r.note || '',
      r.hours
    )
  )
}

export function stdQuizzes(spec) {
  return {
    q1: { title: 'Quiz 1', week: 4, timeLimitMin: 35, questions: spec.q1 },
    q2: { title: 'Quiz 2', week: 11, timeLimitMin: 35, questions: spec.q2 },
    mid: { title: 'Midterm', week: 8, timeLimitMin: 60, questions: spec.mid },
    final: { title: 'Final', week: 15, timeLimitMin: 70, questions: spec.final },
  }
}

export function stdItems(id, opts = {}) {
  const p = id.toLowerCase()
  const rub = opts.code ? codeRubric : opts.writing ? writingRubric : undefined
  const deliver = opts.code ? 'github' : 'text'
  return [
    item({
      id: `${p}-a1`,
      week: 3,
      type: 'assignment',
      title: opts.a1 || 'Assignment 1',
      points: 25,
      hours: opts.h || 5,
      deliverable: deliver,
      prompt: opts.p1,
      rubric: rub?.(25),
    }),
    item({
      id: `${p}-q1`,
      week: 4,
      type: 'quiz',
      title: 'Quiz 1',
      points: 25,
      hours: 1,
      deliverable: 'quiz',
      quizId: 'q1',
    }),
    item({
      id: `${p}-a2`,
      week: 6,
      type: 'assignment',
      title: opts.a2 || 'Assignment 2',
      points: 25,
      hours: opts.h || 5,
      deliverable: deliver,
      prompt: opts.p2,
      rubric: rub?.(25),
    }),
    item({
      id: `${p}-mid`,
      week: 8,
      type: 'midterm',
      title: opts.mid || 'Midterm',
      points: 40,
      hours: 2,
      deliverable: 'quiz',
      quizId: 'mid',
    }),
    item({
      id: `${p}-a3`,
      week: 10,
      type: 'assignment',
      title: opts.a3 || 'Assignment 3',
      points: 25,
      hours: opts.h || 5,
      deliverable: deliver,
      prompt: opts.p3,
      rubric: rub?.(25),
    }),
    item({
      id: `${p}-q2`,
      week: 11,
      type: 'quiz',
      title: 'Quiz 2',
      points: 25,
      hours: 1,
      deliverable: 'quiz',
      quizId: 'q2',
    }),
    item({
      id: `${p}-proj`,
      week: 13,
      type: 'project',
      title: opts.proj || 'Course project',
      points: 60,
      hours: opts.ph || 12,
      deliverable: opts.code ? 'github' : 'text',
      prompt: opts.pp,
      rubric: rub?.(60),
      githubStructure: opts.github,
    }),
    item({
      id: `${p}-fin`,
      week: 15,
      type: 'final',
      title: opts.fin || 'Final exam',
      points: 40,
      hours: 2,
      deliverable: 'quiz',
      quizId: 'final',
    }),
    item({
      id: `${p}-part`,
      week: 15,
      type: 'participation',
      title: 'Weekly module completion',
      points: 20,
      hours: 1,
      deliverable: 'checklist',
      prompt: 'Mark a week complete only if you did the lab, not if you watched the video.',
    }),
  ]
}

export const TERMS = ['fall', 'spring', 'summer', 'winter']

export function base(partial) {
  return {
    coreqs: [],
    termsOffered: TERMS,
    skippable: false,
    placementSkip: null,
    enrollWhenReady: false,
    heavy: false,
    gitWorkflow: false,
    officeHours: [
      'Stuck > 45 minutes: write what you tried, what you expected, what happened.',
      'Retrieval beats re-watching. Close the notes and reconstruct the week.',
      'I am not a live inbox. The rubric is the feedback.',
    ],
    ...partial,
  }
}

export { w, mc, sa, item, codeRubric, writingRubric }
