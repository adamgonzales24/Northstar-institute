import { THEMES } from '../lib/themes.js'

export default function ThemePicker({ value, onChange }) {
  return (
    <div className="theme-grid">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-card ${value === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <strong>{t.name}</strong>
          <div className="theme-swatch">
            {t.swatch.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.blurb}</div>
        </button>
      ))}
    </div>
  )
}
