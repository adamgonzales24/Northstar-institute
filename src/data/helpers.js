/** Compact constructors for curriculum seeds. */

export function w(week, title, topics, readings, lectures, lab, note, hours) {
  return {
    week,
    title,
    topics: Array.isArray(topics) ? topics : [topics],
    readings: (readings || []).map((r) =>
      typeof r === 'string' ? { title: r } : r
    ),
    lectures: (lectures || []).map((l) =>
      typeof l === 'string'
        ? { title: l }
        : { title: l.t || l.title, url: l.u || l.url, source: l.s || l.source, minutes: l.m || l.minutes }
    ),
    lab: lab || '',
    professorNote: note || '',
    hours: hours || null,
  }
}

export function mc(prompt, choices, answer, explanation, points = 2) {
  return { type: 'mc', prompt, choices, answer, explanation, points }
}

export function sa(prompt, answer, explanation, points = 3) {
  return { type: 'short', prompt, answer, explanation, points }
}

export function item(partial) {
  return {
    hours: 3,
    deliverable: 'text',
    rubric: defaultRubric(partial.points || 20),
    ...partial,
  }
}

export function defaultRubric(points) {
  const third = Math.round(points / 3)
  return [
    {
      criterion: 'Correctness / completeness',
      points: points - 2 * third,
      excellent: 'Meets the prompt; results are right or well-justified.',
      adequate: 'Mostly complete with small gaps or errors.',
      poor: 'Missing major pieces or fundamentally wrong.',
    },
    {
      criterion: 'Method / process',
      points: third,
      excellent: 'Shows the work: design notes, tests, citations, or proof structure.',
      adequate: 'Some process visible but thin.',
      poor: 'Answer only; no evidence of how you got there.',
    },
    {
      criterion: 'Communication & craft',
      points: third,
      excellent: 'Clear writing or readable code; honest about limits.',
      adequate: 'Understandable with effort.',
      poor: 'Unreadable, uncited, or careless.',
    },
  ]
}

export function gitChecklist() {
  return [
    'Initialize a git repo (or clone your Northstar workspace).',
    'Create a feature branch named after the assignment (e.g. `cs110-p1-cli`).',
    'Commit in small, grammatical units: what changed and why.',
    'Write a README with run instructions, assumptions, and known bugs.',
    'If tests exist, run them before you push. Paste the command and result in your submission notes.',
    'Open a pull request against `main` even if you are the only reviewer. Describe the change.',
    'Tag a release or add a `SUBMISSION.md` with the commit hash you want graded.',
    'Never commit secrets, `.env` files, or huge binaries. Use `.gitignore`.',
  ]
}

export function codeRubric(points) {
  return [
    {
      criterion: 'Correctness',
      points: Math.round(points * 0.4),
      excellent: 'Meets the spec; edge cases handled; tests pass.',
      adequate: 'Happy path works; some edge gaps.',
      poor: 'Does not run or misses the spec.',
    },
    {
      criterion: 'Design & data structures',
      points: Math.round(points * 0.25),
      excellent: 'Clear modules, honest abstractions, no gold-plating.',
      adequate: 'Works but tangled or copy-pasted.',
      poor: 'One giant function; unclear ownership of state.',
    },
    {
      criterion: 'Tests & evidence',
      points: Math.round(points * 0.2),
      excellent: 'Automated tests or a reproducible demo script.',
      adequate: 'Manual test notes only.',
      poor: 'No evidence it was tried.',
    },
    {
      criterion: 'Professional hygiene',
      points: Math.round(points * 0.15),
      excellent: 'README, git history, named commits, no secrets.',
      adequate: 'Repo exists but messy.',
      poor: 'Zip dump or unrunnable snapshot.',
    },
  ]
}

export function writingRubric(points) {
  return [
    {
      criterion: 'Claim & structure',
      points: Math.round(points * 0.3),
      excellent: 'Clear thesis; paragraphs do work; reader never lost.',
      adequate: 'Point exists but organization wobbles.',
      poor: 'No claim, or a tour of notes.',
    },
    {
      criterion: 'Evidence & citation',
      points: Math.round(points * 0.35),
      excellent: 'Sources used as evidence, cited, not wallpaper.',
      adequate: 'Some sources; citation sloppy or decorative.',
      poor: 'Unsupported assertion or uncredited paraphrase.',
    },
    {
      criterion: 'Style & revision',
      points: Math.round(points * 0.2),
      excellent: 'Sentences earn their keep; revised, not first-thought.',
      adequate: 'Readable with extra words.',
      poor: 'Draft-zero prose or AI paste with no voice.',
    },
    {
      criterion: 'Academic integrity',
      points: Math.round(points * 0.15),
      excellent: 'You can explain every sentence; tools disclosed.',
      adequate: 'Mostly yours; disclosure incomplete.',
      poor: 'You could not defend this as your thinking.',
    },
  ]
}

export const DEFAULT_INTEGRITY = `This is a self-directed program. Nobody is watching you except the future engineer you are becoming.

You may read documentation, textbooks, Stack Overflow, and lecture notes. You may discuss ideas with peers. You may use AI tools as a tutor (ask it to quiz you, explain an error, or review your outline).

You may not submit work you cannot explain. If an AI or a person wrote the core of a solution, it is not your work. Disclose any AI assistance in a short note on every submission: what you asked, what you kept, what you changed.

Copying a solution and "cleaning it up" is a zero. Looking at a solution after you have a failing attempt, then closing it and rewriting from understanding, is allowed if you say so.

This transcript is unofficial. Cheating here only cheats your portfolio and your interviews.`

export const DEFAULT_LATE = `There is no late penalty. This program is built around a full-time job and a long horizon.

Every item has a suggested due date so you have a target. If you finish early, the next week is already unlocked — this is self-paced, not gated.

If life happens, use the Life Happens control in Settings or Calendar to shift remaining suggested due dates by 1 or 2 weeks. Do not delete work from the calendar just because you are behind; reschedule it.

A course is not complete until its graded items are submitted and graded. Suggested dates never lock content.`
