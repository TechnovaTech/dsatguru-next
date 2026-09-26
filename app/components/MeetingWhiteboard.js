'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

const BoardSnip = dynamic(() => import('./BoardSnip'), { ssr: false })

const WB_CHANNEL = 'wb'          // legacy full-state (host snapshot)
const WB_GRANT   = 'wb-grant'    // host hands drawing rights to identities
const WB_STROKE  = 'wb-stroke'   // one appended stroke
const WB_SYNC    = 'wb-sync'     // "someone please send me the board"
const WB_CLEAR   = 'wb-clear'    // host wiped the board
const WB_UPDATE  = 'wb-update'   // one image moved or was resized
const WB_DELETE  = 'wb-delete'   // one stroke was removed
const COLORS = ['#000000','#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#ffffff']
const SIZES  = [2, 4, 8, 14, 22]
const MIN_IMAGE_PX = 32
// A LiveKit data packet caps out around 60KB and a busy lesson's board is far
// bigger, so snapshots go in pieces. Sized in characters with room for UTF-8 to
// triple them and still fit.
const SNAP_CHUNK = 18000
const HISTORY_LIMIT = 60

// Where the resize grips sit, as a fraction of the selection box.
const HANDLES = [
  { k: 'nw', fx: 0,   fy: 0,   cursor: 'nwse-resize' },
  { k: 'n',  fx: 0.5, fy: 0,   cursor: 'ns-resize'   },
  { k: 'ne', fx: 1,   fy: 0,   cursor: 'nesw-resize' },
  { k: 'e',  fx: 1,   fy: 0.5, cursor: 'ew-resize'   },
  { k: 'se', fx: 1,   fy: 1,   cursor: 'nwse-resize' },
  { k: 's',  fx: 0.5, fy: 1,   cursor: 'ns-resize'   },
  { k: 'sw', fx: 0,   fy: 1,   cursor: 'nesw-resize' },
  { k: 'w',  fx: 0,   fy: 0.5, cursor: 'ew-resize'   },
]

// Where an image actually sits on the canvas, in pixels.
//
// x, y and w are fractions of the canvas so a picture lands in the same place
// on a laptop and a phone. Height is NOT: taking it as a fraction of the canvas
// height stretched every image whenever the board changed shape - which it does
// every time the tutor flips between split view and full screen. It comes from
// `sar`, the on-screen aspect ratio the image was last given, so the picture
// keeps its shape. Strokes made before `sar` existed fall back to the old box.
function imageRect(st, cw, ch) {
  const x = (st.x || 0) * cw
  const y = (st.y || 0) * ch
  const bw = (st.w || 1) * cw
  const bh = (st.h || 1) * ch
  if (!(st.sar > 0)) return { x, y, w: bw, h: bh }   // made before `sar` existed
  // Fit the picture's shape INSIDE the box it was given. Taking the height from
  // `sar` alone scaled it by the board's width in both directions, so widening
  // the panel - which the full-screen and chat toggles both do - pushed it off
  // the bottom. While the board's proportions are unchanged bh * sar === bw, so
  // this is bit-identical in the ordinary case.
  const w = Math.min(bw, bh * st.sar)
  return { x, y, w, h: w / st.sar }
}

// Stroke ids are minted as "<identity>-<time>-<n>", which makes ownership
// something a receiver can check without trusting the sender's word for it.
function strokeOwnedBy(st, identity) {
  return !!st && !!identity && typeof st.id === 'string' && st.id.startsWith(identity + '-')
}

