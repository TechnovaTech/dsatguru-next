'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FiVideo, FiLoader, FiAlertCircle, FiLogIn, FiClock, FiUser } from 'react-icons/fi'

const LiveKitMeeting = dynamic(() => import('../../components/LiveKitMeeting'), { ssr: false })

// Declared at module scope on purpose: defining this inside the page component
// makes a NEW component type on every render, so React would unmount the form
// (and the focused input) after every keystroke.
function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <FiVideo size={20} />
          </span>
          <div>
            <p className="text-base font-extrabold text-slate-900">DsatGuru Live Class</p>
            <p className="text-xs text-slate-500">You have been invited to join a session</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// The shareable join link: dsatguru.com/join/<room>[?g=<code>]
//
//  - Signed-in student  → straight into the class (enrollment still checked
//                          server-side by the token route).
//  - Signed out + ?g=   → guest waiting room: enter a name, a host admits you.
//  - Signed out, no ?g= → sent to login and returned here afterwards.
export default function JoinPage() {
  const { room } = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const guestCode = search.get('g') || ''

  const [mode, setMode] = useState('checking')   // checking | member | guest | signin
  const [guestName, setGuestName] = useState('')
  const [guestState, setGuestState] = useState('idle') // idle | waiting | denied | admitted
  const [guestSession, setGuestSession] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const roomName = decodeURIComponent(String(room || ''))

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) setMode('member')
    else if (guestCode) setMode('guest')
    else setMode('signin')
  }, [guestCode])

  // Knock on the waiting-room door.
  const requestAccess = async () => {
    const name = guestName.trim()
    if (!name) { setError('Please enter your name.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/livekit/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, code: guestCode, name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not request access.')
      sessionStorage.setItem(`guest:${roomName}`, data.claimId)
      setGuestState('waiting')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Poll until a host admits (or denies) us.
  useEffect(() => {
    if (guestState !== 'waiting') return
    const claimId = sessionStorage.getItem(`guest:${roomName}`)
    if (!claimId) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/livekit/guest?claimId=${encodeURIComponent(claimId)}`)
        const data = await res.json().catch(() => ({}))
        if (data.status === 'approved' && data.token) {
          setGuestSession(data)
          setGuestState('admitted')
        } else if (data.status === 'denied') {
          setGuestState('denied')
        } else if (data.status === 'expired') {
          setGuestState('idle')
          setError('Your request expired. Please ask again.')
        }
      } catch { /* keep polling */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [guestState, roomName])

  // ── Signed-in: hand straight over to the normal meeting component ────────
  if (mode === 'member') {
    return (
      <LiveKitMeeting
        roomName={roomName}
        displayName={undefined}
        onClose={() => router.push('/dashboard/live-classes')}
      />
    )
  }

  // ── Guest admitted: join with the guest token ────────────────────────────
  if (guestState === 'admitted' && guestSession) {
    return (
      <LiveKitMeeting
        roomName={roomName}
        session={guestSession}
        displayName={guestSession.userInfo?.name}
        onClose={() => { setGuestState('idle'); setGuestSession(null) }}
      />
    )
  }

  if (mode === 'checking') {
    return <Shell><div className="flex items-center gap-2 text-slate-500"><FiLoader className="animate-spin" /> Checking your access…</div></Shell>
  }

  // ── Signed out with no guest code: send them to log in, then back here ───
  if (mode === 'signin') {
    const returnTo = encodeURIComponent(`/join/${encodeURIComponent(roomName)}`)
    return (
      <Shell>
        <p className="mb-6 text-sm text-slate-600">
          Sign in with your DsatGuru account to join this class. You will come straight back here.
        </p>
        <button
          onClick={() => router.push(`/login?returnTo=${returnTo}`)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <FiLogIn className="h-4 w-4" /> Sign in to join
        </button>
      </Shell>
    )
  }

  // ── Guest flow ───────────────────────────────────────────────────────────
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
            <p className="mt-1 text-xs text-rose-700">Please contact DsatGuru if you think this is a mistake.</p>
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
      <button
        onClick={requestAccess}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Asking…</> : <>Ask to join</>}
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        The tutor will let you in. Already a student?{' '}
        <button onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/join/${encodeURIComponent(roomName)}`)}`)} className="font-semibold text-indigo-600 hover:underline">
          Sign in
        </button>
      </p>
    </Shell>
  )
}
