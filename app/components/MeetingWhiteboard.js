'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

const WB_CHANNEL = 'wb'
const COLORS = ['#000000','#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#ffffff']
const SIZES  = [2, 4, 8, 14, 22]

export default function MeetingWhiteboard({ isAdmin, roomName, meetingTitle, participants = [] }) {
  const room        = useRoomContext()
  const canvasRef   = useRef(null)
  const drawing     = useRef(false)
  const lastPt      = useRef(null)
  const strokesRef  = useRef([])   // [{tool,color,size,pts:[{x,y}]}]
  const currentRef  = useRef(null)

  const [tool,  setTool]  = useState('pen')   // pen | eraser | line | rect | circle | text
  const [color, setColor] = useState('#000000')
  const [size,  setSize]  = useState(4)
  const [textInput, setTextInput] = useState('')
  // Sharing the board out of the class.
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTitle, setShareTitle] = useState('')
  const [picked, setPicked] = useState([])        // empty = everyone in the class
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [textPos,   setTextPos]   = useState(null)

  // ── draw all strokes onto canvas ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokesRef.current.forEach(s => drawStroke(ctx, s))
    if (currentRef.current) drawStroke(ctx, currentRef.current)
  }, [])

  function drawStroke(ctx, s) {
    if (!s || !s.pts || s.pts.length === 0) return
    ctx.save()
    ctx.strokeStyle = s.tool === 'eraser' ? '#ffffff' : s.color
    ctx.fillStyle   = s.color
    ctx.lineWidth   = s.size
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    if (s.tool === 'text') {
      ctx.font = `${s.size * 4}px sans-serif`
      ctx.fillStyle = s.color
      ctx.fillText(s.text || '', s.pts[0].x, s.pts[0].y)
    } else if (s.tool === 'line' && s.pts.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s.pts[0].x, s.pts[0].y)
      ctx.lineTo(s.pts[s.pts.length - 1].x, s.pts[s.pts.length - 1].y)
      ctx.stroke()
    } else if (s.tool === 'rect' && s.pts.length >= 2) {
      const p0 = s.pts[0], p1 = s.pts[s.pts.length - 1]
      ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y)
    } else if (s.tool === 'circle' && s.pts.length >= 2) {
      const p0 = s.pts[0], p1 = s.pts[s.pts.length - 1]
      const rx = Math.abs(p1.x - p0.x) / 2, ry = Math.abs(p1.y - p0.y) / 2
      const cx = p0.x + (p1.x - p0.x) / 2, cy = p0.y + (p1.y - p0.y) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.beginPath()
      s.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()
    }
    ctx.restore()
  }

  // ── broadcast strokes via LiveKit ─────────────────────────────────────────
  const broadcast = useCallback(() => {
    if (!room || !isAdmin) return
    try {
      const payload = JSON.stringify({ type: WB_CHANNEL, strokes: strokesRef.current })
      const enc = new TextEncoder().encode(payload)
      if (enc.length < 60000) room.localParticipant.publishData(enc, { reliable: true })
    } catch {}
  }, [room, isAdmin])

  // ── receive strokes (students) ────────────────────────────────────────────
  useEffect(() => {
    if (!room || isAdmin) return
    const handler = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type !== WB_CHANNEL) return
        strokesRef.current = msg.strokes || []
        redraw()
      } catch {}
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room, isAdmin, redraw])

  // ── canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const { width, height } = canvas.parentElement.getBoundingClientRect()
      canvas.width  = width
      canvas.height = height
      redraw()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [redraw])

  // ── pointer helpers ───────────────────────────────────────────────────────
  const getXY = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  const onDown = (e) => {
    if (!isAdmin) return
    if (tool === 'text') {
      setTextPos(getXY(e))
      return
    }
    drawing.current = true
    const pt = getXY(e)
    lastPt.current = pt
    currentRef.current = { tool, color, size, pts: [pt] }
  }

  const onMove = (e) => {
    if (!isAdmin || !drawing.current || !currentRef.current) return
    const pt = getXY(e)
    currentRef.current.pts.push(pt)
    lastPt.current = pt
    redraw()
  }

  const onUp = () => {
    if (!isAdmin || !drawing.current) return
    drawing.current = false
    if (currentRef.current) {
      strokesRef.current.push(currentRef.current)
      currentRef.current = null
      broadcast()
    }
    redraw()
  }

  const addText = () => {
    if (!textInput.trim() || !textPos) return
    strokesRef.current.push({ tool: 'text', color, size, pts: [textPos], text: textInput })
    setTextInput('')
    setTextPos(null)
    broadcast()
    redraw()
  }

  const clearBoard = () => {
    strokesRef.current = []
    currentRef.current = null
    broadcast()
    redraw()
  }

  const undo = () => {
    strokesRef.current.pop()
    broadcast()
    redraw()
  }

  // Flatten the board onto a white background — a transparent PNG looks like an
  // empty image everywhere it is later viewed.
  const shareBoard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSharing(true); setShareMsg('')
    try {
      const flat = document.createElement('canvas')
      flat.width = canvas.width; flat.height = canvas.height
      const fx = flat.getContext('2d')
      fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, flat.width, flat.height)
      fx.drawImage(canvas, 0, 0)
      const image = flat.toDataURL('image/png')

      const token = localStorage.getItem('token')
      const res = await fetch('/api/meetings/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room: roomName || '',
          title: shareTitle.trim() || meetingTitle || 'Class whiteboard',
          image,
          recipients: picked,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not share the board.')
      setShareMsg(picked.length ? `Shared with ${picked.length} student${picked.length === 1 ? '' : 's'} ✓` : 'Shared with the whole class ✓')
      setTimeout(() => { setShareOpen(false); setShareMsg('') }, 1800)
    } catch (e) {
      setShareMsg(e.message)
    } finally {
      setSharing(false)
    }
  }

  // ── tool button helper ────────────────────────────────────────────────────
  const Btn = ({ t, label, emoji }) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`px-2 py-1.5 rounded text-sm font-medium transition-all ${tool === t ? 'bg-blue-600 text-white shadow' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {emoji}
    </button>
  )

  return (
    <div className="w-full h-full flex flex-col bg-white relative">

      {/* ── SHARE PANEL (admin only) ── */}
      {isAdmin && shareOpen && (
        <div className="absolute right-3 top-14 z-30 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Share this board</p>
          <input
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
            placeholder={meetingTitle || 'Class whiteboard'}
            className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <p className="mb-1 text-[11px] text-slate-500">
            {picked.length === 0 ? 'Going to everyone in this class.' : `Going to ${picked.length} selected student${picked.length === 1 ? '' : 's'}.`}
          </p>
          <div className="mb-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-1.5">
            {participants.length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-400">No one else is in the room yet.</p>
            )}
            {participants.map((pp) => (
              <label key={pp.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-white">
                <input
                  type="checkbox"
                  checked={picked.includes(pp.id)}
                  onChange={(e) => setPicked((cur) => (e.target.checked ? [...cur, pp.id] : cur.filter((x) => x !== pp.id)))}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                <span className="min-w-0 flex-1 truncate text-slate-700">{pp.name}</span>
              </label>
            ))}
          </div>
          {shareMsg && <p className="mb-2 text-xs font-semibold text-emerald-600">{shareMsg}</p>}
          <div className="flex items-center gap-2">
            <button onClick={shareBoard} disabled={sharing}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {sharing ? 'Sharing…' : picked.length ? 'Send to selected' : 'Send to class'}
            </button>
            <button onClick={() => setShareOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TOOLBAR (admin only) ── */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#202124] flex-wrap z-10 border-b border-white/10">

          {/* Tools */}
          <div className="flex gap-1 bg-white/5 rounded p-1">
            <Btn t="pen"    label="Pen"     emoji="✏️" />
            <Btn t="eraser" label="Eraser"  emoji="🧹" />
            <Btn t="line"   label="Line"    emoji="╱" />
            <Btn t="rect"   label="Rect"    emoji="▭" />
            <Btn t="circle" label="Circle"  emoji="○" />
            <Btn t="text"   label="Text"    emoji="T" />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/20" />

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/20" />

          {/* Sizes */}
          <div className="flex items-center gap-1">
            {SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)}
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${size === s ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
                <div className="rounded-full bg-white" style={{ width: Math.min(s * 1.5, 20), height: Math.min(s * 1.5, 20) }} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/20" />

          {/* Actions */}
          <button onClick={undo}      className="px-2 py-1.5 bg-[#3c4043] hover:bg-[#4a4d51] text-white rounded text-sm" title="Undo">↩</button>
          <button onClick={clearBoard} className="px-2 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm" title="Clear">🗑 Clear</button>
          <button onClick={() => { setShareOpen(v => !v); setShareMsg('') }}
            className="px-2 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded text-sm font-medium"
            title="Send this board to students">
            📤 Share
          </button>
        </div>
      )}

      {/* ── CANVAS ── */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${isAdmin ? (tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}`}
          style={{ background: '#ffffff', touchAction: 'none' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />

        {/* Text input popup */}
        {isAdmin && textPos && (
          <div className="absolute z-20 flex gap-2 shadow-xl"
            style={{ left: textPos.x, top: textPos.y - 40 }}>
            <input
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addText()}
              placeholder="Type text..."
              className="border border-blue-400 rounded px-2 py-1 text-sm outline-none shadow"
              style={{ color, fontSize: size * 4 > 32 ? 32 : size * 4 }}
            />
            <button onClick={addText} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Add</button>
            <button onClick={() => setTextPos(null)} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">✕</button>
          </div>
        )}

        {/* View-only badge */}
        {!isAdmin && (
          <div className="absolute top-3 right-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs px-3 py-1 rounded-full z-10 pointer-events-none">
            👁 View only
          </div>
        )}
      </div>
    </div>
  )
}
