'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FiVideo, FiLoader, FiAlertCircle, FiLogIn, FiClock, FiUser } from 'react-icons/fi'
import { IG_TOKEN, igcscUser } from '../../_components/auth'
import { apiGet, apiSend } from '../../_components/api'
import { siteFontVars } from '../../../components/siteFonts'

const LiveKitMeeting = dynamic(() => import('../../../components/LiveKitMeeting'), { ssr: false })

// Declared at module scope: defining this inside the page component makes a new
// component type on every render, which unmounts the focused input.
// This page renders outside the portal layout, so it wears the `.ig` paper
// theme (and the editorial fonts) itself: a paper card centred on canvas.
function Shell({ children }) {
  return (
    <div className={`${siteFontVars} ig min-h-screen`}>
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-md border border-line bg-surface p-8 animate-rise">
          <div className="mb-6 flex items-center gap-3 border-b border-line pb-5">
            <span className="flex h-11 w-11 items-center justify-center bg-cta font-display text-lg text-on-cta">iG</span>
            <div>
              <p className="font-code text-[10px] uppercase tracking-[0.16em] text-brand">IGCSC · Live session</p>
              <p className="display mt-1 text-[21px] leading-none text-ink">Join your <em className="accent">class</em></p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// /igcsc/join/<room>[?g=<code>] — the shareable IGCSC class link.
export default function IgcscJoinPage() {
  const { room } = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const guestCode = search.get('g') || ''

  const [mode, setMode] = useState('checking')          // checking | member | guest | signin
  const [member, setMember] = useState(null)            // { meeting, isStaff } once signed in
  const [guestName, setGuestName] = useState('')
  const [guestState, setGuestState] = useState('idle')  // idle | waiting | denied | admitted
  const [guestSession, setGuestSession] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const me = typeof window !== 'undefined' ? igcscUser() : null

  const roomName = decodeURIComponent(String(room || ''))

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(IG_TOKEN) : null
    if (!t) { setMode(guestCode ? 'guest' : 'signin'); return }
    // Signed in: find this room's session first, so a host can end the class
    // the IGCSC way (PATCH by id). Without it the End button fell back to
    // DsatGuru's session API, which rejects an IGCSC token.
    let cancelled = false
    ;(async () => {
      let meeting = null, isStaff = false
      try {
        const res = await apiGet('/api/igcsc/meetings')
        isStaff = !!res?.isStaff
        meeting = (res?.meetings || []).find((x) => x.roomName === roomName) || null
      } catch { /* the token route is the real gate and reports its own reason */ }
      if (cancelled) return
      setMember({ meeting, isStaff })
      setMode('member')
    })()
    return () => { cancelled = true }
  }, [guestCode, roomName])

  // Mirrors /igcsc/meetings: ending a session is a status change on the IGCSC
  // record, which also empties the LiveKit room.
  const endClass = async () => {
    const id = member?.meeting?._id
    if (!id) throw new Error('This session could not be found, so it was not ended. End it from Live Sessions.')
    await apiSend('/api/igcsc/meetings', 'PATCH', { id, status: 'ended' })
  }

  const requestAccess = async () => {
    const name = guestName.trim()
    if (!name) { setError('Please enter your name.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/igcsc/meetings/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, code: guestCode, name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not request access.')
      sessionStorage.setItem(`igcsc-guest:${roomName}`, data.claimId)
      setGuestState('waiting')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  useEffect(() => {
    if (guestState !== 'waiting') return
    const claimId = sessionStorage.getItem(`igcsc-guest:${roomName}`)
    if (!claimId) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/igcsc/meetings/guest?claimId=${encodeURIComponent(claimId)}`)
        const data = await res.json().catch(() => ({}))
        if (data.status === 'approved' && data.token) { setGuestSession(data); setGuestState('admitted') }
        else if (data.status === 'denied') setGuestState('denied')
        else if (data.status === 'expired') { setGuestState('idle'); setError('Your request expired. Please ask again.') }
      } catch { /* keep polling */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [guestState, roomName])

  if (mode === 'member') {
    return (
      <LiveKitMeeting
        roomName={roomName}
        meetingTitle={member?.meeting?.title}
        meeting={member?.meeting || undefined}
        displayName={me?.name || me?.email || 'Participant'}
        isAdmin={!!member?.isStaff}
        authKey={IG_TOKEN}
        tokenApi="/api/igcsc/meetings/token"
        guestApi="/api/igcsc/meetings/guest"
        transcriptApi={null}
        boardsApi={null}
        onEndClass={endClass}
        onClose={() => router.push('/igcsc/meetings')}
      />
    )
  }

  if (guestState === 'admitted' && guestSession) {
    return (
      <LiveKitMeeting
        roomName={roomName}
        session={guestSession}
        displayName={guestSession.userInfo?.name}
        authKey={IG_TOKEN}
        tokenApi="/api/igcsc/meetings/token"
        guestApi="/api/igcsc/meetings/guest"
        transcriptApi={null}
        boardsApi={null}
        onClose={() => { setGuestState('idle'); setGuestSession(null) }}
      />
    )
  }

  if (mode === 'checking') {
    return <Shell><div className="flex items-center gap-2 text-sm text-muted"><FiLoader className="animate-spin" /> Checking your access…</div></Shell>
  }

  if (mode === 'signin') {
    return (
      <Shell>
        <p className="mb-6 text-sm text-muted">
          Sign in with your IGCSC account to join this session.
        </p>
        <button onClick={() => router.push('/igcsc/login')}
          className="flex h-11 w-full items-center justify-center gap-2 bg-cta px-4 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover">
          <FiLogIn className="h-4 w-4" /> Sign in to join
        </button>
      </Shell>
    )
  }

  if (guestState === 'waiting') {
    return (
      <Shell>
        <div className="flex items-start gap-3 border-l-2 border-star bg-star/10 p-4">
          <FiClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-star" />
          <div>
            <p className="text-sm font-semibold text-ink">Waiting for the tutor to let you in</p>
            <p className="mt-1 text-xs text-muted">Keep this page open — you will join automatically.</p>
          </div>
        </div>
      </Shell>
    )
  }

  if (guestState === 'denied') {
    return (
      <Shell>
        <div className="flex items-start gap-3 border-l-2 border-negative bg-negative/10 p-4">
          <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-negative" />
          <div>
            <p className="text-sm font-semibold text-ink">The tutor did not admit you</p>
            <p className="mt-1 text-xs text-muted">Please contact IGCSC if you think this is a mistake.</p>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <label className="mb-2 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">Your name</label>
      <div className="relative mb-4">
        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && requestAccess()}
          placeholder="e.g. Riya Shah"
          maxLength={60}
          className="w-full border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-ink"
        />
      </div>
      {error && <p className="mb-3 border-l-2 border-negative bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>}
      <button onClick={requestAccess} disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 bg-cta px-4 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60">
        {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Asking…</> : 'Ask to join'}
      </button>
      <p className="mt-3 text-center text-xs text-subtle">
        The tutor will let you in. Already have an account?{' '}
        <button onClick={() => router.push('/igcsc/login')} className="font-semibold text-brand hover:underline">Sign in</button>
      </p>
    </Shell>
  )
}
