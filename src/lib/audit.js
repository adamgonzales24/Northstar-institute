import { PROGRAM, REQUIRED_BY_BUCKET, ELECTIVE_CHOICES } from '../data/program.js'

export function degreeAudit(state, coursesById) {
  const csOnly = state.profile?.csOnlyMode
  const skipped = new Set(state.skippedGenEd || [])
  const electivesChosen = state.electives?.length ? state.electives : ELECTIVE_CHOICES.slice(0, 4)

  const buckets = PROGRAM.buckets.map((b) => {
    let requiredIds = []
    if (b.id === 'elective') requiredIds = electivesChosen
    else if (b.id === 'math') {
      requiredIds = [...REQUIRED_BY_BUCKET.math]
      if (!state.profile?.skipPrecalc) requiredIds = ['MATH099', ...requiredIds]
    } else requiredIds = [...(REQUIRED_BY_BUCKET[b.id] || [])]

    if (csOnly && b.id === 'gened') {
      return {
        ...b,
        requiredIds,
        waived: true,
        earned: 0,
        remaining: 0,
        courses: requiredIds.map((id) => row(id, coursesById, state, true)),
      }
    }

    const courses = requiredIds.map((id) => row(id, coursesById, state, skipped.has(id)))
    const earned = courses.reduce((s, c) => s + (c.counts ? c.credits : 0), 0)
    const target = b.id === 'math' && !state.profile?.skipPrecalc ? b.credits : b.credits
    return {
      ...b,
      requiredIds,
      waived: false,
      earned,
      remaining: Math.max(0, target - earned),
      target,
      courses,
    }
  })

  const towardDegree = buckets
    .filter((b) => !b.waived)
    .reduce((s, b) => s + b.earned, 0)

  const math099 = row('MATH099', coursesById, state, false)

  return {
    towardDegree,
    target: csOnly ? PROGRAM.totalCreditsTarget - PROGRAM.genedCredits : PROGRAM.totalCreditsTarget,
    buckets,
    math099,
    csOnly,
    complete: towardDegree >= (csOnly ? PROGRAM.totalCreditsTarget - PROGRAM.genedCredits : PROGRAM.totalCreditsTarget) - 0.5,
  }
}

function row(id, coursesById, state, waived) {
  const c = coursesById[id]
  const en = state.enrollments?.[id]
  const status = waived ? 'waived' : en?.status || 'not-planned'
  const counts = status === 'completed' || status === 'waived'
  return {
    id,
    code: c?.code || id,
    title: c?.title || '',
    credits: id === 'MATH099' ? 0 : c?.credits || 0,
    rawCredits: c?.credits || 0,
    status,
    counts: counts && id !== 'MATH099',
  }
}
