import { forwardRef, useImperativeHandle, useRef } from 'react'

const LinedEditor = forwardRef(function LinedEditor({ value, onChange, placeholder }, ref) {
  const ta = useRef(null)
  const gutter = useRef(null)
  const text = value || ''
  const count = Math.max(1, text.split('\n').length)
  const nums = Array.from({ length: count }, (_, i) => i + 1).join('\n')

  useImperativeHandle(ref, () => ({
    insert(snippet) {
      const el = ta.current
      if (!el) {
        onChange(text + snippet)
        return
      }
      const start = el.selectionStart ?? text.length
      const end = el.selectionEnd ?? text.length
      const next = text.slice(0, start) + snippet + text.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        const pos = start + snippet.length
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    focus() {
      ta.current?.focus()
    },
  }))

  function syncScroll() {
    if (gutter.current && ta.current) gutter.current.scrollTop = ta.current.scrollTop
  }

  return (
    <div className="lined-editor">
      <pre ref={gutter} className="lined-gutter" aria-hidden>
        {nums}
      </pre>
      <textarea
        ref={ta}
        className="lined-input"
        value={text}
        placeholder={placeholder}
        spellCheck
        wrap="off"
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
      />
    </div>
  )
})

export default LinedEditor
