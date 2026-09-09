import { mc, sa } from './helpers.js'

export const PLACEMENT = {
  programming: {
    title: 'Programming comfort',
    blurb: 'Honest answers only. A low score means CS 101 + CS 110, which is the correct start for most working adults. A high score may let you begin at CS 120.',
    questions: [
      mc('What does a variable do in a program?', ['Prints to the screen', 'Names a piece of data so you can use it later', 'Compiles the program', 'Connects to the internet'], 1, 'A variable is a name bound to a value (or object).', 1),
      mc('A loop is for:', ['Running the same kind of work more than once', 'Declaring a class', 'Encrypting a file', 'Naming a repository'], 0, 'Iteration is the point.', 1),
      mc('Git is primarily:', ['A cloud IDE', 'A version control system for tracking changes to files', 'A programming language', 'An operating system'], 1, 'You can use git without GitHub.', 1),
      mc('If a program crashes, a useful first move is:', ['Reinstall the OS', 'Read the error message and the line it names', 'Delete random files', 'Rewrite it in another language'], 1, 'The traceback is a gift.', 1),
      mc('An array / list is best described as:', ['A named collection of elements in order', 'A database product', 'A type of virus', 'A compiler flag'], 0, 'Order and indexing matter.', 1),
      sa('In a few words, have you written a program longer than ~50 lines that you could still explain?', 'No wrong factual answer — the grader (you) should score 2 if yes and you could explain it, 1 if some exposure, 0 if never.', 'This is a comfort item. Be harsh if it was copy-paste.', 2),
      mc('Object-oriented programming is:', ['A way to bundle data with the operations that belong to it (among other things)', 'A database normal form', 'Only used in Python', 'The opposite of testing'], 0, 'If this sentence is Greek, start at CS 110 not CS 120.', 1),
      mc('Big-O notation is used to:', ['Name CSS classes', 'Talk about how work grows as input grows', 'Count git commits', 'Measure screen size'], 1, 'If you already think this way, you still take CS 215 — you do not skip it.', 1),
    ],
  },
  math: {
    title: 'Mathematics comfort',
    blurb: 'This places you into Precalculus (MATH 099) or Calculus I (MATH 181). It is not a math-major exam.',
    questions: [
      mc('Solve for x: 2x + 6 = 14', ['x = 4', 'x = 8', 'x = 10', 'x = 2'], 0, '2x = 8, x = 4.', 1),
      mc('The graph of y = x² is a:', ['straight line', 'parabola', 'circle', 'exponential'], 1, 'Quadratic.', 1),
      mc('log₁₀(1000) equals:', ['2', '3', '10', '100'], 1, '10³ = 1000.', 1),
      mc('The slope of a line through (0,1) and (2,5) is:', ['2', '4', '1/2', '3'], 0, '(5-1)/(2-0) = 2.', 1),
      mc('sin(30°) in exact form is:', ['1', '0', '1/2', '√3/2'], 2, 'Unit-circle fact. If you had to guess, you want MATH 099 or a careful Calc I.', 1),
      mc('A function f is one-to-one if:', ['every input has two outputs', 'different inputs give different outputs', 'it is a parabola', 'it is not continuous'], 1, 'Injective.', 1),
      sa('What is the derivative of x² (if you know calculus)? If you do not know, write "I do not know."', '2x  — or "I do not know" which scores 0 and is an honorable answer.', 'Honesty is the placement.', 2),
      mc('Fractions: 1/2 + 1/3 =', ['2/5', '5/6', '1/5', '3/5'], 1, 'Common denominator 6.', 1),
    ],
  },
}

export function scoreSection(section, answers) {
  const qs = section.questions
  let points = 0
  let possible = 0
  qs.forEach((q, i) => {
    possible += q.points
    const a = answers[i]
    if (a === undefined || a === null || a === '') return
    if (q.type === 'mc' && Number(a) === q.answer) points += q.points
    if (q.type === 'short') {
      const t = String(a).trim().toLowerCase()
      if (!t) return
      if (t.includes('do not know') || t.includes("don't know") || t === 'no' || t === 'n/a') {
        points += 0
      } else {
        points += q.points
      }
    }
  })
  return { points, possible, percent: possible ? Math.round((points / possible) * 100) : 0 }
}

export function placementAdvice(progPct, mathPct, hours) {
  const skipPrecalc = mathPct >= 70
  const startAt120 = progPct >= 82
  const startAt110 = progPct >= 35 && !startAt120
  let programmingStart = 'CS101'
  if (startAt120) programmingStart = 'CS120'
  else if (startAt110) programmingStart = 'CS110'

  const notes = []
  if (!skipPrecalc) {
    notes.push('MATH 099 is on your plan. Calculus is not a personality test; it is algebra plus limits. Six weeks of precalc now is cheaper than failing Calc I in October.')
  } else {
    notes.push('You may skip MATH 099 and enter Calculus I. If week 3 of Calc I feels like a foreign language, swallow pride and take the bridge.')
  }
  if (programmingStart === 'CS101') {
    notes.push('Start at CS 101. You will still reach Java and C. A shaky foundation is how people quit in month two.')
  } else if (programmingStart === 'CS110') {
    notes.push('Start Programming I (Python). CS 101 remains required — it is computing, not syntax — but you will not be bored by "what is a variable."')
  } else {
    notes.push('You may start Programming II (Java) after CS 101. CS 110 can be waived for credit-equivalent if you submit a Python portfolio (CLI + tests) in the first term. Waivers are earned, not vibes.')
  }
  if (hours < 8) {
    notes.push('Under 8 hours/week: use Slow pace (one course). Two courses will become a graveyard of half-watched lectures.')
  } else if (hours > 16) {
    notes.push('You have hours. Accelerated is possible. It is not morally better. Burnout drops more students than difficulty.')
  }
  return { skipPrecalc, programmingStart, notes, startAt120 }
}
