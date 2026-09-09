import { useState } from 'react'
import { isAppleTouchDevice, isStandaloneDisplay } from '../lib/pwa.js'

const KEY = 'northstar-install-hint-dismissed'

function shouldShowHint() {
  try {
    if (isStandaloneDisplay()) return false
    if (!isAppleTouchDevice()) return false
    return localStorage.getItem(KEY) !== '1'
  } catch {
    return false
  }
}

export default function InstallHint() {
  const [show, setShow] = useState(shouldShowHint)

  if (!show) return null

  return (
    <div className="install-hint" role="status">
      <div>
        <strong>Use this as an app on iPhone or iPad.</strong>
        <span>
          Tap Share, then <em>Add to Home Screen</em>. It opens full-screen like the Linux desktop app. Progress stays on this device — export a JSON backup from Settings to move it.
        </span>
      </div>
      <button
        className="btn small"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* ignore */
          }
          setShow(false)
        }}
      >
        Got it
      </button>
    </div>
  )
}
