'use client'
import { useEffect } from 'react'

// Bank-style content-protection deterrents applied site-wide.
// NOTE: the open web cannot truly block OS screenshots/screen-recording — these
// are strong deterrents (right-click, selection, copy, DevTools shortcuts, a
// blackout on PrintScreen / tab-switch / print). A determined user can still bypass.
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

    // Blackout overlay
    const overlay = document.createElement('div')
    overlay.id = 'sec-blackout'
    overlay.setAttribute('aria-hidden', 'true')
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647;display:none'
    const mount = () => { if (document.body && !overlay.isConnected) document.body.appendChild(overlay) }
    mount()
    let hideT = null
    const black = (ms) => { mount(); overlay.style.display = 'block'; if (hideT) clearTimeout(hideT); if (ms) hideT = setTimeout(() => { overlay.style.display = 'none' }, ms) }
    const unblack = () => { if (hideT) clearTimeout(hideT); overlay.style.display = 'none' }

    // Block DevTools / view-source / save / print shortcuts
    const onKeyDown = (e) => {
      const k = (e.key || '').toLowerCase()
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(k))
      ) { e.preventDefault(); return false }
    }
    document.addEventListener('keydown', onKeyDown)

    // PrintScreen -> flash black + clear clipboard (desktop physical key only)
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        black(1500)
        try { navigator.clipboard && navigator.clipboard.writeText(' ') } catch {}
      }
    }
    document.addEventListener('keyup', onKeyUp)

    // Tab-switch / focus loss / minimise -> blackout (deters screen capture & sharing)
    const onVis = () => { if (document.hidden) black(); else unblack() }
    document.addEventListener('visibilitychange', onVis)
    const onBlur = () => black()
    const onFocus = () => unblack()
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      root.classList.remove('sec-lock')
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('selectstart', stop)
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('dragstart', stop)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      if (overlay.isConnected) overlay.remove()
    }
  }, [])
  return null
}
