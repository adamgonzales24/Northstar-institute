import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useStudent, useRemember } from '../context/StudentContext.jsx'
import { newNoteId, readingFileLink } from '../lib/notes.js'
import { deleteReadingFile, kindFromMime, loadReadingFile, saveReadingFile, sniffMime } from '../lib/readings.js'

export default function ReadingsTab() {
  const { c } = useOutletContext()
  const { readingId } = useParams()
  const s = useStudent()
  const nav = useNavigate()
  const fileRef = useRef()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const readings = s.courseNotebook(c.id).readings || []
  useRemember(`/courses/${c.id}/readings${readingId ? `/${readingId}` : ''}`, c.id)
  const current = readings.find((r) => r.id === readingId) || null

  async function importFiles(list) {
    setErr('')
    setBusy(true)
    try {
      for (const file of list) {
        const id = newNoteId('r')
        const mime = sniffMime(file.name, file.type)
        const bytes = new Uint8Array(await file.arrayBuffer())
        const meta = {
          id,
          title: file.name.replace(/\.[^.]+$/, ''),
          name: file.name,
          mime,
          kind: kindFromMime(mime),
          addedAt: new Date().toISOString(),
          size: bytes.byteLength,
        }
        await saveReadingFile(c.id, meta, bytes)
        s.addReading(c.id, meta)
        nav(`/courses/${c.id}/readings/${id}`)
      }
    } catch (e) {
      setErr(e.message || 'Could not import that file')
    } finally {
      setBusy(false)
    }
  }

  function addLink(e) {
    e.preventDefault()
    const url = linkUrl.trim()
    const title = linkTitle.trim() || url
    if (!url) return
    const id = newNoteId('r')
    s.addReading(c.id, { id, title, url, kind: 'link', addedAt: new Date().toISOString() })
    setLinkTitle('')
    setLinkUrl('')
    nav(`/courses/${c.id}/readings/${id}`)
  }

  async function remove(row) {
    if (!confirm(`Remove “${row.title}” from this course library?`)) return
    if (row.kind !== 'link') {
      try {
        await deleteReadingFile(c.id, row.id)
      } catch {
        /* metadata still drops */
      }
    }
    s.removeReading(c.id, row.id)
    if (readingId === row.id) nav(`/courses/${c.id}/readings`)
  }

  return (
    <div className="readings">
      <div className="readings-list">
        <p className="page-sub">PDFs and text stay with this course. Files live next to student.json on the USB (or in this browser if you are not on the Linux server).</p>
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button className="btn primary" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Importing…' : 'Import PDF or text'}
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            multiple
            onChange={(e) => {
              const files = [...(e.target.files || [])]
              e.target.value = ''
              if (files.length) importFiles(files)
            }}
          />
        </div>
        <form className="card" style={{ marginBottom: 12 }} onSubmit={addLink}>
          <h3>Bookmark a web book</h3>
          <div className="field-wrap">
            <label className="field">Title</label>
            <input className="input" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="OSTEP chapter 4" />
          </div>
          <div className="field-wrap">
            <label className="field">URL</label>
            <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
          </div>
          <button className="btn" type="submit">
            Save link
          </button>
        </form>
        {err && <div className="banner-strip warn">{err}</div>}
        {readings.length === 0 && <div className="empty">No imported books yet. Catalog links stay on Resources.</div>}
        {readings.map((r) => (
          <div key={r.id} className={`resource ${r.id === readingId ? 'active' : ''}`}>
            <div className="kind">{r.kind || 'file'}</div>
            <Link to={`/courses/${c.id}/readings/${r.id}`}>
              <strong>{r.title}</strong>
            </Link>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button type="button" className="btn small" onClick={() => navigator.clipboard?.writeText(r.url || readingFileLink(c.id, r))}>
                Copy note link
              </button>
              <button type="button" className="btn small danger" onClick={() => remove(r)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="readings-view">
        {current ? <ReadingViewer courseId={c.id} reading={current} /> : <div className="empty">Pick a file or bookmark to view it here.</div>}
      </div>
    </div>
  )
}

function ReadingViewer({ courseId, reading }) {
  const [url, setUrl] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const pageHint = typeof window !== 'undefined' ? window.location.hash : ''

  useEffect(() => {
    let revoke = null
    setErr('')
    setText('')
    setUrl(null)
    if (reading.kind === 'link' && reading.url) {
      setUrl(reading.url)
      return undefined
    }
    ;(async () => {
      try {
        const file = await loadReadingFile(courseId, reading.id, reading.mime)
        if (!file) {
          setErr('File is not on this device. Open Northstar from the USB Linux server, or import it again.')
          return
        }
        if (reading.kind === 'text' || (file.mime || '').startsWith('text/')) {
          setText(await file.blob.text())
          return
        }
        const obj = URL.createObjectURL(file.blob)
        revoke = obj
        setUrl(obj + (pageHint || ''))
      } catch (e) {
        setErr(e.message || 'Could not open that file')
      }
    })()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [courseId, reading, pageHint])

  if (err) return <div className="banner-strip warn">{err}</div>
  if (reading.kind === 'link' && reading.url) {
    return (
      <div>
        <p>
          <a href={reading.url} target="_blank" rel="noreferrer">
            Open in browser
          </a>
        </p>
        <iframe className="reading-frame" title={reading.title} src={reading.url} />
      </div>
    )
  }
  if (text) {
    return <pre className="note-preview">{text}</pre>
  }
  if (url) {
    return <iframe className="reading-frame" title={reading.title} src={url} />
  }
  return <p className="page-sub">Loading…</p>
}
