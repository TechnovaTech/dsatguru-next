'use client'
import { useEffect } from 'react'

// Copy-protection deterrents (no screen blackout — that disrupted normal use).
// Disables right-click, text selection, copy/cut, image drag, and DevTools/
// view-source/save/print shortcuts. Best-effort: a determined user can bypass,
// and the web cannot block OS screenshots (watermark handles traceability).
export default function SecurityGuard() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('sec-lock')

    const stop = (e) => { e.preventDefault(); return false }
    document.addEventListener('contextmenu', stop)   // right-click off
    document.addEventListener('selectstart', stop)   // text selection off
    document.addEventListener('copy', stop)
    document.addEventListener('cut', stop)
    document.addEventListener('dragstart', stop)      // image drag off

    // Block DevTools / view-source / save / print shortcuts.
    const onKeyDown = (e) => {
      const k = (e.key || '').toLowerCase()
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(k))
      ) { e.preventDefault(); return false }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      root.classList.remove('sec-lock')
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('selectstart', stop)
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('dragstart', stop)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])
  return null
}
