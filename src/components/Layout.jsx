import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Ico } from './Icons.jsx'
import { useStudent } from '../context/StudentContext.jsx'
import InstallHint from './InstallHint.jsx'
import DueReminders from './DueReminders.jsx'
import { isStandaloneDisplay } from '../lib/pwa.js'
import TimeControls from './TimeControls.jsx'
import { PROGRAM } from '../data/activeProgram.js'
import { APP_VERSION, IS_BOOTCAMP } from '../lib/config.js'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Ico.dash },
  { to: '/courses', label: IS_BOOTCAMP ? 'Path' : 'Courses', icon: Ico.courses },
  { to: '/calendar', label: 'Calendar', icon: Ico.cal },
  { to: '/grades', label: 'Grades', icon: Ico.grades, hideOnBootcamp: false },
  { to: '/audit', label: 'Degree Audit', icon: Ico.audit, degreeOnly: true },
  { to: '/transcript', label: 'Transcript', icon: Ico.transcript, degreeOnly: true },
  { to: '/portfolio', label: 'Portfolio', icon: Ico.portfolio },
  { to: '/professor', label: 'Ask the Professor', icon: Ico.prof },
  { to: '/settings', label: 'Settings', icon: Ico.settings },
].filter((n) => !(IS_BOOTCAMP && n.degreeOnly))

const TABS = [
  { to: '/dashboard', label: 'Home', icon: Ico.dash },
  { to: '/courses', label: 'Courses', icon: Ico.courses },
  { to: '/calendar', label: 'Calendar', icon: Ico.cal },
  { to: '/grades', label: 'Grades', icon: Ico.grades },
]

export default function Layout() {
  const { state, gpa, credits, hours } = useLayoutStats()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const moreActive = !TABS.some((t) => loc.pathname === t.to || (t.to !== '/dashboard' && loc.pathname.startsWith(t.to)))

  useEffect(() => {
    document.documentElement.classList.toggle('standalone', isStandaloneDisplay())
  }, [])

  return (
    <div className="app-shell">
      {open && <div className="modal-back drawer-back" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/dashboard" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">{Ico.star}</span>
          <span className="brand-text">
            <strong>{PROGRAM.name}</strong>
            <span>{PROGRAM.degreeShort}</span>
          </span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setOpen(false)}>
              {n.icon}
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>
            {IS_BOOTCAMP
              ? 'One 24-week systems path. Hours, chapters, and a shipped studio.'
              : 'Mastery, a public portfolio, and a full 124-hour plan.'}
          </span>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--faint)' }}>
            {PROGRAM.name} {APP_VERSION}
          </div>
        </div>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setOpen(true)}>
            {Ico.menu}
          </button>
          <div className="crumb">
            <strong>{crumb(loc.pathname)}</strong>
          </div>
          <form
            className="topbar-spacer"
            style={{ display: 'flex', justifyContent: 'center' }}
            onSubmit={(e) => {
              e.preventDefault()
              nav(`/courses?q=${encodeURIComponent(q)}`)
            }}
          >
            <input
              className="search"
              placeholder="Search catalog…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search catalog"
            />
          </form>
          <TimeControls />
          <button
            type="button"
            className="hours-chip"
            title="Hours logged this week vs your budget. Clock in to record time."
            onClick={() => nav('/settings#time')}
          >
            <span>Logged</span> <b>{hours}h</b> / {state.profile.hoursPerWeek}h
          </button>
          {!IS_BOOTCAMP && (
            <div className="gpa-chip">
              <span>GPA</span> <b>{gpa.gpa != null ? gpa.gpa.toFixed(2) : '—'}</b>
              <span>· {credits} cr</span>
            </div>
          )}
        </header>
        <main id="main">
          <DueReminders />
          <InstallHint />
          <UsbRestoreBanner />
          <Outlet />
        </main>
        <nav className="tabbar" aria-label="Primary">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              {t.icon}
              <span>{t.label}</span>
            </NavLink>
          ))}
          <button type="button" className={`tabbar-more ${moreActive ? 'active' : ''}`} aria-label="More" onClick={() => setOpen(true)}>
            {Ico.menu}
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

function UsbRestoreBanner() {
  const { usbSync, pullUsb } = useStudent()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!usbSync?.offer || !usbSync.meta?.onboarded) return null
  const who = usbSync.meta.name || 'Student'
  const where = usbSync.meta.lastCourseId ? `${usbSync.meta.lastCourseId} week ${usbSync.meta.lastModule || 1}` : 'the dashboard'
  return (
    <div className="banner-strip">
      <div>
        <div className="eyebrow">USB stick</div>
        <strong>{who}’s record is on the Linux drive.</strong>
        <div>
          Last place: {where}. This iPad started a new copy. Load the USB progress to continue where you left off.
        </div>
        {err && <div>{err}</div>}
      </div>
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setErr('')
          try {
            await pullUsb()
          } catch (e) {
            setErr(e.message || 'Could not load USB record')
            setBusy(false)
          }
        }}
      >
        {busy ? 'Loading…' : 'Load USB progress'}
      </button>
    </div>
  )
}

function useLayoutStats() {
  return useStudent()
}

function crumb(path) {
  if (path.includes('/notebook')) return 'Notebook'
  if (path.includes('/readings')) return 'Readings'
  if (path.startsWith('/courses/')) return 'Course'
  const map = {
    '/dashboard': 'Dashboard',
    '/courses': 'Courses',
    '/calendar': 'Calendar',
    '/grades': 'Grades',
    '/audit': 'Degree Audit',
    '/transcript': 'Unofficial Transcript',
    '/portfolio': 'Portfolio',
    '/settings': 'Settings',
    '/professor': 'Ask the Professor',
  }
  return map[path] || 'Northstar'
}
