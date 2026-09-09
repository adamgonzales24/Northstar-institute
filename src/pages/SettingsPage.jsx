import { useEffect, useRef, useState } from 'react'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { PACE_OPTIONS, ELECTIVE_CHOICES } from '../data/activeProgram.js'
import { downloadDueIcs, enableDueReminders } from '../lib/reminders.js'
import { fetchAiStatus } from '../lib/ai.js'
import ThemePicker from '../components/ThemePicker.jsx'
import { APP_VERSION, IS_BOOTCAMP } from '../lib/config.js'
import { PROGRAM } from '../data/activeProgram.js'
import { hoursLoggedThisWeek, formatDuration, sessionMs } from '../lib/time.js'

export default function SettingsPage() {
  const s = useStudent()
  useRemember('/settings')
  const file = useRef()
  const p = s.state.profile
  const [msg, setMsg] = useState('')
  const [ai, setAi] = useState(null)

  useEffect(() => {
    fetchAiStatus().then(setAi)
  }, [])

  function patch(partial) {
    s.setProfile(partial)
    setMsg('Saved. Start date, pace, and hour budget affect suggested dues and the sample plan. Enrollments already in progress keep their term unless you re-onboard via Start fresh.')
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p style={{ fontSize: 12, color: 'var(--faint)' }}>
        {PROGRAM.name} {APP_VERSION}
      </p>
      <p className="page-sub">
        {s.desktop
          ? 'This desktop app saves your whole record to a JSON file. Close the window and reopen — you land on the last page. Copy that file to take the degree to another computer.'
          : 'On iPhone, iPad, or in a browser, progress lives on this device. Export a JSON backup before you switch machines. On a computer you can also install the Linux desktop app so a file in Documents is the source of truth.'}
      </p>
      {msg && <div className="banner-strip info">{msg}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Student</h3>
        <div className="field-wrap">
          <label className="field">Name</label>
          <input className="input" value={p.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="field-wrap">
          <label className="field">Start date</label>
          <input className="input" type="date" value={p.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
        </div>
        <div className="field-wrap">
          <label className="field">Hours / week ({p.hoursPerWeek})</label>
          <input className="input" type="range" min={5} max={25} value={p.hoursPerWeek} onChange={(e) => patch({ hoursPerWeek: Number(e.target.value) })} />
        </div>
        {!IS_BOOTCAMP && (
        <div className="field-wrap">
          <label className="field">Pace</label>
          <select className="select" value={p.pace} onChange={(e) => patch({ pace: e.target.value, coursesPerTerm: PACE_OPTIONS.find((x) => x.id === e.target.value)?.coursesPerTerm })}>
            {PACE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.years} years, {o.coursesPerTerm}/term
              </option>
            ))}
          </select>
        </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }} id="appearance">
        <h3>Appearance</h3>
        <p>Institute Night stays available. Winter Hearth is the cozy winter set. Switching theme does not change your grades.</p>
        <ThemePicker value={p.theme || 'night'} onChange={(id) => patch({ theme: id })} />
      </div>

      <div className="card" style={{ marginBottom: 12 }} id="time">
        <h3>Hours log</h3>
        <p>
          Clock in from the top bar. This week: {hoursLoggedThisWeek(s.state.timeSessions, s.state.clock)}h of {p.hoursPerWeek}h.
          The old “Load 12h” chip was planned course load, not time spent — that is why it never moved.
        </p>
        {(s.state.timeSessions || []).slice(-12).reverse().map((row) => (
          <div key={row.id} style={{ fontSize: 13, marginBottom: 4 }}>
            {new Date(row.start).toLocaleString()} · {formatDuration(sessionMs(row))} · {row.kind}
            {row.courseId ? ` · ${row.courseId}` : ''}
          </div>
        ))}
        {(s.state.timeSessions || []).length === 0 && !s.state.clock && (
          <p className="page-sub">No sessions yet. Use Clock in or Pomodoro (25 minutes).</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Grading</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={(p.gradingMode || 'complete') === 'letters'}
            onChange={(e) => patch({ gradingMode: e.target.checked ? 'letters' : 'complete' })}
          />
          <span>Show letter grades (A–F). Off = complete / incomplete plus tutor comments.</span>
        </label>
      </div>

      {IS_BOOTCAMP && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Studio choice (weeks 17–22)</h3>
          <select className="select" value={p.studioChoice || 'app'} onChange={(e) => patch({ studioChoice: e.target.value })}>
            <option value="app">Internal / desktop tool (default)</option>
            <option value="game">Game systems slice</option>
            <option value="firmware">Firmware / sim</option>
          </select>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Local AI tutor</h3>
        <p>
          {ai?.available
            ? `Running ${ai.model} on this computer. Grading and “Ask the professor” use it — no paid tokens.`
            : 'Not running. On the Linux machine: `ollama pull qwen3.8:27b` and keep `ollama serve` up while the school server is running.'}
        </p>
        {ai?.error && <p className="page-sub">{ai.error}</p>}
        {(ai?.models || []).length > 0 && (
          <div className="field-wrap">
            <label className="field">Model</label>
            <select
              className="select"
              value={p.aiModel || ai.model || ''}
              onChange={(e) => patch({ aiModel: e.target.value })}
            >
              {ai.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Due reminders</h3>
        <p>
          Download a calendar file for Apple/Google Calendar (alerts on your phone, including SMS if you turned that on in the calendar app). Or allow notifications in this browser.
        </p>
        <div className="btn-row">
          <button
            className="btn"
            onClick={() => {
              downloadDueIcs(s.todos, p.name)
              setMsg('Calendar file downloaded.')
            }}
          >
            Download due-date calendar
          </button>
          <button
            className="btn"
            onClick={async () => {
              const r = await enableDueReminders()
              if (r.ok) {
                s.setRemindersEnabled(true)
                setMsg('Due reminders enabled on this device.')
              } else {
                setMsg(r.error || 'Notifications were not allowed.')
              }
            }}
          >
            {s.state.remindersEnabled ? 'Reminders on' : 'Enable notifications'}
          </button>
          {s.state.remindersEnabled && (
            <button className="btn" onClick={() => { s.setRemindersEnabled(false); setMsg('Reminders off.') }}>
              Turn off
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Life Happens</h3>
        <p>Shift remaining suggested due dates. Past items stay where they are. Current shift: {s.state.lifeHappensWeeks || 0} week(s).</p>
        <div className="btn-row">
          <button className="btn" onClick={() => s.lifeHappens(1)}>
            +1 week
          </button>
          <button className="btn" onClick={() => s.lifeHappens(2)}>
            +2 weeks
          </button>
          <button className="btn" onClick={() => s.dispatch({ type: 'PATCH', patch: { lifeHappensWeeks: 0 } })}>
            Reset shift
          </button>
        </div>
      </div>

      {!IS_BOOTCAMP && (
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>General education</h3>
        <label className="check">
          <input type="checkbox" checked={p.csOnlyMode} onChange={(e) => patch({ csOnlyMode: e.target.checked })} />
          <span>CS-only mode — remove gen-ed from the degree-audit target. A real B.S. includes it. I will still keep the courses in the catalog.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={p.skipPrecalc} onChange={(e) => patch({ skipPrecalc: e.target.checked })} />
          <span>Skip MATH 099 (precalculus bridge)</span>
        </label>
      </div>

      )}
      {!IS_BOOTCAMP && (
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Technical electives (pick 4)</h3>
        {ELECTIVE_CHOICES.map((id) => {
          const c = s.byId[id]
          const on = s.state.electives.includes(id)
          return (
            <label key={id} className="check">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  let next = s.state.electives.slice()
                  if (e.target.checked) next.push(id)
                  else next = next.filter((x) => x !== id)
                  s.dispatch({ type: 'PATCH', patch: { electives: next } })
                }}
              />
              <span>
                {c?.code} {c?.title}
              </span>
            </label>
          )
        })}
      </div>
      )}

      {s.desktop && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>This computer</h3>
          <p>
            Progress file{s.desktop.portable ? ' (portable folder)' : ''}:
            <br />
            <code className="mono">{s.desktop.dataPath}</code>
          </p>
          <p>
            To move to another computer: copy that <code>student.json</code> (or the whole portable folder) onto a USB drive. On the new machine, put it in{' '}
            <code>Documents/Northstar Institute/</code> or use Import below.
          </p>
          <div className="btn-row">
            <button className="btn" onClick={() => s.openDataFolder()}>
              Open data folder
            </button>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(s.desktop.dataPath)
                  setMsg('Copied the progress file path.')
                } catch {
                  setMsg(s.desktop.dataPath)
                }
              }}
            >
              Copy path
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>iPhone and iPad</h3>
        <p>
          In Safari, tap Share, then <strong>Add to Home Screen</strong>. Northstar opens like an app, without the Safari chrome. iOS may still clear site data if the device is low on storage — export a backup after quizzes and at the end of each week.
        </p>
        {s.usbSync?.available ? (
          <>
            <p>
              This session is linked to the USB file <code>student.json</code>
              {s.usbSync.meta?.name ? ` (${s.usbSync.meta.name}` : ''}
              {s.usbSync.meta?.lastCourseId ? ` · ${s.usbSync.meta.lastCourseId} week ${s.usbSync.meta.lastModule || 1}` : ''}
              {s.usbSync.meta?.name ? ')' : ''}. Edits on this iPad write back to that file while the Linux server is running.
            </p>
            <div className="btn-row">
              <button
                className="btn primary"
                onClick={async () => {
                  try {
                    await s.pullUsb()
                    setMsg('Loaded the USB record. You should be back where you left off.')
                  } catch (err) {
                    setMsg(err.message || 'Could not load the USB record. Is the Linux server still running?')
                  }
                }}
              >
                Load USB progress
              </button>
            </div>
          </>
        ) : (
          <p>
            Linux desktop and iOS do not share a folder unless you open Northstar through the Linux server. Then use <strong>Load USB progress</strong>, or move <code>student.json</code> with Export / Import below.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Backup</h3>
        <p>Same JSON the desktop app stores as <code>student.json</code>. On iPhone or iPad, Export opens the share sheet so you can save it to Files or AirDrop it to the Linux machine.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => s.exportBackup()}>
            Export backup JSON
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            Import backup JSON
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) {
                await s.importBackup(f)
                setMsg('Imported. Welcome back.')
              }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h3>Danger zone</h3>
        <p>Start fresh keeps your name but clears enrollments, scores, and onboarding so you walk through placement again.</p>
        <div className="btn-row">
          <button className="btn danger" onClick={() => { if (confirm('Clear progress and return to onboarding?')) s.startFresh() }}>
            Start fresh
          </button>
          <button className="btn danger" onClick={() => { if (confirm(s.desktop ? 'Wipe all Northstar data on this computer (the student.json file)?' : 'Wipe all Northstar data in this browser?')) s.reset() }}>
            Wipe local data
          </button>
        </div>
      </div>
    </div>
  )
}
