import { expandCourse } from './expand.js'
import { gened, math, csCore, se, electives, capstone } from './courses/index.js'
import { BOOTCAMP_COURSES } from './bootcamp.js'
import { IS_BOOTCAMP } from '../lib/config.js'

const INSTITUTE_SEEDS = [...gened, ...math, ...csCore, ...se, ...electives, ...capstone]

export const COURSE_SEEDS = IS_BOOTCAMP ? BOOTCAMP_COURSES : INSTITUTE_SEEDS

export const COURSES = COURSE_SEEDS.map(expandCourse)

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]))

export function getCourse(id) {
  return COURSE_BY_ID[id] || null
}

export function coursesInBucket(bucket) {
  return COURSES.filter((c) => c.bucket === bucket)
}

export function searchCourses(q) {
  const s = (q || '').trim().toLowerCase()
  if (!s) return COURSES
  return COURSES.filter((c) =>
    `${c.code} ${c.title} ${c.description} ${(c.portfolioTags || []).join(' ')}`
      .toLowerCase()
      .includes(s)
  )
}
