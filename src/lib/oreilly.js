export function oreillySearchUrl(query) {
  const q = (query || '').trim()
  if (!q) return 'https://learning.oreilly.com/'
  return `https://learning.oreilly.com/search/?q=${encodeURIComponent(q)}`
}

export function readingHref(r) {
  if (!r) return null
  if (r.url) return r.url
  if (r.search || r.oreilly) return oreillySearchUrl(r.search || r.title)
  return null
}

export function readingKey(week, reading, index) {
  if (reading?.id) return reading.id
  const slug = String(reading?.title || `r${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `w${week}-${index}-${slug}`
}
