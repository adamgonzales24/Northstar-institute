export const THEMES = [
  {
    id: 'night',
    name: 'Institute Night',
    blurb: 'Navy and gold — the original palette.',
    swatch: ['#0c1218', '#d4a017', '#4aa3df'],
  },
  {
    id: 'hearth',
    name: 'Winter Hearth',
    blurb: 'Warm paper, walnut, and ember for winter nights.',
    swatch: ['#2a1c14', '#c47a3a', '#f3e6d4'],
  },
  {
    id: 'paper',
    name: 'Day Paper',
    blurb: 'Light page, ink text — easier in a bright room.',
    swatch: ['#f6f1e8', '#1c1914', '#8b3d2a'],
  },
  {
    id: 'pine',
    name: 'Pine Study',
    blurb: 'Deep green, brass, lamplight.',
    swatch: ['#0f1a14', '#c4a35a', '#3d8f6e'],
  },
  {
    id: 'slate',
    name: 'Slate Workshop',
    blurb: 'Cool gray and ink for long coding sessions.',
    swatch: ['#1a1d22', '#8aa0b4', '#d8dee6'],
  },
]

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0]
}

export function applyTheme(id) {
  if (typeof document === 'undefined') return
  const theme = themeById(id)
  document.documentElement.setAttribute('data-theme', theme.id)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.swatch[0])
}
