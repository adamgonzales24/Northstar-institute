export const INSTITUTE_VERSION = '0.2.0'
export const BOOTCAMP_VERSION = '0.1.0'

export function detectProgram() {
  if (typeof window !== 'undefined') {
    const injected = window.__NORTHSTAR_PROGRAM__
    if (injected === 'bootcamp' || injected === 'institute') {
      try {
        sessionStorage.setItem('northstar-program', injected)
      } catch {
        /* ignore */
      }
      return injected
    }
    try {
      const fromDesktop = window.northstarDesktop?.program?.()
      if (fromDesktop === 'bootcamp' || fromDesktop === 'institute') return fromDesktop
    } catch {
      /* ignore */
    }
    try {
      const stored = sessionStorage.getItem('northstar-program')
      if (stored === 'bootcamp' || stored === 'institute') return stored
    } catch {
      /* ignore */
    }
    try {
      if (window.location?.pathname?.includes('bootcamp')) return 'bootcamp'
    } catch {
      /* ignore */
    }
  }
  try {
    const env = import.meta.env?.VITE_NORTHSTAR_PROGRAM
    if (env === 'bootcamp' || env === 'institute') return env
  } catch {
    /* ignore */
  }
  return 'institute'
}

export const PROGRAM_ID = detectProgram()
export const IS_BOOTCAMP = PROGRAM_ID === 'bootcamp'
export const APP_VERSION = IS_BOOTCAMP ? BOOTCAMP_VERSION : INSTITUTE_VERSION
export const STORAGE_KEY = IS_BOOTCAMP ? 'northstar-bootcamp-v1' : 'northstar-institute-v1'
export const DATA_FOLDER = IS_BOOTCAMP ? 'Northstar Bootcamp' : 'Northstar Institute'
