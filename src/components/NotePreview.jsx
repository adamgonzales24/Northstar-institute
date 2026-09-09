import { Link } from 'react-router-dom'
import { isHttp, isInternalPath, noteTokens, resolveWikiTarget } from '../lib/noteLinks.js'

export default function NotePreview({ text, courseId, byId }) {
  const src = text || ''
  const tokens = noteTokens(src)
  if (!src.trim()) return <p className="page-sub">Nothing on this page yet.</p>
  const parts = []
  let cursor = 0
  tokens.forEach((tok, i) => {
    if (tok.start > cursor) parts.push(<span key={`t${i}`}>{src.slice(cursor, tok.start)}</span>)
    if (tok.type === 'wiki') {
      const href = resolveWikiTarget(tok.label, courseId, byId)
      parts.push(href ? <NoteLink key={`w${i}`} href={href} label={`[[${tok.label}]]`} /> : <span key={`w${i}`}>{`[[${tok.label}]]`}</span>)
    } else {
      parts.push(<NoteLink key={`l${i}`} href={tok.href} label={tok.label || tok.href} />)
    }
    cursor = tok.end
  })
  if (cursor < src.length) parts.push(<span key="tail">{src.slice(cursor)}</span>)
  return <pre className="note-preview">{parts}</pre>
}

function NoteLink({ href, label }) {
  if (isInternalPath(href)) {
    return (
      <Link to={href}>
        {label}
      </Link>
    )
  }
  if (isHttp(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }
  return <span>{label}</span>
}
