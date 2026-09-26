'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

const WB_CHANNEL = 'wb'          // legacy full-state (host snapshot)
const WB_GRANT   = 'wb-grant'    // host hands drawing rights to identities
const WB_STROKE  = 'wb-stroke'   // one appended stroke
const WB_SYNC    = 'wb-sync'     // "someone please send me the board"
const WB_CLEAR   = 'wb-clear'    // host wiped the board
const COLORS = ['#000000','#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#ffffff']
const SIZES  = [2, 4, 8, 14, 22]

// A participant's metadata is minted server-side into their LiveKit token, so
// it is the only trustworthy claim we have in a client-to-client message.
function senderIsHost(participant) {
  if (!participant) return false
  try {
    return !!JSON.parse(participant.metadata || '{}').isHost
  } catch {
    return false
  }
}

export default function MeetingWhiteboard({ isAdmin, roomName, meetingTitle, participants = [],
  authKey = 'token', boardsApi = '/api/meetings/boards',
  imagesApi = '/api/meetings/board-images', onCanDrawChange }) {
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
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  // People the host handed the board to — they may draw on it.
  const [editors, setEditors] = useState([])          // identities
  const editorsRef = useRef([])
  // Stable per-stroke id: identity + counter, so appends are idempotent.
  const strokeSeq = useRef(0)
  // Decoded images, kept so a redraw (which happens on every stroke) does not
  // re-download or flicker.
  const imgCache = useRef(new Map())
  const [pasting, setPasting] = useState(false)
  const [pasteMsg, setPasteMsg] = useState('')
  const nextStrokeId = () => `${room?.localParticipant?.identity || 'me'}-${Date.now()}-${++strokeSeq.current}`
  useEffect(() => { editorsRef.current = editors }, [editors])
  const myId = room?.localParticipant?.identity || ''
  const canDraw = isAdmin || editors.includes(myId)
  // Let the panel header say something true about the viewer's rights.
  useEffect(() => { onCanDrawChange?.(canDraw) }, [canDraw, onCanDrawChange])
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
    if (!s) return

    // A pasted image. Coordinates are a fraction of the canvas, so it sits in
    // the same place whatever the screen size.
    if (s.tool === 'image' && s.url) {
      const cached = imgCache.current.get(s.url)
      if (cached === undefined) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        // Mark it pending so a redraw storm cannot queue a hundred loads.
        imgCache.current.set(s.url, null)
        img.onload = () => { imgCache.current.set(s.url, img); redraw() }
        img.onerror = () => { imgCache.current.set(s.url, false) }
        img.src = s.url
        return
      }
      if (!cached) return   // still loading, or it failed
      const cw = ctx.canvas.width, ch = ctx.canvas.height
      ctx.drawImage(cached, (s.x || 0) * cw, (s.y || 0) * ch, (s.w || 1) * cw, (s.h || 1) * ch)
      return
    }

    if (!s.pts || s.pts.length === 0) return
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

  // ── send over LiveKit ─────────────────────────────────────────────────────
  const send = useCallback((msg) => {
    if (!room?.localParticipant) return
    try {
      const enc = new TextEncoder().encode(JSON.stringify(msg))
      // LiveKit caps a data packet; a full snapshot of a long lesson can exceed
      // it, so snapshots are chunk-free but bounded and strokes are tiny.
      if (enc.length < 60000) room.localParticipant.publishData(enc, { reliable: true })
      else console.warn('whiteboard payload too large to send:', enc.length)
    } catch (e) {
      console.error('whiteboard send failed:', e)
    }
  }, [room])

  // One finished stroke — appended by every receiver, never replacing anything.
  const broadcastStroke = useCallback((stroke) => {
    if (!canDraw) return
    send({ type: WB_STROKE, stroke })
  }, [send, canDraw])

  // The host's authoritative picture of the board.
  const broadcastSnapshot = useCallback(() => {
    if (!isAdmin) return
    send({ type: WB_CHANNEL, strokes: strokesRef.current })
  }, [send, isAdmin])

  // ── receive ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return
    const handler = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        const fromHost = senderIsHost(participant)

        switch (msg.type) {
          // Only a host may hand out drawing rights. Without this check any
          // student could grant themselves and wipe the board.
          case WB_GRANT:
            if (!fromHost) return
            setEditors(Array.isArray(msg.ids) ? msg.ids : [])
            return

          // A full picture of the board is only believable from the host.
          case WB_CHANNEL:
            if (!fromHost) return
            strokesRef.current = Array.isArray(msg.strokes) ? msg.strokes : []
            redraw()
            return

          case WB_CLEAR:
            if (!fromHost) return
            strokesRef.current = []
            redraw()
            return

          // An append. Idempotent on id, so a replayed or out-of-order packet
          // cannot duplicate or lose work.
          case WB_STROKE: {
            const st = msg.stroke
            if (!st || !st.id) return
            if (strokesRef.current.some((x) => x.id === st.id)) return
            strokesRef.current.push(st)
            redraw()
            return
          }

          // Someone joined or reopened the panel and has nothing. The host —
          // and only the host — answers with the real board.
          case WB_SYNC:
            if (isAdmin) {
              broadcastSnapshot()
              if (editorsRef.current.length) send({ type: WB_GRANT, ids: editorsRef.current })
            }
            return

          default:
            return
        }
      } catch { /* a malformed packet is not worth crashing the board over */ }
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room, redraw, isAdmin, broadcastSnapshot, send])

  // On mount (the panel is opened) ask for the current board. Without this a
  // late viewer stares at a blank canvas while everyone else sees the lesson.
  useEffect(() => {
    if (!room || isAdmin) return
    const t = setTimeout(() => send({ type: WB_SYNC }), 250)
    return () => clearTimeout(t)
  }, [room, isAdmin, send])

  // The host re-announces the board and its editors whenever someone new
  // arrives, so a rejoining student is not silently left out.
  useEffect(() => {
    if (!room || !isAdmin) return
    const onJoin = () => {
      broadcastSnapshot()
      if (editorsRef.current.length) send({ type: WB_GRANT, ids: editorsRef.current })
    }
    room.on(RoomEvent.ParticipantConnected, onJoin)
    return () => room.off(RoomEvent.ParticipantConnected, onJoin)
  }, [room, isAdmin, broadcastSnapshot, send])

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
    if (!canDraw) return
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
    if (!canDraw || !drawing.current || !currentRef.current) return
    const pt = getXY(e)
    currentRef.current.pts.push(pt)
    lastPt.current = pt
    redraw()
  }

  const onUp = () => {
    if (!canDraw || !drawing.current) return
    drawing.current = false
    if (currentRef.current) {
      const stroke = { ...currentRef.current, id: nextStrokeId() }
      strokesRef.current.push(stroke)
      currentRef.current = null
      broadcastStroke(stroke)
    }
    redraw()
  }

  const addText = () => {
    if (!textInput.trim() || !textPos) return
    const stroke = { tool: 'text', color, size, pts: [textPos], text: textInput, id: nextStrokeId() }
    strokesRef.current.push(stroke)
    setTextInput('')
    setTextPos(null)
    broadcastStroke(stroke)
    redraw()
  }

  // Clear and undo rewrite the WHOLE board, so they belong to the host alone —
  // a student undoing would pop the host's last stroke on everyone's screen.
  const clearBoard = () => {
    if (!isAdmin) return
    strokesRef.current = []
    currentRef.current = null
    send({ type: WB_CLEAR })
    redraw()
  }

  const undo = () => {
    if (!isAdmin) return
    strokesRef.current.pop()
    broadcastSnapshot()
    redraw()
  }

  // Drop an image onto the board: upload it, then broadcast only the URL.
  const addImage = useCallback(async (file) => {
    if (!canDraw || !file) return
    setPasting(true); setPasteMsg('')
    try {
      if (!imagesApi) throw new Error('Images are not enabled for this board.')
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result)
        fr.onerror = () => reject(new Error('Could not read that image.'))
        fr.readAsDataURL(file)
      })

      // Shrink before upload: a full-screen grab is several megabytes and the
      // board never needs more than about 1600px.
      const shrunk = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 1600
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          if (scale === 1) return resolve({ url: dataUrl, w: img.width, h: img.height })
          const c = document.createElement('canvas')
          c.width = Math.round(img.width * scale)
          c.height = Math.round(img.height * scale)
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
          resolve({ url: c.toDataURL('image/png'), w: c.width, h: c.height })
        }
        img.onerror = () => resolve({ url: dataUrl, w: 0, h: 0 })
        img.src = dataUrl
      })

      const token = localStorage.getItem(authKey)
      const res = await fetch(imagesApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ image: shrunk.url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not upload that image.')

      // Fit it inside the canvas, keeping its shape, and centre it.
      const canvas = canvasRef.current
      const cw = canvas?.width || 1, chh = canvas?.height || 1
      const iw = shrunk.w || cw, ih = shrunk.h || chh
      const fit = Math.min((cw * 0.8) / iw, (chh * 0.8) / ih, 1)
      const w = (iw * fit) / cw, h = (ih * fit) / chh
      const stroke = {
        id: nextStrokeId(), tool: 'image', url: data.url,
        x: (1 - w) / 2, y: (1 - h) / 2, w, h,
      }
      strokesRef.current.push(stroke)
      redraw()
      broadcastStroke(stroke)
      setPasteMsg('Image added')
      setTimeout(() => setPasteMsg(''), 1500)
    } catch (e) {
      setPasteMsg(e.message)
      setTimeout(() => setPasteMsg(''), 4000)
    } finally {
      setPasting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw, authKey, imagesApi, redraw, broadcastStroke])

  // Ctrl+V anywhere on the page while the board is open.
  useEffect(() => {
    if (!canDraw) return
    const onPaste = (e) => {
      const items = e.clipboardData?.items || []
      for (const it of items) {
        if (it.type?.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) { e.preventDefault(); addImage(file); return }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [canDraw, addImage])

  // Grant or revoke one person's drawing rights and announce it immediately.
  const setRights = useCallback((id, may) => {
    setEditors((cur) => {
      const next = may ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)
      try {
        const enc = new TextEncoder().encode(JSON.stringify({ type: WB_GRANT, ids: next }))
        room?.localParticipant?.publishData(enc, { reliable: true })
      } catch (e) {
        console.error('Could not publish the grant:', e)
      }
      return next
    })
    setShareMsg(may ? 'They can draw now.' : 'Set back to view only.')
  }, [room])

  // Someone who has left cannot draw, and must not be counted as a recipient —
  // a stale id is what made this panel claim more people than were in the room.
  useEffect(() => {
    if (!isAdmin) return
    const present = new Set(participants.map((pp) => pp.id))
    setEditors((cur) => {
      const next = cur.filter((id) => present.has(id))
      return next.length === cur.length ? cur : next
    })
  }, [participants, isAdmin])

  // Flatten the board onto a white background — a transparent PNG looks like an
  // empty image everywhere it is later viewed.
  const shareBoard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSharing(true); setShareMsg('')

    // Hand the board over FIRST — this is the part the room actually feels,
    // and it must not depend on the upload succeeding.
    const grantIds = editorsRef.current.length ? editorsRef.current : participants.map((pp) => pp.id)
    try {
      setEditors(grantIds)
      const enc = new TextEncoder().encode(JSON.stringify({ type: WB_GRANT, ids: grantIds }))
      room?.localParticipant?.publishData(enc, { reliable: true })
    } catch (e) {
      console.error('Could not hand over the board:', e)
    }

    try {
      const flat = document.createElement('canvas')
      flat.width = canvas.width; flat.height = canvas.height
      const fx = flat.getContext('2d')
      fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, flat.width, flat.height)
      fx.drawImage(canvas, 0, 0)
      const image = flat.toDataURL('image/png')

      if (!boardsApi) {
        // This portal has no board archive yet — the live hand-over is the
        // whole feature here, so do not claim a failure.
        setShareMsg('Shared — they can draw on it now ✓')
        setTimeout(() => { setShareOpen(false); setShareMsg('') }, 1800)
        return
      }
      const token = localStorage.getItem(authKey)
      const res = await fetch(boardsApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room: roomName || '',
          title: shareTitle.trim() || meetingTitle || 'Class whiteboard',
          image,
          // Addressed to whoever can draw; nobody selected = the whole class.
          recipients: editorsRef.current,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not share the board.')
      setShareMsg(editorsRef.current.length
        ? `Copy sent to ${editorsRef.current.length} ✓`
        : 'Copy sent to the whole class ✓')
      setTimeout(() => { setShareOpen(false); setShareMsg('') }, 1800)
    } catch (e) {
      // The hand-over already happened; only the saved copy failed.
      setShareMsg(`They can draw on it now, but saving a copy failed: ${e.message}`)
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
          <input
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
            placeholder={meetingTitle || 'Class whiteboard'}
            className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <div className="mb-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-1.5">
            {participants.length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-400">No one else is in the room yet.</p>
            )}
            {participants.map((pp) => {
              const may = editors.includes(pp.id)
              return (
                <div key={pp.id} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-white">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{pp.name}</span>
                  <span className={`text-[10px] font-semibold ${may ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {may ? 'Can draw' : 'View only'}
                  </span>
                  {/* Flips their rights straight away — no Send needed. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={may}
                    onClick={() => setRights(pp.id, !may)}
                    className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${may ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={may ? 'Make view only' : 'Let them draw'}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${may ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )
            })}
          </div>
          {shareMsg && <p className="mb-2 text-xs font-semibold text-emerald-600">{shareMsg}</p>}
          <div className="flex items-center gap-2">
            <button onClick={shareBoard} disabled={sharing}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {sharing ? 'Sending…' : 'Send a copy'}
            </button>
            <button onClick={() => setShareOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── TOOLBAR (admin only) ── */}
      {canDraw && (
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

          {/* Paste a screenshot with Ctrl+V, or pick a file. */}
          <label
            className={`flex cursor-pointer items-center gap-1 rounded bg-white/10 px-2 py-1.5 text-sm text-white transition-colors hover:bg-white/20 ${pasting ? 'opacity-60' : ''}`}
            title="Paste a screenshot (Ctrl+V) or choose an image">
            🖼 {pasting ? 'Adding…' : 'Image'}
            <input type="file" accept="image/*" className="hidden" disabled={pasting}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = '' }} />
          </label>
          {pasteMsg && <span className="text-xs text-emerald-300">{pasteMsg}</span>}

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

          {/* Actions — whole-board operations belong to the host only */}
          {isAdmin && (
            <>
              <button onClick={undo}      className="px-2 py-1.5 bg-[#3c4043] hover:bg-[#4a4d51] text-white rounded text-sm" title="Undo">↩</button>
              <button onClick={clearBoard} className="px-2 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm" title="Clear">🗑 Clear</button>
              <button onClick={() => { setShareOpen(v => !v); setShareMsg('') }}
                className="px-2 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded text-sm font-medium"
                title="Send this board to students">
                📤 Share
              </button>
            </>
          )}
          {!isAdmin && canDraw && (
            <span className="px-2 py-1.5 text-xs font-medium text-emerald-300">You can draw on this board</span>
          )}
        </div>
      )}

      {/* ── CANVAS ── */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${canDraw ? (tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}`}
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
        {canDraw && textPos && (
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
