import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import LinedEditor from '../components/LinedEditor.jsx'
import NotePreview from '../components/NotePreview.jsx'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { moduleLink, newNoteId, notebookPagesForCourse, pageTitleForWeek, readingFileLink, weekPageId, workLink } from '../lib/notes.js'

export default function NotebookTab() {
  const { c } = useOutletContext()
  const { pageId: routePage } = useParams()
  const s = useStudent()
  const nav = useNavigate()
  const editor = useRef(null)
  const [mode, setMode] = useState('edit')
  useRemember(`/courses/${c.id}/notebook/${routePage || 'journal'}`, c.id)
  const [draftTitle, setDraftTitle] = useState('')
  const nb = s.courseNotebook(c.id)
  const pages = useMemo(() => notebookPagesForCourse(c, nb), [c, nb])
  const selectedId = routePage && pages.some((p) => p.id === routePage) ? routePage : pages[0]?.id || 'journal'
  const page = pages.find((p) => p.id === selectedId) || pages[0]
  const body = page?.body || ''

  function openPage(id) {
    nav(`/courses/${c.id}/notebook/${id}`)
  }

  function write(next) {
    s.setNotePage(c.id, page.id, { title: page.title, body: next, week: page.week })
  }

  function insert(snippet) {
    if (mode !== 'edit') setMode('edit')
    editor.current?.insert(snippet.endsWith('\n') ? snippet : `${snippet}\n`)
  }

  const week = c.weeks.find((w) => weekPageId(w.week) === page?.id)

  return (
    <div className="notebook">
      <aside className="notebook-nav">
        <div className="page-sub" style={{ marginBottom: 8 }}>
          Private to {c.code}. Saved with your student record.
        </div>
        {pages.map((p) => (
          <button key={p.id} type="button" className={`notebook-page-btn ${p.id === selectedId ? 'active' : ''}`} onClick={() => openPage(p.id)}>
            {p.title}
          </button>
        ))}
        <form
          className="notebook-new"
          onSubmit={(e) => {
            e.preventDefault()
            const title = draftTitle.trim()
            if (!title) return
            const id = newNoteId('page')
            s.setNotePage(c.id, id, { title, body: '' })
            setDraftTitle('')
            openPage(id)
          }}
        >
          <input className="input" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="New page title" aria-label="New page title" />
          <button className="btn small" type="submit">
            Add
          </button>
        </form>
      </aside>
      <div className="notebook-main">
        <div className="notebook-toolbar">
          <strong>{page?.title}</strong>
          <div className="btn-row">
            <button type="button" className={`btn small ${mode === 'edit' ? 'primary' : ''}`} onClick={() => setMode('edit')}>
              Edit
            </button>
            <button type="button" className={`btn small ${mode === 'preview' ? 'primary' : ''}`} onClick={() => setMode('preview')}>
              Preview links
            </button>
          </div>
        </div>
        <p className="page-sub">
          Monospace, line numbers. Markdown links: <code>[label](https://…)</code> or <code>[Week 7](/courses/{c.id}/modules/7)</code>.
          Wiki: <code>[[week 7]]</code>, <code>[[{c.id}]]</code>.
        </p>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          {week && (
            <button type="button" className="btn small" onClick={() => insert(moduleLink(c.id, week.week, week.title))}>
              Link this week
            </button>
          )}
          <InsertMenu course={c} page={page} onInsert={insert} />
          <Link className="btn small" to={`/courses/${c.id}/readings`}>
            Open readings
          </Link>
        </div>
        {mode === 'edit' ? (
          <LinedEditor
            ref={editor}
            value={body}
            onChange={write}
            placeholder={`Notes for ${page?.title || 'this course'}.\n\n[[week 1]]\n[OpenStax](https://openstax.org/)`}
          />
        ) : (
          <div className="card">
            <NotePreview text={body} courseId={c.id} byId={s.byId} />
          </div>
        )}
      </div>
    </div>
  )
}

function InsertMenu({ course, page, onInsert }) {
  const s = useStudent()
  const weekNum = page?.week || (page?.id || '').replace(/^week-/, '')
  const week = course.weeks.find((w) => String(w.week) === String(weekNum)) || course.weeks[0]
  const readings = s.courseNotebook(course.id).readings || []
  const items = (course.gradedItems || []).filter((i) => i.week === week?.week).slice(0, 6)
  return (
    <>
      <select
        className="select"
        style={{ width: 'auto' }}
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value
          e.target.value = ''
          if (!v) return
          if (v.startsWith('week:')) {
            const n = Number(v.slice(5))
            const w = course.weeks.find((x) => x.week === n)
            onInsert(moduleLink(course.id, n, w?.title))
          } else if (v.startsWith('work:')) {
            const it = course.gradedItems.find((x) => x.id === v.slice(5))
            if (it) onInsert(workLink(course.id, it))
          } else if (v.startsWith('readcat:')) {
            const [kind, idx] = v.split(':').slice(1)
            const list = kind === 'r' ? week?.readings : week?.lectures
            const row = list?.[Number(idx)]
            if (row?.url) onInsert(`[${row.title}](${row.url})`)
            else if (row) onInsert(row.title)
          } else if (v.startsWith('lib:')) {
            const r = readings.find((x) => x.id === v.slice(4))
            if (r) onInsert(r.url ? `[${r.title}](${r.url})` : readingFileLink(course.id, r))
          }
        }}
        aria-label="Insert a link"
      >
        <option value="">Insert link…</option>
        <optgroup label="Modules">
          {course.weeks.map((w) => (
            <option key={w.week} value={`week:${w.week}`}>
              {pageTitleForWeek(w.week, w.title)}
            </option>
          ))}
        </optgroup>
        {items.length > 0 && (
          <optgroup label="This week’s work">
            {items.map((it) => (
              <option key={it.id} value={`work:${it.id}`}>
                {it.title}
              </option>
            ))}
          </optgroup>
        )}
        {(week?.readings || []).length > 0 && (
          <optgroup label="Assigned readings">
            {week.readings.map((r, i) => (
              <option key={`r${i}`} value={`readcat:r:${i}`}>
                {r.title}
              </option>
            ))}
          </optgroup>
        )}
        {readings.length > 0 && (
          <optgroup label="Imported files">
            {readings.map((r) => (
              <option key={r.id} value={`lib:${r.id}`}>
                {r.title}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </>
  )
}
