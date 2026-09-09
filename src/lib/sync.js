const cfg = { enabled: false, record: '/api/student.json', meta: '/api/student-meta' }
let pushTimer = null
let readyToPush = false

export function usbSyncEnabled() {
  return cfg.enabled
}

export function allowUsbPush() {
  readyToPush = true
}

import { PROGRAM_ID } from './config.js'

export async function loadUsbSyncConfig() {
  try {
    const res = await fetch(`/api/sync-config?program=${encodeURIComponent(PROGRAM_ID)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.enabled) return null
    cfg.enabled = true
    cfg.record = data.record || cfg.record
    cfg.meta = data.meta || cfg.meta
    cfg.readings = data.readings || '/api/readings'
    return data
  } catch {
    return null
  }
}

export async function fetchUsbMeta() {
  if (!cfg.enabled) return null
  try {
    const res = await fetch(cfg.meta, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function pullUsbRecord() {
  if (!cfg.enabled) return null
  const res = await fetch(cfg.record, { cache: 'no-store' })
  if (!res.ok) throw new Error('USB record was not available')
  return res.json()
}

export function pushUsbRecord(state) {
  if (!cfg.enabled || !readyToPush) return
  if (!state || !state.onboarded) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    fetch(cfg.record, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    }).catch((err) => console.warn('Northstar: USB sync failed', err))
  }, 400)
}

export function recordLooksBlank(state) {
  if (!state || !state.onboarded) return true
  const enrollments = state.enrollments || {}
  return Object.keys(enrollments).length === 0
}
