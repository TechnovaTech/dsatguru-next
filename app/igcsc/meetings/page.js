'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  FiVideo, FiPlus, FiTrash2, FiCopy, FiCheck, FiClock, FiUsers, FiLink,
} from 'react-icons/fi'
import { apiGet, apiSend } from '../_components/api'
import { igcscUser, IG_TOKEN } from '../_components/auth'
import { PageHeader, Card, Loading, EmptyState, ErrorState, Badge } from '../_components/ui'
import { MEETING_TYPES, meetingState, typeInfo } from '../../../lib/meetingStatus'

const LiveKitMeeting = dynamic(() => import('../../components/LiveKitMeeting'), { ssr: false })

const DIFF_TONE = { live: 'green', upcoming: 'amber', ended: 'slate', cancelled: 'red', undated: 'blue' }
const CURRICULA = ['IGCSE', 'IBDP', 'A-Level', 'US Curriculum', 'Competition', 'Other']

// Turn a Date into the value a datetime-local input wants (local, no zone).
function toLocalInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://dsatguru.com')
const studentLink = (m) => `${origin()}/igcsc/join/${encodeURIComponent(m.roomName || '')}`
const guestLink = (m) => `${studentLink(m)}?g=${encodeURIComponent(m.guestAccess?.code || '')}`

