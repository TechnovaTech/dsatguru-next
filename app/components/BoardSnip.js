'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FiCrop, FiX, FiRefreshCw, FiCheck, FiLoader } from 'react-icons/fi'

// A snipping tool that lives in the meeting.
//
// Pick any screen, window or tab; we freeze ONE frame and stop the capture
// immediately (so no sharing indicator lingers), then let you drag a rectangle
// over that still and send just that region to the whiteboard.
export default function BoardSnip({ onInsert, onClose }) {
  const [stage, setStage] = useState('starting')   // starting | selecting | inserting | error
  const [error, setError] = useState('')
  const [sel, setSel] = useState(null)             // {x,y,w,h} in displayed px
  const frameRef = useRef(null)                    // the full-resolution capture
  const imgRef = useRef(null)                      // the <img> showing it
  const dragStart = useRef(null)

  // ── grab a single frame, then release the screen ──
  const capture = useCallback(async () => {
    setStage('starting'); setError(''); setSel(null)
    let stream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()

      // Wait for real pixels — a freshly-played video can still be blank.
      await new Promise((resolve) => {
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => resolve())
        else setTimeout(resolve, 250)
      })

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      frameRef.current = canvas
      setStage('selecting')
    } catch (e) {
      // The user dismissing the picker is a cancel, not a failure.
      if (e?.name === 'NotAllowedError') { onClose?.(); return }
      setError(e?.message || 'Could not capture the screen.')
      setStage('error')
    } finally {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onClose])

  useEffect(() => { capture() }, [capture])

  // Escape always gets you out.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pointFrom = (e) => {
    const r = imgRef.current.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return {
      x: Math.min(Math.max(src.clientX - r.left, 0), r.width),
      y: Math.min(Math.max(src.clientY - r.top, 0), r.height),
    }
  }

  const onDown = (e) => {
    e.preventDefault()
    dragStart.current = pointFrom(e)
    setSel({ ...dragStart.current, w: 0, h: 0 })
  }
  const onMove = (e) => {
    if (!dragStart.current) return
    const p = pointFrom(e)
    const a = dragStart.current
    setSel({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) })
  }
  const onUp = () => { dragStart.current = null }

  const insert = async () => {
    const frame = frameRef.current
    const img = imgRef.current
    if (!frame || !img) return
    setStage('inserting')
    try {
      const r = img.getBoundingClientRect()
      // Map the on-screen selection back to the captured pixels. No selection
      // means "the whole thing" — a plain screenshot.
      const scaleX = frame.width / r.width
      const scaleY = frame.height / r.height
      const box = sel && sel.w > 4 && sel.h > 4
        ? { x: sel.x * scaleX, y: sel.y * scaleY, w: sel.w * scaleX, h: sel.h * scaleY }
        : { x: 0, y: 0, w: frame.width, h: frame.height }

      const out = document.createElement('canvas')
      out.width = Math.round(box.w)
      out.height = Math.round(box.h)
      out.getContext('2d').drawImage(frame, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height)

      const blob = await new Promise((res) => out.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Could not build the image.')
      await onInsert?.(blob)
      onClose?.()
    } catch (e) {
      setError(e?.message || 'Could not insert that snip.')
      setStage('error')
    }
  }

  const frameUrl = frameRef.current ? frameRef.current.toDataURL('image/png') : null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/90">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FiCrop size={16} />
          {stage === 'starting' && 'Choose a screen or window to snip…'}
          {stage === 'selecting' && (sel && sel.w > 4 ? 'Drag to adjust, then insert' : 'Drag over the area you want')}
          {stage === 'inserting' && 'Inserting…'}
          {stage === 'error' && 'Something went wrong'}
        </span>
        <div className="flex items-center gap-2">
          {stage === 'selecting' && (
            <>
              <button onClick={capture}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10">
                <FiRefreshCw size={14} /> Snip again
              </button>
              <button onClick={insert}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <FiCheck size={14} /> Insert in whiteboard
              </button>
            </>
          )}
          <button onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10">
            <FiX size={14} /> Cancel
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {stage === 'starting' && (
          <p className="flex items-center gap-2 text-sm text-gray-300">
            <FiLoader className="animate-spin" /> Waiting for you to pick a screen…
          </p>
        )}

        {stage === 'error' && (
          <div className="max-w-md text-center">
            <p className="mb-4 text-sm text-rose-300">{error}</p>
            <button onClick={capture} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Try again
            </button>
          </div>
        )}

        {frameUrl && (stage === 'selecting' || stage === 'inserting') && (
          <div className="relative select-none" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
            <img ref={imgRef} src={frameUrl} alt="Screen capture"
              className="max-h-[calc(100vh-7rem)] max-w-full cursor-crosshair object-contain" draggable={false} />
            {sel && sel.w > 2 && sel.h > 2 && (
              <>
                {/* Dim everything outside the selection so the crop is obvious. */}
                <div className="pointer-events-none absolute inset-0 bg-black/50"
                  style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${sel.x}px ${sel.y}px, ${sel.x}px ${sel.y + sel.h}px, ${sel.x + sel.w}px ${sel.y + sel.h}px, ${sel.x + sel.w}px ${sel.y}px, ${sel.x}px ${sel.y}px)` }} />
                <div className="pointer-events-none absolute border-2 border-emerald-400"
                  style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }} />
              </>
            )}
          </div>
        )}
      </div>

      <p className="pb-3 text-center text-xs text-gray-400">
        Tip: skip the drag to insert the whole screen. Esc cancels.
      </p>
    </div>
  )
}