// Declared out here on purpose. A component defined inside another is a new
// type on every render, so React throws the old one away and builds it again -
// and the board now re-renders on every frame of a drag.
function ToolBtn({ t, label, emoji, tool, setTool }) {
  return (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`px-2 py-1.5 rounded text-sm font-medium transition-all ${tool === t ? 'bg-blue-600 text-white shadow' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {emoji}
    </button>
  )
}

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
  imagesApi = '/api/meetings/board-images',
  pushApi = '/api/meetings/board-push', onCanDrawChange }) {
  const room        = useRoomContext()
  const canvasRef   = useRef(null)
  const drawing     = useRef(false)
  const lastPt      = useRef(null)
  const strokesRef  = useRef([])   // [{tool,color,size,pts:[{x,y}]}]
  const currentRef  = useRef(null)

  const [tool,  setTool]  = useState('pen')   // select | pen | eraser | line | rect | circle | text
  // The picked-up image, and its box in canvas pixels for the DOM overlay.
  const [selectedId, setSelectedId] = useState(null)
  const selectedIdRef = useRef(null)
  const [selBox, setSelBox] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const dragRef = useRef(null)
  const lastGeomSend = useRef(0)
  // Saved board states. Snapshots rather than "pop the last stroke", because a
  // move is not a stroke and popping deleted other people's work.
  const undoStack = useRef([])
  const redoStack = useRef([])
  const snapSeq = useRef(0)
  const snapBuf = useRef({ seq: null, parts: 0, got: [] })
  const [histDepth, setHistDepth] = useState({ undo: 0, redo: 0 })
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
  const [snipping, setSnipping] = useState(false)
  // "Snip from anywhere" — see the routes described at the top of this patch.
  const [snipPanel, setSnipPanel] = useState(false)
  const [autoClip, setAutoClip] = useState(false)
  const lastClipRef = useRef('')
  const [pushCode, setPushCode] = useState('')
  const [helperCmd, setHelperCmd] = useState('')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushCount, setPushCount] = useState(0)
  const [copied, setCopied] = useState(false)
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

  // Keep the overlay box on top of wherever the image now is.
  const refreshSel = useCallback((id) => {
    const want = id === undefined ? selectedIdRef.current : id
    const canvas = canvasRef.current
    const st = want ? strokesRef.current.find((x) => x.id === want) : null
    if (!st || !canvas || st.tool !== 'image') { setSelBox(null); return }
    const r = imageRect(st, canvas.width, canvas.height)
    setSelBox({ left: r.x, top: r.y, width: r.w, height: r.h, cw: canvas.width, ch: canvas.height })
  }, [])

  const selectImage = useCallback((id) => {
    selectedIdRef.current = id || null
    setSelectedId(id || null)
    refreshSel(id || null)
  }, [refreshSel])

  // Save the board before a local change, so it can be walked back.
  const pushHistory = useCallback(() => {
    undoStack.current.push(strokesRef.current.slice())
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
    setHistDepth({ undo: undoStack.current.length, redo: 0 })
  }, [])

  // A change from someone else has to land in the saved states too. Without
  // this, undoing after a student drew would quietly delete their stroke,
  // because the state being restored predates it.
  const rebaseHistory = useCallback((fn) => {
    undoStack.current = undoStack.current.map(fn)
    redoStack.current = redoStack.current.map(fn)
  }, [])

  // Two staff in one room are both hosts. When the other one replaces the whole
  // board, the states saved here describe something nobody is looking at any
  // more - stepping back into one would drag the room with it.
  const resetHistory = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    snapBuf.current = { seq: null, parts: 0, got: [] }
    setHistDepth({ undo: 0, redo: 0 })
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
      const r = imageRect(s, ctx.canvas.width, ctx.canvas.height)
      ctx.drawImage(cached, r.x, r.y, r.w, r.h)
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
    const json = JSON.stringify(strokesRef.current)
    if (json.length <= SNAP_CHUNK) {
      send({ type: WB_CHANNEL, strokes: strokesRef.current })
      return
    }
    // Too big for one packet. Until this existed the send was simply dropped,
    // which meant that on a busy board undo never reached the room and a late
    // joiner asking for the lesson got nothing back.
    const seq = ++snapSeq.current
    const parts = Math.ceil(json.length / SNAP_CHUNK)
    for (let i = 0; i < parts; i++) {
      send({ type: WB_CHANNEL, seq, part: i, parts, chunk: json.slice(i * SNAP_CHUNK, (i + 1) * SNAP_CHUNK) })
    }
  }, [send, isAdmin])

  // ── receive ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return
    // Metadata minted into the sender's token says who is host; the host's
    // grant list says who else may draw. A view-only viewer's packets were
    // being taken at face value, which let anyone with the join link draw on
    // everybody's board.
    const senderMayDraw = (participant, fromHost) => (
      fromHost || (!!participant?.identity && editorsRef.current.includes(participant.identity))
    )
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
          case WB_CHANNEL: {
            if (!fromHost) return
            let list = null
            if (Array.isArray(msg.strokes)) {
              list = msg.strokes
            } else if (msg.parts > 0) {
              // A snapshot in pieces. Reliable delivery keeps one sender's
              // packets in order, so a new seq simply supersedes the last.
              const buf = snapBuf.current
              if (buf.seq !== msg.seq) snapBuf.current = { seq: msg.seq, parts: msg.parts, got: [] }
              snapBuf.current.got[msg.part] = String(msg.chunk || '')
              const have = snapBuf.current.got.filter((c) => typeof c === 'string').length
              if (have < snapBuf.current.parts) return
              try { list = JSON.parse(snapBuf.current.got.join('')) } catch { return }
              snapBuf.current = { seq: null, parts: 0, got: [] }
            }
            if (!Array.isArray(list)) return
            strokesRef.current = list
            resetHistory()
            redraw()
            // The picture being held may not have survived the host's version.
            const keep = strokesRef.current.some((x) => x.id === selectedIdRef.current)
            if (!keep) selectImage(null); else refreshSel()
            return
          }

          case WB_CLEAR:
            if (!fromHost) return
            strokesRef.current = []
            resetHistory()
            selectImage(null)
            redraw()
            return

          // An image moved or was resized. Only the host, or whoever put it
          // there, may say so.
          case WB_UPDATE: {
            const up = msg.stroke
            if (!up || !up.id) return
            const idx = strokesRef.current.findIndex((x) => x.id === up.id)
            if (idx < 0) return
            if (!senderMayDraw(participant, fromHost)) return
            if (!fromHost && !strokeOwnedBy(strokesRef.current[idx], participant?.identity)) return
            const geom = { x: up.x, y: up.y, w: up.w, h: up.h, sar: up.sar }
            strokesRef.current[idx] = { ...strokesRef.current[idx], ...geom }
            // Only once the drag is over: rewriting every saved state on every
            // frame of someone else's drag is real work for no benefit.
            if (msg.final) rebaseHistory((list) => list.map((x) => (x.id === up.id ? { ...x, ...geom } : x)))
            redraw()
            if (up.id === selectedIdRef.current) refreshSel()
            return
          }

          case WB_DELETE: {
            const id = msg.id
            if (!id) return
            const victim = strokesRef.current.find((x) => x.id === id)
            if (!victim) return
            if (!senderMayDraw(participant, fromHost)) return
            if (!fromHost && !strokeOwnedBy(victim, participant?.identity)) return
            strokesRef.current = strokesRef.current.filter((x) => x.id !== id)
            rebaseHistory((list) => list.filter((x) => x.id !== id))
            if (id === selectedIdRef.current) selectImage(null)
            redraw()
            return
          }

          // An append. Idempotent on id, so a replayed or out-of-order packet
          // cannot duplicate or lose work.
          case WB_STROKE: {
            const st = msg.stroke
            if (!st || !st.id) return
            if (!senderMayDraw(participant, fromHost)) return
            if (strokesRef.current.some((x) => x.id === st.id)) return
            strokesRef.current.push(st)
            rebaseHistory((list) => (list.some((x) => x.id === st.id) ? list : [...list, st]))
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
  }, [room, redraw, isAdmin, broadcastSnapshot, send, rebaseHistory, resetHistory, refreshSel, selectImage])

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
      refreshSel()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [redraw, refreshSel])

  // ── pointer helpers ───────────────────────────────────────────────────────
  const getXY = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  // Only the host may rearrange everyone's board; anyone else may move the
  // pictures they added themselves. Enforced here as well as on the receiving
  // side, so a student never watches an image move and then snap back.
  const canEditStroke = useCallback((st) => (
    !!st && st.tool === 'image' && (isAdmin || strokeOwnedBy(st, myId))
  ), [isAdmin, myId])

  // Topmost image under the pointer.
  const hitImage = useCallback((px, py) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    for (let i = strokesRef.current.length - 1; i >= 0; i--) {
      const st = strokesRef.current[i]
      if (!canEditStroke(st)) continue
      const r = imageRect(st, canvas.width, canvas.height)
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return st
    }
    return null
  }, [canEditStroke])

  // Write a new geometry, redraw, and tell the room. Throttled while a drag is
  // in flight so a fast mouse cannot flood the data channel, and always sent
  // once more when the drag ends so everyone finishes on the same numbers.
  const commitGeom = useCallback((id, px, py, pw, ph, final) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const idx = strokesRef.current.findIndex((x) => x.id === id)
    if (idx < 0) return
    const geom = {
      x: px / canvas.width,
      y: py / canvas.height,
      w: pw / canvas.width,
      h: ph / canvas.height,
      sar: pw / (ph || 1),
    }
    // A NEW object every time: the saved states hold references to these, and
    // editing one in place would rewrite history as well as the board.
    strokesRef.current[idx] = { ...strokesRef.current[idx], ...geom }
    redraw()
    refreshSel(id)
    const now = Date.now()
    if (canDraw && (final || now - lastGeomSend.current > 110)) {
      lastGeomSend.current = now
      send({ type: WB_UPDATE, final: !!final, stroke: { id, ...geom } })
    }
  }, [redraw, refreshSel, send, canDraw])

  const beginDrag = useCallback((e, mode, stroke) => {
    const canvas = canvasRef.current
    const st = stroke || strokesRef.current.find((x) => x.id === selectedIdRef.current)
    if (!canvas || !canEditStroke(st)) return
    const box = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    const rect = imageRect(st, canvas.width, canvas.height)
    dragRef.current = {
      mode, id: st.id, rect, saved: false,
      ar: rect.w / (rect.h || 1),
      startX: src.clientX - box.left,
      startY: src.clientY - box.top,
    }
    setDragActive(true)
  }, [canEditStroke])

  // Live drag maths, in canvas pixels; commitGeom normalises on the way out.
  const applyDrag = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    const d = dragRef.current
    if (!canvas || !d) return
    // Let go of the picture (Escape) and the drag stops here, rather than
    // carrying on moving something nobody is holding.
    if (selectedIdRef.current !== d.id) return
    // Saved on the first real movement, so picking a picture up and putting it
    // straight back down does not leave a do-nothing step in the history.
    if (!d.saved) { d.saved = true; pushHistory() }
    const box = canvas.getBoundingClientRect()
    const dx = (clientX - box.left) - d.startX
    const dy = (clientY - box.top) - d.startY
    let { x, y, w, h } = d.rect

    if (d.mode === 'move') {
      // Never park a picture where no pointer can reach it again: a grabbable
      // strip of it always stays on the board.
      const keep = Math.min(MIN_IMAGE_PX, w, h)
      x = Math.min(Math.max(x + dx, keep - w), canvas.width - keep)
      y = Math.min(Math.max(y + dy, keep - h), canvas.height - keep)
    } else {
      if (d.mode.includes('w')) w = d.rect.w - dx
      if (d.mode.includes('e')) w = d.rect.w + dx
      if (d.mode.includes('n')) h = d.rect.h - dy
      if (d.mode.includes('s')) h = d.rect.h + dy

      if (d.mode.length === 2) {
        // A corner keeps the picture's shape, driven by whichever axis the hand
        // moved further - measured in the SAME units, or the axis in charge
        // flips at the wrong moment and a wide picture jumps sideways.
        const ar = d.ar > 0 ? d.ar : 1
        if (Math.abs(w - d.rect.w) >= Math.abs(h - d.rect.h) * ar) h = w / ar
        else w = h * ar
        // The size floor has to move BOTH axes together. Clamping them
        // separately undoes the lock above, and the squash is what `sar`
        // remembers - permanently.
        const minW = MIN_IMAGE_PX * Math.max(1, ar)
        if (w < minW) { w = minW; h = w / ar }
      } else {
        if (w < MIN_IMAGE_PX) w = MIN_IMAGE_PX
        if (h < MIN_IMAGE_PX) h = MIN_IMAGE_PX
      }

      // Anchor the far side to the FINAL size. Deriving it before the clamp let
      // a shrink past the opposite corner turn into an unbounded slide that
      // pushed the picture off the board for good.
      x = d.mode.includes('w') ? d.rect.x + d.rect.w - w : d.rect.x
      y = d.mode.includes('n') ? d.rect.y + d.rect.h - h : d.rect.y
    }
    commitGeom(d.id, x, y, w, h, false)
  }, [commitGeom, pushHistory])

  const endDrag = useCallback(() => {
    const d = dragRef.current
    dragRef.current = null
    setDragActive(false)
    if (!d) return
    const st = strokesRef.current.find((x) => x.id === d.id)
    if (st && canDraw) {
      send({ type: WB_UPDATE, final: true, stroke: { id: st.id, x: st.x, y: st.y, w: st.w, h: st.h, sar: st.sar } })
    }
  }, [send, canDraw])

  // Bound to the window, not the canvas: a drag that runs off the edge of the
  // board - or onto one of the handles - must keep working.
  useEffect(() => {
    if (!dragActive) return
    const move = (e) => {
      // Released over the browser's own chrome, so no mouseup ever reached the
      // page. The button being up is the signal that the drag is over.
      if (!e.touches && e.buttons === 0) { endDrag(); return }
      const src = e.touches ? e.touches[0] : e
      if (e.cancelable) e.preventDefault()
      applyDrag(src.clientX, src.clientY)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', endDrag)
    window.addEventListener('touchcancel', endDrag)
    window.addEventListener('blur', endDrag)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', endDrag)
      window.removeEventListener('touchcancel', endDrag)
      window.removeEventListener('blur', endDrag)
    }
  }, [dragActive, applyDrag, endDrag])

  // Putting a tool down lets go of whatever was held.
  useEffect(() => { if (tool !== 'select') selectImage(null) }, [tool, selectImage])

  const onDown = (e) => {
    if (!canDraw) return
    if (tool === 'select') {
      const pt = getXY(e)
      const hit = hitImage(pt.x, pt.y)
      if (!hit) { selectImage(null); return }
      selectImage(hit.id)
      beginDrag(e, 'move', hit)
      return
    }
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
    // No tool check: in select mode drawing.current is never set, and a stroke
    // already in flight when a snip flipped the tool must still finish.
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
      const pts = currentRef.current.pts || []
      if (pts.length < 2) {
        // A click rather than a drag. For the pen that is a deliberate dot; for
        // a shape it is a stray click, and saving it would spend the next undo
        // on something nobody can see.
        if (currentRef.current.tool === 'pen' || currentRef.current.tool === 'eraser') {
          pts.push({ ...pts[0] })
        } else {
          currentRef.current = null
          redraw()
          return
        }
      }
      pushHistory()
      const stroke = { ...currentRef.current, id: nextStrokeId() }
      strokesRef.current.push(stroke)
      currentRef.current = null
      broadcastStroke(stroke)
    }
    redraw()
  }

  const addText = () => {
    if (!textInput.trim() || !textPos) return
    pushHistory()
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
    pushHistory()
    strokesRef.current = []
    currentRef.current = null
    selectImage(null)
    send({ type: WB_CLEAR })
    redraw()
  }

  // Step between saved states. Host only, because the way a whole board is
  // published is the host snapshot - a student stepping back would have no way
  // to tell the room, and their screen would drift out of step with everyone.
  const stepHistory = useCallback((back) => {
    if (!isAdmin) return
    const from = back ? undoStack.current : redoStack.current
    const to   = back ? redoStack.current : undoStack.current
    if (!from.length) return
    // A drag still in flight would re-apply its own geometry over the state
    // being restored, and its "already saved" flag would swallow the save the
    // rest of the gesture needs - so let go of the picture first.
    if (dragRef.current) { dragRef.current = null; setDragActive(false) }
    to.push(strokesRef.current.slice())
    strokesRef.current = from.pop()
    setHistDepth({ undo: undoStack.current.length, redo: redoStack.current.length })
    const keep = strokesRef.current.some((x) => x.id === selectedIdRef.current)
    if (!keep) selectImage(null); else refreshSel()
    broadcastSnapshot()
    redraw()
  }, [isAdmin, broadcastSnapshot, redraw, refreshSel, selectImage])

  const undo = useCallback(() => stepHistory(true), [stepHistory])
  const redo = useCallback(() => stepHistory(false), [stepHistory])

  const deleteSelected = useCallback(() => {
    const id = selectedIdRef.current
    const st = id ? strokesRef.current.find((x) => x.id === id) : null
    if (!canEditStroke(st)) return
    pushHistory()
    strokesRef.current = strokesRef.current.filter((x) => x.id !== id)
    selectImage(null)
    redraw()
    if (canDraw) send({ type: WB_DELETE, id })
  }, [canEditStroke, pushHistory, selectImage, redraw, send, canDraw])

  // Front and back reorder the whole board, so like clear and undo they are the
  // host's to do.
  const reorderSelected = useCallback((toFront) => {
    if (!isAdmin) return
    const id = selectedIdRef.current
    const idx = strokesRef.current.findIndex((x) => x.id === id)
    if (idx < 0) return
    pushHistory()
    const next = strokesRef.current.slice()
    const [st] = next.splice(idx, 1)
    if (toFront) next.push(st); else next.unshift(st)
    strokesRef.current = next
    redraw()
    refreshSel(id)
    broadcastSnapshot()
  }, [isAdmin, pushHistory, redraw, refreshSel, broadcastSnapshot])

  // Put an already-uploaded image on the board, centred and fitted. Shared by
  // the paste/upload path and by snips that arrive from the desktop helper
  // (which are uploaded by the helper, so only the URL reaches us).
  const placeImage = useCallback(async (url, knownW, knownH) => {
    let iw = knownW, ih = knownH
    if (!iw || !ih) {
      const dims = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.width, h: img.height })
        img.onerror = () => resolve(null)
        img.src = url
      })
      if (!dims) return
      iw = dims.w; ih = dims.h
    }
    const canvas = canvasRef.current
    const cw = canvas?.width || 1, chh = canvas?.height || 1
    const fit = Math.min((cw * 0.8) / iw, (chh * 0.8) / ih, 1)
    const w = (iw * fit) / cw, h = (ih * fit) / chh
    const stroke = {
      id: nextStrokeId(), tool: 'image', url,
      x: (1 - w) / 2, y: (1 - h) / 2, w, h,
      // The shape to keep when the board changes size. Set here as well as on
      // resize, or a picture would draw from its stretchy box until the first
      // time somebody happened to move it.
      sar: iw / ih,
    }
    pushHistory()
    strokesRef.current.push(stroke)
    redraw()
    broadcastStroke(stroke)
    // Hand it straight over ready to be moved - positioning a snip is almost
    // always the next thing the tutor does.
    setTool('select')
    selectImage(stroke.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw, broadcastStroke, pushHistory, selectImage])

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

      await placeImage(data.url, shrunk.w, shrunk.h)
      setPasteMsg('Image added')
      setTimeout(() => setPasteMsg(''), 1500)
    } catch (e) {
      setPasteMsg(e.message)
      setTimeout(() => setPasteMsg(''), 4000)
    } finally {
      setPasting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw, authKey, imagesApi, placeImage])

  // ── Snip from anywhere ────────────────────────────────────────────────
  // Nothing on the web can read another window on the machine, so both routes
  // below start with the snipping tool the operating system already has.

  // Whatever image is on the clipboard right now, with a fingerprint so the
  // same snip is never inserted twice.
  const readClipImage = useCallback(async () => {
    if (!navigator.clipboard?.read) throw new Error('unsupported')
    const items = await navigator.clipboard.read()
    for (const it of items) {
      const type = it.types.find((t) => t.startsWith('image/'))
      if (!type) continue
      const blob = await it.getType(type)
      const buf = await blob.arrayBuffer()
      const d = await crypto.subtle.digest('SHA-256', buf)
      const hash = Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('')
      return { blob, hash }
    }
    return null
  }, [])

  // Turning it on has to happen inside the click: the permission prompt needs
  // that gesture, and a prompt raised from a timer is refused outright.
  const enableAutoClip = useCallback(async () => {
    try {
      const current = await readClipImage()
      // Do not fire on whatever happened to be copied before this was armed.
      lastClipRef.current = current?.hash || ''
      setAutoClip(true)
      setPasteMsg('Watching for snips')
      setTimeout(() => setPasteMsg(''), 2000)
    } catch (e) {
      setPasteMsg(e?.message === 'unsupported'
        ? 'This browser cannot read the clipboard — use Ctrl+V instead.'
        : 'Clipboard access was blocked. Allow it from the icon in the address bar.')
      setTimeout(() => setPasteMsg(''), 5000)
    }
  }, [readClipImage])

  // The clipboard is only readable while this tab has focus, so the moment it
  // comes forward is exactly when a fresh snip is waiting.
  useEffect(() => {
    if (!autoClip || !canDraw) return
    let alive = true
    const check = async () => {
      if (!alive || document.visibilityState !== 'visible' || !document.hasFocus()) return
      try {
        const found = await readClipImage()
        if (!alive || !found || found.hash === lastClipRef.current) return
        lastClipRef.current = found.hash
        addImage(new File([found.blob], 'snip.png', { type: found.blob.type || 'image/png' }))
      } catch (e) {
        // Losing the permission is worth saying once; a momentary read failure
        // while another app holds the clipboard is not.
        if (e?.name === 'NotAllowedError' && document.hasFocus()) {
          setAutoClip(false)
          setPasteMsg('Clipboard access was withdrawn.')
          setTimeout(() => setPasteMsg(''), 4000)
        }
      }
    }
    const id = setInterval(check, 1200)
    window.addEventListener('focus', check)
    check()
    return () => { alive = false; clearInterval(id); window.removeEventListener('focus', check) }
  }, [autoClip, canDraw, readClipImage, addImage])

  // Link a desktop helper to this room: it posts snips straight to the board,
  // so the meeting tab never has to come forward at all.
  const linkHelper = useCallback(async () => {
    setPushBusy(true)
    try {
      const token = localStorage.getItem(authKey)
      const res = await fetch(`${pushApi}/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ room: roomName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not set up the helper.')
      setPushCode(data.code)
      setHelperCmd(`irm "${window.location.origin}${pushApi}/helper?code=${data.code}" | iex`)
    } catch (e) {
      setPasteMsg(e.message)
      setTimeout(() => setPasteMsg(''), 5000)
    } finally {
      setPushBusy(false)
    }
  }, [authKey, pushApi, roomName])

  // Collect what the helper has sent. Only runs once a helper is actually
  // linked, so a room that never uses one costs nothing.
  useEffect(() => {
    if (!pushCode || !canDraw) return
    let alive = true
    const tick = async () => {
      try {
        const token = localStorage.getItem(authKey)
        const res = await fetch(`${pushApi}?code=${encodeURIComponent(pushCode)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok || !alive) return
        const data = await res.json().catch(() => ({}))
        for (const push of data?.pushes || []) {
          if (!alive) return
          await placeImage(push.url)
          setPushCount((n) => n + 1)
        }
      } catch {
        // A dropped poll just means we collect on the next one.
      }
    }
    const id = setInterval(tick, 1800)
    tick()
    return () => { alive = false; clearInterval(id) }
  }, [pushCode, canDraw, authKey, pushApi, placeImage])

  // The board stays mounted while the panel is shut so a student is never left
  // staring at a blank canvas - which means every shortcut below has to check
  // that it is actually on screen before acting.
  const boardVisible = () => !!canvasRef.current && canvasRef.current.offsetParent !== null

  useEffect(() => {
    if (!canDraw) return
    const onKey = (e) => {
      if (!boardVisible()) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      const key = (e.key || '').toLowerCase()
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
        if (key === 'y') { e.preventDefault(); redo(); return }
        return
      }
      if (e.key === 'Escape') { selectImage(null); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        e.preventDefault(); deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canDraw, undo, redo, selectImage, deleteSelected])

  // Ctrl+V anywhere on the page while the board is open.
  useEffect(() => {
    if (!canDraw) return
    const onPaste = (e) => {
      if (!boardVisible()) return
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


  return (
    <div className="w-full h-full flex flex-col bg-white relative">

      {/* ── SNIP PANEL ── */}
      {canDraw && snipPanel && (
        <div className="absolute left-3 top-14 z-30 w-[23rem] max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Snip from anywhere</span>
            <button onClick={() => setSnipPanel(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
          </div>

          <div className="mb-2.5 rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">Auto-paste snips</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Press <b>Win+Shift+S</b> on any screen and drag. Come back to this tab and it is already on the board.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoClip}
                onClick={() => (autoClip ? setAutoClip(false) : enableAutoClip())}
                className={`relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors ${autoClip ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title={autoClip ? 'Stop watching the clipboard' : 'Watch the clipboard for snips'}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoClip ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="mb-2.5 rounded-lg border border-slate-200 p-2.5">
            <p className="text-xs font-semibold text-slate-800">Desktop helper — stay in your game</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              Snips land on the board without switching back to this tab. Windows only; nothing is installed.
            </p>
            {!pushCode ? (
              <button onClick={linkHelper} disabled={pushBusy}
                className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                {pushBusy ? 'Setting up…' : 'Set it up'}
              </button>
            ) : (
              <div className="mt-2">
                <p className="mb-1 text-[11px] text-slate-500">Run this once in <b>Windows PowerShell</b>:</p>
                <div className="flex items-center gap-1">
                  <code className="min-w-0 flex-1 truncate rounded bg-slate-900 px-2 py-1.5 text-[10px] text-emerald-300" title={helperCmd}>{helperCmd}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(helperCmd)
                      setCopied(true); setTimeout(() => setCopied(false), 1500)
                    }}
                    className="flex-shrink-0 rounded bg-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300">
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">
                  ● Listening{pushCount > 0 ? ` — ${pushCount} snip${pushCount > 1 ? 's' : ''} received` : ''}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-amber-600">
                  While the helper runs, every image you copy goes to the board. Press P in its window to pause it.
                </p>
              </div>
            )}
          </div>

          <button onClick={() => { setSnipPanel(false); setSnipping(true) }}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            Capture a screen instead
          </button>
          <p className="mt-1.5 text-center text-[10px] leading-snug text-slate-400">
            A web page cannot read another window on its own, so that one asks which screen to share.
          </p>
        </div>
      )}

      {snipping && (
        <BoardSnip
          onInsert={(blob) => addImage(new File([blob], 'snip.png', { type: 'image/png' }))}
          onClose={() => setSnipping(false)}
        />
      )}

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
            <ToolBtn t="select" label="Select — move and resize a picture" emoji="↖" tool={tool} setTool={setTool} />
            <ToolBtn t="pen"    label="Pen"    emoji="✏️" tool={tool} setTool={setTool} />
            <ToolBtn t="eraser" label="Eraser" emoji="🧹" tool={tool} setTool={setTool} />
            <ToolBtn t="line"   label="Line"   emoji="╱"  tool={tool} setTool={setTool} />
            <ToolBtn t="rect"   label="Rect"   emoji="▭"  tool={tool} setTool={setTool} />
            <ToolBtn t="circle" label="Circle" emoji="○"  tool={tool} setTool={setTool} />
            <ToolBtn t="text"   label="Text"   emoji="T"  tool={tool} setTool={setTool} />
          </div>

          {/* Paste a screenshot with Ctrl+V, or pick a file. */}
          <label
            className={`flex cursor-pointer items-center gap-1 rounded bg-white/10 px-2 py-1.5 text-sm text-white transition-colors hover:bg-white/20 ${pasting ? 'opacity-60' : ''}`}
            title="Paste a screenshot (Ctrl+V) or choose an image">
            🖼 {pasting ? 'Adding…' : 'Image'}
            <input type="file" accept="image/*" className="hidden" disabled={pasting}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = '' }} />
          </label>
          <button
            type="button"
            onClick={() => setSnipPanel((v) => !v)}
            className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm text-white transition-colors ${
              snipPanel ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Snip any part of your screen straight onto the board">
            ✂️ Snip
            {(autoClip || pushCode) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>
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
              <button onClick={undo} disabled={!histDepth.undo}
                className="rounded bg-[#3c4043] px-2 py-1.5 text-sm text-white hover:bg-[#4a4d51] disabled:cursor-not-allowed disabled:opacity-40"
                title="Undo (Ctrl+Z)">↩</button>
              <button onClick={redo} disabled={!histDepth.redo}
                className="rounded bg-[#3c4043] px-2 py-1.5 text-sm text-white hover:bg-[#4a4d51] disabled:cursor-not-allowed disabled:opacity-40"
                title="Redo (Ctrl+Shift+Z)">↪</button>
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
          className={`absolute inset-0 ${!canDraw ? 'cursor-default'
            : tool === 'select' ? 'cursor-default'
            : tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
          style={{ background: '#ffffff', touchAction: 'none' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />

        {/* ── SELECTED PICTURE ──
            Handles live in the DOM rather than on the canvas: the board is
            flattened with toDataURL when it is shared, and anything painted on
            the canvas would be baked into that saved picture. */}
        {canDraw && tool === 'select' && selBox && (
          <>
            <div className="pointer-events-none absolute z-10 border-2 border-blue-500"
              style={{ left: selBox.left, top: selBox.top, width: selBox.width, height: selBox.height }} />
            <div className="absolute z-10"
              style={{ left: selBox.left, top: selBox.top, width: selBox.width, height: selBox.height,
                       cursor: 'move', touchAction: 'none' }}
              onMouseDown={(e) => { e.preventDefault(); beginDrag(e, 'move') }}
              onTouchStart={(e) => beginDrag(e, 'move')} />
            {HANDLES.map((hd) => (
              <div key={hd.k}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); beginDrag(e, hd.k) }}
                onTouchStart={(e) => { e.stopPropagation(); beginDrag(e, hd.k) }}
                className="absolute z-20 rounded-full border-2 border-white bg-blue-500 shadow"
                style={{
                  width: 13, height: 13, cursor: hd.cursor, touchAction: 'none',
                  left: selBox.left + hd.fx * selBox.width - 6.5,
                  top:  selBox.top  + hd.fy * selBox.height - 6.5,
                }} />
            ))}
            {/* Kept inside the board. Stretch a diagram to fill the canvas and
                this used to sit past the bottom edge, where overflow-hidden
                clipped it away along with the only route to Front and Back. */}
            <div className="absolute z-20 flex items-center gap-1 rounded-lg bg-[#202124] px-1.5 py-1 shadow-xl"
              style={{
                left: Math.min(Math.max(4, selBox.left), Math.max(4, selBox.cw - (isAdmin ? 236 : 124))),
                top: selBox.top > 40
                  ? selBox.top - 36
                  : Math.min(selBox.top + selBox.height + 8, selBox.ch - 40),
              }}>
              {isAdmin && (
                <>
                  <button onClick={() => reorderSelected(true)} title="Bring to front"
                    className="rounded px-2 py-1 text-xs text-white hover:bg-white/15">⬆ Front</button>
                  <button onClick={() => reorderSelected(false)} title="Send to back"
                    className="rounded px-2 py-1 text-xs text-white hover:bg-white/15">⬇ Back</button>
                  <span className="h-4 w-px bg-white/20" />
                </>
              )}
              <button onClick={deleteSelected} title="Remove this picture (Delete)"
                className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/20">🗑 Remove</button>
              <button onClick={() => selectImage(null)} title="Deselect (Esc)"
                className="rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/15">✕</button>
            </div>
          </>
        )}

        {/* Nothing picked up yet — say what the tool is for. */}
        {canDraw && tool === 'select' && !selBox && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white">
            Click a picture to move or resize it
          </div>
        )}

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
