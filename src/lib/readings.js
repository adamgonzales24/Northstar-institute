import { usbSyncEnabled } from './sync.js'

const IDB_NAME = 'northstar-readings-v1'
const IDB_STORE = 'files'
const MAX_BYTES = 40 * 1024 * 1024

function desktopApi() {
  return typeof window !== 'undefined' ? window.northstarDesktop : null
}

function key(courseId, id) {
  return `${courseId}/${id}`
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(courseId, id, payload) {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(payload, key(courseId, id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(courseId, id) {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key(courseId, id))
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

async function idbDel(courseId, id) {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key(courseId, id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function sniffMime(name, fileType) {
  const lower = (name || '').toLowerCase()
  if (fileType && fileType !== 'application/octet-stream') return fileType
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown'
  if (lower.endsWith('.txt')) return 'text/plain'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.zip')) return 'application/zip'
  if (lower.endsWith('.py') || lower.endsWith('.js') || lower.endsWith('.c') || lower.endsWith('.h')) return 'text/plain'
  return fileType || 'application/octet-stream'
}

export async function saveReadingFile(courseId, meta, bytes) {
  if (bytes.byteLength > MAX_BYTES) throw new Error('File is larger than 40 MB')
  const info = { ...meta, size: bytes.byteLength }
  const api = desktopApi()
  if (api?.saveReading) {
    await api.saveReading(courseId, info, bytes)
    return info
  }
  if (usbSyncEnabled()) {
    const res = await fetch(`/api/readings/${encodeURIComponent(courseId)}/${encodeURIComponent(meta.id)}`, {
      method: 'PUT',
      headers: {
        'content-type': meta.mime || 'application/octet-stream',
        'x-northstar-title': encodeURIComponent(meta.title || meta.name || meta.id),
        'x-northstar-name': encodeURIComponent(meta.name || meta.title || meta.id),
      },
      body: bytes,
    })
    if (!res.ok) throw new Error('Could not save the file on the USB stick')
    return info
  }
  await idbPut(courseId, meta.id, { ...info, bytes })
  return info
}

export async function loadReadingFile(courseId, id, mime) {
  const api = desktopApi()
  if (api?.loadReading) {
    const row = await api.loadReading(courseId, id)
    if (!row?.data) return null
    const buf = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data).buffer
    return { blob: new Blob([buf], { type: row.mime || mime || 'application/octet-stream' }), mime: row.mime || mime }
  }
  if (usbSyncEnabled()) {
    const res = await fetch(`/api/readings/${encodeURIComponent(courseId)}/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const blob = await res.blob()
    return { blob, mime: blob.type || mime }
  }
  const row = await idbGet(courseId, id)
  if (!row?.bytes) return null
  return { blob: new Blob([row.bytes], { type: row.mime || mime }), mime: row.mime || mime }
}

export async function deleteReadingFile(courseId, id) {
  const api = desktopApi()
  if (api?.deleteReading) {
    await api.deleteReading(courseId, id)
    return
  }
  if (usbSyncEnabled()) {
    await fetch(`/api/readings/${encodeURIComponent(courseId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return
  }
  try {
    await idbDel(courseId, id)
  } catch {
    /* ignore */
  }
}

export function kindFromMime(mime, url) {
  if (url && !mime) return 'link'
  if ((mime || '').includes('pdf')) return 'pdf'
  if ((mime || '').startsWith('text/') || (mime || '').includes('markdown')) return 'text'
  if ((mime || '').startsWith('image/')) return 'image'
  if (url) return 'link'
  return 'file'
}
