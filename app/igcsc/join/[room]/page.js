'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FiVideo, FiLoader, FiAlertCircle, FiLogIn, FiClock, FiUser } from 'react-icons/fi'
import { IG_TOKEN } from '../../_components/auth'

const LiveKitMeeting = dynamic(() => import('../../../components/LiveKitMeeting'), { ssr: false })

// Declared at module scope: defining this inside the page component makes a new
// component type on every render, which unmounts the focused input.
function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">iG</span>
          <div>
            <p className="text-base font-extrabold text-slate-900">IGCSC Live Session</p>
            <p className="text-xs text-slate-500">You have been invited to join a class</p>
          </div>
        </div>
        {children}
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
  const [guestName, setGuestName] = useState('')
  const [guestState, setGuestState] = useState('idle')  // idle | waiting | denied | admitted
  const [guestSession, setGuestSession] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const roomName = decodeURIComponent(String(room || ''))

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(IG_TOKEN) : null
    if (t) setMode('member')
    else if (guestCode) setMode('guest')
    else setMode('signin')
  }, [guestCode])

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
        authKey={IG_TOKEN}
        tokenApi="/api/igcsc/meetings/token"
        guestApi="/api/igcsc/meetings/guest"
        transcriptApi={null}
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
        onClose={() => { setGuestState('idle'); setGuestSession(null) }}
      />
    )
  }

  if (mode === 'checking') {
    return <Shell><div className="flex items-center gap-2 text-slate-500"><FiLoader className="animate-spin" /> Checking your access…</div></Shell>
  }

  if (mode === 'signin') {
    return (
      <Shell>
        <p className="mb-6 text-sm text-slate-600">
          Sign in with your IGCSC account to join this session.
        </p>
        <button onClick={() => router.push('/igcsc/login')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          <FiLogIn className="h-4 w-4" /> Sign in to join
        </button>
      </Shell>
    )
  }

  if (guestState === 'waiting') {
    return (
      <Shell>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <FiClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Waiting for the tutor to let you in</p>
            <p className="mt-1 text-xs text-amber-700">Keep this page open — you will join automatically.</p>
          </div>
        </div>
      </Shell>
    )
  }

  if (guestState === 'denied') {
    return (
      <Shell>
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">The tutor did not admit you</p>
            <p className="mt-1 text-xs text-rose-700">Please contact IGCSC if you think this is a mistake.</p>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Your name</label>
      <div className="relative mb-4">
        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && requestAccess()}
          placeholder="e.g. Riya Shah"
          maxLength={60}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <button onClick={requestAccess} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
        {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Asking…</> : 'Ask to join'}
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        The tutor will let you in. Already have an account?{' '}
        <button onClick={() => router.push('/igcsc/login')} className="font-semibold text-indigo-600 hover:underline">Sign in</button>
      </p>
    </Shell>
  )
}
