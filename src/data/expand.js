import { DEFAULT_INTEGRITY, DEFAULT_LATE, defaultRubric, gitChecklist } from './helpers.js'
import { COURSE_COLORS } from './program.js'

const TYPE_LABEL = {
  assignment: 'Assignment',
  project: 'Project',
  quiz: 'Quiz',
  midterm: 'Midterm',
  final: 'Final',
  lab: 'Lab',
  participation: 'Participation',
  essay: 'Essay',
  discussion: 'Discussion',
}

export function expandCourse(seed) {
  const fallbackReadings = (seed.materials?.primaryFree || []).slice(0, 3).map((r) => ({
    title: r.title,
    url: r.url,
  }))
  const fallbackLectures = (seed.materials?.primaryFree || [])
    .filter((r) => r.kind === 'course' || r.kind === 'lectures' || r.kind === 'video')
    .slice(0, 2)
    .map((r) => ({ title: r.title, url: r.url, source: r.kind }))

  const weeks = (seed.weeks || []).map((week, i) => ({
    week: week.week || i + 1,
    title: week.title,
    topics: week.topics || [],
    readings: (week.readings && week.readings.length ? week.readings : fallbackReadings) || [],
    lectures: (week.lectures && week.lectures.length ? week.lectures : fallbackLectures) || [],
    lab: week.lab || '',
    professorNote:
      week.professorNote ||
      defaultProfessorNote(seed, week, i),
    hours: week.hours || seed.hoursPerWeek || 8,
    outcomes: week.outcomes || [`Work the week's material: ${week.title}.`],
  }))

  const termWeeks = seed.termWeeks || 15
  while (weeks.length < termWeeks) {
    const n = weeks.length + 1
    weeks.push({
      week: n,
      title: n === termWeeks ? 'Finals and portfolio wrap' : `Topics continued (${n})`,
      topics: ['Integration and review'],
      readings: [],
      lectures: [],
      lab: 'Review set',
      professorNote: 'Catch-up week. Retrieval practice over new content.',
      hours: seed.hoursPerWeek || 8,
      outcomes: ['Close gaps from earlier weeks.'],
    })
  }

  const graded = (seed.gradedItems || []).map((g, i) => ({
    id: g.id || `${seed.id.toLowerCase()}-g${i + 1}`,
    courseId: seed.id,
    week: g.week,
    type: g.type,
    title: g.title,
    points: g.points,
    hours: g.hours || 4,
    prompt: g.prompt || '',
    rubric: g.rubric || defaultRubric(g.points || 20),
    deliverable: g.deliverable || inferDeliverable(g.type),
    submissionNotes: g.submissionNotes || defaultSubmissionNotes(g),
    githubStructure: g.githubStructure || null,
    quizId: g.quizId || null,
    category: g.category || mapCategory(g.type),
  }))

  const quizzes = { ...(seed.quizzes || {}) }
  for (const g of graded) {
    if ((g.type === 'quiz' || g.type === 'midterm' || g.type === 'final') && g.quizId && !quizzes[g.quizId] && seed.quizzes?.[g.quizId]) {
      quizzes[g.quizId] = seed.quizzes[g.quizId]
    }
  }

  const byWeek = {}
  for (const g of graded) {
    if (!byWeek[g.week]) byWeek[g.week] = []
    byWeek[g.week].push(g.id)
  }

  return {
    ...seed,
    color: seed.color || COURSE_COLORS[seed.id] || '#4a8fd4',
    integrity: seed.integrity || DEFAULT_INTEGRITY,
    late: seed.late || DEFAULT_LATE,
    gitChecklist: seed.gitWorkflow ? gitChecklist() : null,
    weeks: weeks.map((wk) => ({
      ...wk,
      itemIds: byWeek[wk.week] || [],
    })),
    gradedItems: graded,
    quizzes,
    projects: seed.projects || [],
    officeHours: seed.officeHours || defaultOfficeHours(seed),
    studyQuestions: seed.studyQuestions || defaultStudyQuestions(seed, weeks),
    estimatedHours: Math.round((seed.hoursPerWeek || 8) * (seed.termWeeks || weeks.length || 15)),
    termWeeks,
  }
}

function inferDeliverable(type) {
  if (type === 'quiz' || type === 'midterm' || type === 'final') return 'quiz'
  if (type === 'project') return 'github'
  if (type === 'participation') return 'checklist'
  return 'text'
}

function mapCategory(type) {
  if (type === 'project') return 'projects'
  if (type === 'quiz') return 'quizzes'
  if (type === 'midterm') return 'midterm'
  if (type === 'final') return 'final'
  if (type === 'participation' || type === 'discussion') return 'participation'
  if (type === 'lab') return 'assignments'
  return 'assignments'
}

function defaultSubmissionNotes(g) {
  if (g.deliverable === 'github' || g.type === 'project') {
    return 'Paste the GitHub URL and commit hash, or upload a zip of the project. Confirm the README runs a stranger through build/test in under 10 minutes. On iPad, use Record git work with a comment if you cannot push from this device.'
  }
  if (g.type === 'quiz' || g.type === 'midterm' || g.type === 'final') {
    return 'Timed-feeling but untimed. Attempt once honestly, then reveal the key. Your first attempt is the grade unless you annotate a correction journal.'
  }
  return 'Paste your work, attach a file (PDF, Word, zip), or add a GitHub URL. The local tutor comments; you do not score yourself.'
}

function defaultProfessorNote(seed, week, i) {
  if (i === 0) {
    return `Welcome to ${seed.code}. This week is orientation plus first contact with the ideas. Skim the syllabus, set up your notes, and ship the first small artifact. Do not binge the whole course.`
  }
  if (i === 7) {
    return `Mid-course. If you are more than two weeks behind the suggested calendar, use Life Happens rather than rushing with shallow work.`
  }
  if (i === 14) {
    return `Close the loop: exam or project, then a short note to future-you about what is still shaky. That note is more valuable than a high score.`
  }
  return `What matters this week in ${seed.code}: ${week.title}. Common pitfall — consuming lectures without retrieval. Watch, close the tab, reconstruct the idea, then do the lab.`
}

function defaultOfficeHours(seed) {
  return [
    `${seed.code} is not a video playlist. The graded work is the course.`,
    'If you are stuck more than 45 minutes, write the question as if to a colleague: what you tried, what you expected, what happened.',
    'Office hours here are async notes and generated study questions. There is no live professor. Be the kind of student who would have shown up anyway.',
  ]
}

function defaultStudyQuestions(seed, weeks) {
  return weeks.slice(0, 8).map((wk) => {
    const topic = wk.topics?.[0] || wk.title
    return `Explain ${topic} as if to a new teammate who missed the week. Then give one example and one counterexample.`
  })
}

export function itemLabel(type) {
  return TYPE_LABEL[type] || type
}

export function categoryWeights(course) {
  return course.gradingWeights || {
    assignments: 30,
    projects: 30,
    quizzes: 15,
    midterm: 10,
    final: 10,
    participation: 5,
  }
}
