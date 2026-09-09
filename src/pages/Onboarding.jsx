import { useMemo, useState } from 'react'
import { PROGRAM, PACE_OPTIONS } from '../data/activeProgram.js'
import { IS_BOOTCAMP } from '../lib/config.js'
import { PLACEMENT, scoreSection, placementAdvice } from '../data/placement.js'
import { useStudent } from '../context/StudentContext.jsx'

export default function Onboarding() {
  const { finishOnboarding } = useStudent()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [hours, setHours] = useState(PROGRAM.defaultHours)
  const [startDate, setStartDate] = useState(PROGRAM.defaultStart)
  const [pace, setPace] = useState('standard')
  const [csOnly, setCsOnly] = useState(false)
  const [progAns, setProgAns] = useState({})
  const [mathAns, setMathAns] = useState({})
  const [seed, setSeed] = useState(true)

  const prog = useMemo(() => scoreSection(PLACEMENT.programming, progAns), [progAns])
  const math = useMemo(() => scoreSection(PLACEMENT.math, mathAns), [mathAns])
  const advice = useMemo(() => placementAdvice(prog.percent, math.percent, hours), [prog, math, hours])

  const steps = IS_BOOTCAMP ? 2 : 5

  function submitBootcamp() {
    finishOnboarding(
      {
        name: name.trim() || 'Student',
        hoursPerWeek: Number(hours),
        startDate,
        pace: 'standard',
        coursesPerTerm: 1,
        studioChoice: 'app',
        gradingMode: 'complete',
      },
      { seed: false }
    )
  }

  function submitFinal() {
    if (IS_BOOTCAMP) {
      submitBootcamp()
      return
    }
    const programmingStart =
      advice.programmingStart === 'CS120' ? 'CS120' : 'CS110'
    finishOnboarding(
      {
        name: name.trim(),
        hoursPerWeek: Number(hours),
        startDate,
        pace,
        coursesPerTerm: PACE_OPTIONS.find((p) => p.id === pace)?.coursesPerTerm || 2,
        csOnlyMode: csOnly,
        skipPrecalc: advice.skipPrecalc,
        programmingStart,
        placement: { programming: prog.percent, math: math.percent, hours: Number(hours) },
      },
      { seed }
    )
  }

  return (
    <div className="onboard">
      <div className="onboard-hero">
        <div className="eyebrow" style={{ color: 'var(--gold)', letterSpacing: '0.14em', fontSize: 11, textTransform: 'uppercase' }}>
          Founded for students who cannot buy a seat
        </div>
        <h1>{PROGRAM.name}</h1>
        <p className="page-sub">
          {PROGRAM.degreeShort}
        </p>
        <p>
          A 124-semester-hour, ABET-style curriculum you can finish while employed. I am the founding professor.
          I will be demanding and I will be kind.
        </p>
      </div>
      <div className="step-dots" aria-hidden>
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <h2>{IS_BOOTCAMP ? 'Who is taking this bootcamp?' : 'Who is taking this degree?'}</h2>
          <div className="field-wrap">
            <label className="field">Preferred name (optional)</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Used in greetings only" />
          </div>
          <div className="field-wrap">
            <label className="field">Program start date (default Fall 2026)</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Due dates generate from this Monday-aligned start. You can change it later; everything recalculates.</div>
          </div>
          <div className="field-wrap">
            <label className="field">Hours per week you can actually protect ({hours})</label>
            <input className="input" type="range" min={5} max={25} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Default 10–12. Two 3-credit courses want ~16–20 if both are heavy. Be honest.</div>
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={() => (IS_BOOTCAMP ? submitBootcamp() : setStep(1))}>
              {IS_BOOTCAMP ? 'Start the 24-week path' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2>Placement — programming comfort</h2>
          <p className="page-sub">{PLACEMENT.programming.blurb}</p>
          <QuizBlock section={PLACEMENT.programming} answers={progAns} setAnswers={setProgAns} />
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn primary" onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Placement — mathematics comfort</h2>
          <p className="page-sub">{PLACEMENT.math.blurb}</p>
          <QuizBlock section={PLACEMENT.math} answers={mathAns} setAnswers={setMathAns} />
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn primary" onClick={() => setStep(3)}>See placement</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>Advisor note</h2>
          <p>
            Programming {prog.percent}% · Math {math.percent}% · {hours} h/week
          </p>
          <ul>
            {advice.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p>
            <strong>Precalculus:</strong> {advice.skipPrecalc ? 'Skip MATH 099.' : 'Take MATH 099 before Calculus I.'}
            <br />
            <strong>Programming start:</strong> {advice.programmingStart === 'CS120' ? 'CS 101, then Java (CS 120). CS 110 waivable with a Python portfolio.' : 'CS 101 then CS 110 (Python).'}
          </p>
          <h3>Pace</h3>
          <div className="grid" style={{ gap: 8 }}>
            {PACE_OPTIONS.map((p) => (
              <label key={p.id} className="resource" style={{ display: 'block', cursor: 'pointer', borderColor: pace === p.id ? 'var(--gold)' : undefined }}>
                <input type="radio" name="pace" checked={pace === p.id} onChange={() => setPace(p.id)} />{' '}
                <strong>{p.name}</strong> · {p.years} years · {p.coursesPerTerm} course(s)/term
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.blurb}</div>
              </label>
            ))}
          </div>
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={csOnly} onChange={(e) => setCsOnly(e.target.checked)} />
            <span>
              CS-only mode (hide gen-ed from the degree audit). I will warn you: a real B.S. includes writing, ethics, and civic literacy. You may still take those courses.
            </span>
          </label>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn primary" onClick={() => setStep(4)}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h2>How should the LMS look on day one?</h2>
          <label className="resource" style={{ display: 'block', cursor: 'pointer', borderColor: seed ? 'var(--gold)' : undefined }}>
            <input type="radio" checked={seed} onChange={() => setSeed(true)} /> Seed a little progress so the dashboard is not an empty warehouse (weeks 1–2 of your first term marked, as if you showed up).
          </label>
          <label className="resource" style={{ display: 'block', cursor: 'pointer', borderColor: !seed ? 'var(--gold)' : undefined }}>
            <input type="radio" checked={!seed} onChange={() => setSeed(false)} /> Start at zero. First-term courses enrolled, nothing complete.
          </label>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Settings always has <em>Start fresh</em> and JSON backup import/export. Close the tab whenever you want; progress lives in this browser until you export it.
          </p>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setStep(3)}>Back</button>
            <button className="btn primary" onClick={submitFinal}>Open {PROGRAM.shortName}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuizBlock({ section, answers, setAnswers }) {
  return (
    <div>
      {section.questions.map((q, i) => (
        <div key={i} className="quiz-q">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {i + 1}. {q.prompt}
          </div>
          {q.type === 'mc' ? (
            q.choices.map((c, ci) => (
              <label key={ci} className="choice">
                <input
                  type="radio"
                  name={`p-${section.title}-${i}`}
                  checked={Number(answers[i]) === ci}
                  onChange={() => setAnswers({ ...answers, [i]: ci })}
                />
                <span>{c}</span>
              </label>
            ))
          ) : (
            <textarea className="textarea" style={{ minHeight: 70 }} value={answers[i] || ''} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  )
}
