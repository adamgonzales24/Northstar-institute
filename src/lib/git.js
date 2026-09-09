function desktopApi() {
  return typeof window !== 'undefined' ? window.northstarDesktop : null
}

export async function gitStatus() {
  const api = desktopApi()
  if (api?.gitStatus) return api.gitStatus()
  const r = await fetch('/api/git/status', { cache: 'no-store' })
  const data = await readJson(r)
  if (!r.ok || data.error) throw new Error(data.error || `Git status failed (${r.status})`)
  return data
}

export async function gitCommit({ comment, courseId, week }) {
  const api = desktopApi()
  if (api?.gitCommit) return api.gitCommit({ comment, courseId, week })
  const r = await fetch('/api/git/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment, courseId, week }),
  })
  const data = await readJson(r)
  if (!r.ok || data.ok === false || data.error) throw new Error(data.error || `Git commit failed (${r.status})`)
  return data
}

async function readJson(r) {
  const text = await r.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 200) }
  }
}
