import { REQUIRED_BY_BUCKET, ELECTIVE_CHOICES } from '../data/program.js'

/**
 * Build a multi-year plan as a list of terms with course ids.
 * programmingStart: 'CS101' | 'CS110' | 'CS120'
 * skipPrecalc: boolean
 * electives: 4 ids
 * csOnly: skip gen-ed in the plan (still in catalog)
 */
export function buildPlan({
  pace = 'standard',
  skipPrecalc = true,
  programmingStart = 'CS110',
  electives = ELECTIVE_CHOICES.slice(0, 4),
  csOnly = false,
} = {}) {
  const gened = csOnly ? [] : [...REQUIRED_BY_BUCKET.gened]
  const math = [...REQUIRED_BY_BUCKET.math]
  if (!skipPrecalc) math.unshift('MATH099')
  const cs = [...REQUIRED_BY_BUCKET['cs-core']]
  if (programmingStart === 'CS120') {
    // CS110 remains in catalog; plan marks it waived later — keep CS101 + CS120
    const i = cs.indexOf('CS110')
    if (i >= 0) cs.splice(i, 1)
  }
  const se = [...REQUIRED_BY_BUCKET['se-core']]
  const cap = [...REQUIRED_BY_BUCKET.capstone]
  const elec = electives.slice(0, 4)

  // Ordered "priority queue" of courses respecting prereqs at a coarse grain.
  const sequence = []
  const take = (id) => {
    if (id && !sequence.includes(id)) sequence.push(id)
  }

  // Year-by-year pedagogical order, not just bucket dumps.
  take('WELL101')
  take('CS101')
  take('ENG101')
  if (!skipPrecalc) take('MATH099')
  if (programmingStart !== 'CS120') take('CS110')
  take('MATH181')
  take('ENG102')
  take('CS120')
  take('MATH210')
  take('COMM110')
  take('PSY110')
  take('CS215')
  take('MATH182')
  take('POLS110')
  take('CS220')
  take('MATH220')
  take('ENG210')
  take('CS230')
  take('PHYS111')
  take('SE210')
  take('MATH250')
  take('CS340')
  take('PHIL220')
  take('CS310')
  take('HUM150')
  take('CS320')
  take('SE310')
  take('STS200')
  take('CS330')
  take('SE320')
  take('CS350')
  take('SE330')
  take('CS360')
  take('CS370')
  elec.forEach(take)
  take('SE400')
  cap.forEach(take)

  gened.forEach(take)
  math.forEach(take)
  cs.forEach(take)
  se.forEach(take)

  const per = pace === 'slow' ? 1 : pace === 'accelerated' ? 3 : 2
  const terms = []
  let i = 0
  let termIndex = 0
  while (i < sequence.length) {
    const n = pace === 'slow' && termIndex % 4 === 0 ? 2 : per
    const ids = sequence.slice(i, i + n)
    terms.push({ termIndex, courseIds: ids })
    i += ids.length
    termIndex++
  }
  return { sequence, terms, coursesPerTerm: per, pace }
}

export function planYears(plan, calendar) {
  const years = []
  for (const t of plan.terms) {
    const cal = calendar[t.termIndex]
    if (!cal) continue
    const yLabel = `${cal.season} ${cal.name.split(' ')[1]}`
    const academic = academicYearLabel(cal)
    let y = years.find((x) => x.id === academic)
    if (!y) {
      y = { id: academic, label: academic, terms: [] }
      years.push(y)
    }
    y.terms.push({ ...t, calendar: cal, label: yLabel })
  }
  return years
}

function academicYearLabel(cal) {
  if (cal.season === 'Fall') return `Year starting Fall ${cal.name.split(' ')[1]}`
  return `AY ${cal.name}`
}
