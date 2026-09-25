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

  const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://dsatguru.com')
  const studentLink = (m) => `${origin()}/igcsc/join/${encodeURIComponent(m.roomName || '')}`
  const guestLink = (m) => `${studentLink(m)}?g=${encodeURIComponent(m.guestAccess?.code || '')}`
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

  const Row = ({ m }) => {
    const ti = typeInfo(m)
    const st = m._s
    return (
      <div className={`rounded-xl border p-4 ${st.canJoin ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isStaff ? (
              <input
                value={m.title || ''}
                onChange={(e) => setMeetings((l) => l.map((x) => (x._id === m._id ? { ...x, title: e.target.value } : x)))}
                onBlur={(e) => patch(m._id, { title: e.target.value })}
                className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-base font-bold text-slate-900 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none"
              />
            ) : (
              <p className="text-base font-bold text-slate-900">{m.title}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
              <button onClick={() => setActive(m)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <FiVideo size={15} /> Join
              </button>
            ) : isStaff ? (
              <button onClick={() => setActive(m)}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                title="Starting the session opens it for students">
                <FiVideo size={15} /> Start
              </button>
            ) : null}
            {isStaff && (
              <button onClick={() => remove(m._id)} disabled={busyId === m._id}
                className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                title="Delete session">
                <FiTrash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {isStaff && (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200/70 pt-3 sm:grid-cols-4">
            <select value={m.type || 'live-class'} onChange={(e) => patch(m._id, { type: e.target.value })}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {Object.entries(MEETING_TYPES).map(([k, t]) => <option key={k} value={k}>{t.icon} {t.label}</option>)}
            </select>
            <select value={m.curriculum || ''} onChange={(e) => patch(m._id, { curriculum: e.target.value })}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Curriculum…</option>
              {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="datetime-local" defaultValue={toLocalInput(m.scheduledAt)}
              onChange={(e) => patch(m._id, { scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <div className="flex items-center gap-1.5">
              <input type="number" min="5" step="5" defaultValue={m.durationMinutes}
                onBlur={(e) => patch(m._id, { durationMinutes: Number(e.target.value) || 60 })}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              <span className="text-xs text-slate-500">min</span>
            </div>
          </div>
        )}

        {isStaff && m.roomName && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FiLink size={12} /> Student link
              </span>
              <button onClick={() => copy(studentLink(m), `s-${m._id}`)}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
                {copied === `s-${m._id}` ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
              </button>
            </div>
            <code className="block truncate rounded bg-white px-2 py-1 text-[11px] text-slate-500">{studentLink(m)}</code>

            <label className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={!!m.guestAccess?.enabled}
                onChange={(e) => patch(m._id, { guestAccess: { enabled: e.target.checked } })}
                className="h-3.5 w-3.5 rounded border-slate-300" />
              Allow guests (no account) — demo / trial / parents
            </label>
            {m.guestAccess?.enabled && m.guestAccess?.code && (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-600">Guest link</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => patch(m._id, { guestAccess: { enabled: true, code: '' } })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                      title="Invalidates the previous guest link">New code</button>
                    <button onClick={() => copy(guestLink(m), `g-${m._id}`)}
                      className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600">
                      {copied === `g-${m._id}` ? 'Copied' : 'Copy guest link'}
                    </button>
                  </div>
                </div>
                <code className="block truncate rounded bg-white px-2 py-1 text-[11px] text-slate-500">{guestLink(m)}</code>
                <p className="mt-1 text-[11px] text-amber-600">Guests wait in the lobby until you admit them.</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Live Sessions"
        subtitle="Schedule IGCSC classes, doubt sessions and 1-on-1s — then share the link."
        actions={isStaff && (
          <button onClick={addMeeting} disabled={busyId === 'new'}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
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
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Happening now
              </h2>
              <div className="space-y-3">{live.map((m) => <Row key={m._id} m={m} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                <FiClock className="h-5 w-5 text-amber-500" /> Upcoming
              </h2>
              <div className="space-y-3">{upcoming.map((m) => <Row key={m._id} m={m} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                <FiUsers className="h-5 w-5 text-slate-400" /> Past sessions
              </h2>
              <div className="space-y-3">{past.map((m) => <Row key={m._id} m={m} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
