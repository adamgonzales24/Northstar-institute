export function isAppleTouchDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  if (window.navigator.standalone === true) return true
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches
  } catch {
    return false
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Northstar: service worker not registered', err)
    })
  })
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {
    /* iOS may ignore this; JSON export is the durable copy */
  }
}