// Declared at module scope on purpose. Defined inside the page it was a new
// component type on every render, so React threw the row away and rebuilt it
// on each keystroke - and the title input lost focus after one character.
function Row({ m, isStaff, busyId, copied, patch, remove, copy, onJoin, onTitleInput }) {
  const ti = typeInfo(m)
  const st = m._s
  return (
    <div className={`border p-4 ${st.canJoin ? 'border-positive/40 bg-positive/5' : 'border-line bg-surface'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isStaff ? (
            <input
              value={m.title || ''}
              onChange={(e) => onTitleInput(m._id, e.target.value)}
              onBlur={(e) => patch(m._id, { title: e.target.value })}
              className="w-full border border-transparent bg-transparent px-1 py-0.5 text-base font-semibold text-ink outline-none hover:border-line focus:border-ink focus:bg-surface"
            />
          ) : (
            <p className="text-base font-semibold text-ink">{m.title}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 font-code text-[11px] text-muted">
            <span>{ti.icon} {ti.label}</span>
            {m.subject && <span>· {m.subject}</span>}
            {m.curriculum && <span>· {m.curriculum}</span>}
            {st.start && <span>· {st.start.toLocaleString()}</span>}
            <span>· {m.durationMinutes} min</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge tone={DIFF_TONE[st.state] || 'slate'}>{st.label}</Badge>
          {st.canJoin ? (
            <button onClick={() => onJoin(m)}
              className="flex items-center gap-1.5 bg-brand px-3 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover">
              <FiVideo size={15} /> Join
            </button>
          ) : isStaff ? (
            <button onClick={() => onJoin(m)}
              className="flex items-center gap-1.5 border border-line-strong px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
              title="Starting the session opens it for students">
              <FiVideo size={15} /> Start
            </button>
          ) : null}
          {isStaff && (
            <button onClick={() => remove(m._id)} disabled={busyId === m._id}
              className="border border-line p-2 text-subtle transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-50"
              title="Delete session">
              <FiTrash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {isStaff && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-4">
          <select value={m.type || 'live-class'} onChange={(e) => patch(m._id, { type: e.target.value })}
            className="border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ink">
            {Object.entries(MEETING_TYPES).map(([k, t]) => <option key={k} value={k}>{t.icon} {t.label}</option>)}
          </select>
          <select value={m.curriculum || ''} onChange={(e) => patch(m._id, { curriculum: e.target.value })}
            className="border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ink">
            <option value="">Curriculum…</option>
            {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="datetime-local" defaultValue={toLocalInput(m.scheduledAt)}
            onChange={(e) => patch(m._id, { scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
          <div className="flex items-center gap-1.5">
            <input type="number" min="5" step="5" defaultValue={m.durationMinutes}
              onBlur={(e) => patch(m._id, { durationMinutes: Number(e.target.value) || 60 })}
              className="w-full border border-line bg-surface px-2 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-ink" />
            <span className="font-code text-xs text-muted">min</span>
          </div>
        </div>
      )}

      {isStaff && m.roomName && (
        <div className="mt-3 border border-line bg-sunken/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-code text-[11px] uppercase tracking-[0.12em] text-muted">
              <FiLink size={12} /> Student link
            </span>
            <button onClick={() => copy(studentLink(m), `s-${m._id}`)}
              className="flex items-center gap-1 bg-cta px-2.5 py-1 font-code text-[11px] font-medium text-on-cta transition-colors hover:bg-cta-hover">
              {copied === `s-${m._id}` ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
            </button>
          </div>
          <code className="block truncate bg-surface px-2 py-1 font-code text-[11px] text-muted">{studentLink(m)}</code>

          <label className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-ink-2">
            <input type="checkbox" checked={!!m.guestAccess?.enabled}
              onChange={(e) => patch(m._id, { guestAccess: { enabled: e.target.checked } })}
              className="h-3.5 w-3.5 border-line-strong accent-brand" />
            Allow guests (no account) — demo / trial / parents
          </label>
          {m.guestAccess?.enabled && m.guestAccess?.code && (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-code text-[11px] uppercase tracking-[0.12em] text-star">Guest link</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => patch(m._id, { guestAccess: { enabled: true, code: '' } })}
                    className="border border-line-strong px-2 py-1 font-code text-[11px] font-medium text-muted transition-colors hover:border-ink hover:text-ink"
                    title="Invalidates the previous guest link">New code</button>
                  <button onClick={() => copy(guestLink(m), `g-${m._id}`)}
                    className="bg-cta px-2.5 py-1 font-code text-[11px] font-medium text-on-cta transition-colors hover:bg-cta-hover">
                    {copied === `g-${m._id}` ? 'Copied' : 'Copy guest link'}
                  </button>
                </div>
              </div>
              <code className="block truncate bg-surface px-2 py-1 font-code text-[11px] text-muted">{guestLink(m)}</code>
              <p className="mt-1 text-[11px] text-star">Guests wait in the lobby until you admit them.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function IgcscMeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [isStaff, setIsStaff] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)          // meeting being joined
  const [copied, setCopied] = useState('')
  const [busyId, setBusyId] = useState('')
  const me = typeof window !== 'undefined' ? igcscUser() : null
  const tickRef = useRef(0)
  const [, forceTick] = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await apiGet('/api/igcsc/meetings')
      setMeetings(res.meetings || [])
      setIsStaff(!!res.isStaff)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Re-evaluate the clock so a session flips to "Live now" on its own.
  useEffect(() => {
    if (active) return
    const t = setInterval(() => { tickRef.current += 1; forceTick((n) => n + 1) }, 30000)
    return () => clearInterval(t)
  }, [active])

  const addMeeting = async () => {
    setBusyId('new')
    try {
      const start = new Date(Date.now() + 15 * 60000)   // default: 15 min from now
      await apiSend('/api/igcsc/meetings', 'POST', {
        title: 'New live session',
        type: 'live-class',
        curriculum: 'IGCSE',
        scheduledAt: start.toISOString(),
        durationMinutes: MEETING_TYPES['live-class'].defaultDuration,
      })
      await load()
    } catch (e) { setError(e.message) } finally { setBusyId('') }
  }

  const patch = async (id, changes) => {
    setBusyId(id)
    // Optimistic so typing feels immediate; the server response is authoritative.
    setMeetings((list) => list.map((m) => (m._id === id ? { ...m, ...changes } : m)))
    try {
      const res = await apiSend('/api/igcsc/meetings', 'PATCH', { id, ...changes })
      if (res?.meeting) setMeetings((list) => list.map((m) => (m._id === id ? res.meeting : m)))
    } catch (e) { setError(e.message); load() } finally { setBusyId('') }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this session? Anyone holding its link will lose access.')) return
    setBusyId(id)
    try {
      await apiSend(`/api/igcsc/meetings?id=${id}`, 'DELETE')
      setMeetings((l) => l.filter((m) => m._id !== id))
    } catch (e) { setError(e.message) } finally { setBusyId('') }
  }

  const copy = async (url, key) => {
    try { await navigator.clipboard.writeText(url) } catch { window.prompt('Copy this link:', url) }
    setCopied(key); setTimeout(() => setCopied(''), 2000)
  }

  const endClass = async (m) => { await patch(m._id, { status: 'ended' }) }

  if (active) {
    return (
      <LiveKitMeeting
        roomName={active.roomName}
        meetingTitle={active.title}
        meeting={active}
        displayName={me?.name || me?.email || 'Participant'}
        isAdmin={isStaff}
        // IGCSC has its own auth + endpoints — never call a DsatGuru API.
        authKey={IG_TOKEN}
        tokenApi="/api/igcsc/meetings/token"
        guestApi="/api/igcsc/meetings/guest"
        transcriptApi={null}
        boardsApi={null}
        onEndClass={() => endClass(active)}
        onClose={() => { setActive(null); load() }}
      />
    )
  }

  const now = new Date()
  const withState = meetings.map((m) => ({ ...m, _s: meetingState(m, now) }))
  const live = withState.filter((m) => m._s.canJoin)
  const upcoming = withState.filter((m) => m._s.state === 'upcoming')
  const past = withState.filter((m) => m._s.state === 'ended' || m._s.state === 'cancelled')

  // Everything a row needs from this page, in one bag (see Row above).
  const rowProps = {
    isStaff, busyId, copied, patch, remove, copy,
    onJoin: setActive,
    onTitleInput: (id, title) => setMeetings((l) => l.map((x) => (x._id === id ? { ...x, title } : x))),
  }

  return (
    <div>
      <PageHeader
        eyebrow="Live classes"
        title="Live Sessions"
        subtitle="Schedule IGCSC classes, doubt sessions and 1-on-1s — then share the link."
        actions={isStaff && (
          <button onClick={addMeeting} disabled={busyId === 'new'}
            className="flex items-center gap-1.5 bg-cta px-4 py-2 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60">
            <FiPlus size={15} /> New session
          </button>
        )}
      />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {loading ? <Loading label="Loading sessions…" /> : meetings.length === 0 ? (
        <EmptyState icon={FiVideo} title="No live sessions yet"
          hint={isStaff ? 'Create one and share its link with your students.' : 'Your tutor has not scheduled a session yet.'} />
      ) : (
        <div className="space-y-8">
          {live.length > 0 && (
            <div>
              <h2 className="display mb-3 flex items-center gap-2.5 text-[20px] text-ink">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
                </span>
                Happening <em className="accent">now</em>
              </h2>
              <div className="space-y-3">{live.map((m) => <Row key={m._id} m={m} {...rowProps} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="display mb-3 flex items-center gap-2.5 text-[20px] text-ink">
                <FiClock className="h-5 w-5 text-star" /> Upcoming
              </h2>
              <div className="space-y-3">{upcoming.map((m) => <Row key={m._id} m={m} {...rowProps} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="display mb-3 flex items-center gap-2.5 text-[20px] text-ink">
                <FiUsers className="h-5 w-5 text-subtle" /> Past sessions
              </h2>
              <div className="space-y-3">{past.map((m) => <Row key={m._id} m={m} {...rowProps} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
