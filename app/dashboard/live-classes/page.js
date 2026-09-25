'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import dynamic from 'next/dynamic'
import { FiCalendar, FiVideo, FiClock, FiRefreshCw, FiBell, FiGlobe, FiAlertCircle, FiBookOpen, FiCheckCircle, FiFileText, FiImage } from 'react-icons/fi'
const LiveKitMeeting = dynamic(() => import('../../components/LiveKitMeeting'), { ssr: false })
import { meetingState, meetingStart, meetingRoom, typeInfo, isExternalLink } from '../../../lib/meetingStatus'

export default function LiveClassesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchMeetings()
    }
  }, [user, authLoading, router])

  // A student waiting for class must see it flip to "Happening now" without
  // reloading, so re-evaluate the clock every 30s (and refetch every 5 min in
  // case the tutor just added/started a session).
  const [clockTick, setClockTick] = useState(0)
  // Whiteboards a tutor shared out of a class, addressed to this student.
  const [boards, setBoards] = useState([])
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/meetings/boards', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        setBoards(data.boards || [])
      } catch { /* the section simply stays hidden */ }
    })()
  }, [user])
  useEffect(() => {
    if (!user || activeMeeting) return
    const tick = setInterval(() => setClockTick(t => t + 1), 30000)
    const refetch = setInterval(() => fetchMeetings(), 300000)
    return () => { clearInterval(tick); clearInterval(refetch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeMeeting])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/enrollment', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response.data.success) {
        const enrollments = response.data.data || []

        const myId = String(user?.id || user?._id || '')
        const allMeetings = enrollments
          .filter(e => e.type === 'course' && e.courseId && Array.isArray(e.courseId.meetings))
          // A session booked for named students (a 1-on-1, a small group) is
          // hidden from everyone else — the token route would refuse them anyway.
          .flatMap(e => e.courseId.meetings.filter(m => {
            const only = m.allowedStudentIds
            if (!Array.isArray(only) || only.length === 0) return true
            return only.map(String).includes(myId)
          }).map(m => ({
            ...m,
            courseTitle: e.courseId.title,
            courseId: e.courseId._id,
            parsedDate: meetingStart(m) || new Date(NaN)
          })))
          .sort((a, b) => {
            const dateA = !isNaN(a.parsedDate) ? a.parsedDate : new Date(0)
            const dateB = !isNaN(b.parsedDate) ? b.parsedDate : new Date(0)
            return dateA - dateB
          })

        setMeetings(allMeetings)

        const allNotifications = enrollments
          .filter(e => e.type === 'course' && e.courseId && Array.isArray(e.courseId.calendarEvents))
          .flatMap(e => e.courseId.calendarEvents.map(evt => ({
            ...evt,
            courseTitle: e.courseId.title,
            parsedDate: new Date(evt.start || evt.date)
          })))
          .sort((a, b) => b.parsedDate - a.parsedDate)

        setNotifications(allNotifications)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
      setError('We could not load your live classes. Please try again.')
      if (error.response?.status === 401) {
        // Token expired or invalid
        // Optionally redirect to login or show specific message
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  // Recomputed on every clockTick so a class flips to "Happening now" on its own.
  const now = new Date(Date.now() + clockTick * 0)
  // Partition by JOINABILITY, never by "start time has passed" — the old rule
  // moved a class into "Past" the moment it began, so a student who arrived on
  // time could never get in.
  const withState = meetings.map(m => ({ ...m, _state: meetingState(m, now) }))
  const liveMeetings = withState.filter(m => m._state.canJoin)
  const upcomingMeetings = withState.filter(m => m._state.state === 'upcoming')
  const pastMeetings = withState
    .filter(m => m._state.state === 'ended' || m._state.state === 'cancelled')
    .reverse()

  const stats = [
    { label: 'Total Classes', value: meetings.length, icon: FiVideo, color: 'bg-indigo-500' },
    { label: 'Live now', value: liveMeetings.length, icon: FiVideo, color: 'bg-emerald-500' },
    { label: 'Completed', value: pastMeetings.length, icon: FiCheckCircle, color: 'bg-violet-500' },
    { label: 'Notifications', value: notifications.length, icon: FiBell, color: 'bg-amber-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiVideo className="h-5 w-5" />
              </span>
              Live Classes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Join the live sessions from courses you&apos;re enrolled in, and revisit past class recaps.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50"
                title="Notifications"
              >
                <FiBell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((note, idx) => (
                        <div key={idx} className="p-4 transition-colors hover:bg-indigo-50/40">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-slate-900">{note.title || '—'}</div>
                            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${note.type === 'note' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {note.type || 'notification'}
                            </span>
                          </div>
                          {note.description && (
                            <div className="mt-1 text-sm text-slate-600">{note.description}</div>
                          )}
                          <div className="mt-2 flex justify-between text-xs text-slate-400">
                            <span>{note.courseTitle || '—'}</span>
                            <span>{isValidDate(note.parsedDate) ? note.parsedDate.toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-500">No notifications</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={fetchMeetings}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FiRefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Error state */}
        {error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-800">Something went wrong</p>
                <p className="mt-1 text-sm text-rose-600">{error}</p>
                <button
                  onClick={fetchMeetings}
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
                        <div className="text-xs font-medium text-slate-500">{stat.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {meetings.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <FiCalendar className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">No live classes yet</h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  Live classes appear here once you join a live course.
                </p>
                <button
                  onClick={() => router.push('/dashboard/courses')}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <FiBookOpen className="h-4 w-4" /> Browse Live Courses
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {/* Happening now — joinable right this moment */}
                {liveMeetings.length > 0 && (
                  <div>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                      Happening now
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {liveMeetings.map((meeting, idx) => {
                        const ti = typeInfo(meeting)
                        const externalUrl = meeting.externalUrl || (isExternalLink(meeting.link) ? meeting.link : '')
                        return (
                          <div key={`live-${idx}`} className="flex flex-col rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                <FiBookOpen className="h-3 w-3" /> {meeting.courseTitle || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                {meeting._state.label}
                              </span>
                            </div>
                            <h3 className="mb-1 text-lg font-bold text-slate-900">{meeting.title || '—'}</h3>
                            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                              <span>{ti.icon} {ti.label}</span>
                              {meeting._state.start && <span>· {meeting._state.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            {externalUrl ? (
                              <a href={externalUrl} target="_blank" rel="noopener noreferrer"
                                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                                <FiVideo className="h-4 w-4" /> Join Class
                              </a>
                            ) : (
                              <button onClick={() => setActiveMeeting(meeting)}
                                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                                <FiVideo className="h-4 w-4" /> Join Class
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Shared whiteboards */}
                {boards.length > 0 && (
                  <div>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <FiImage className="h-5 w-5 text-violet-500" /> Class boards shared with you
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {boards.map((b) => (
                        <a key={b._id} href={b.imageUrl} target="_blank" rel="noopener noreferrer"
                          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                          <img src={b.imageUrl} alt={b.title}
                            className="h-40 w-full bg-slate-50 object-contain transition-transform group-hover:scale-[1.02]" />
                          <div className="p-4">
                            <p className="truncate text-sm font-bold text-slate-900">{b.title}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {b.meetingTitle ? `${b.meetingTitle} · ` : ''}{b.sharedBy}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {new Date(b.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Classes */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiClock className="h-5 w-5 text-emerald-500" /> Upcoming Classes
                  </h2>
                  {upcomingMeetings.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {upcomingMeetings.map((meeting, idx) => (
                        <div key={idx} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                          <div className="mb-4 flex items-start justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                              <FiBookOpen className="h-3 w-3" /> {meeting.courseTitle || '—'}
                            </span>
                            <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                              <FiClock className="h-3 w-3" /> {typeInfo(meeting).short}
                            </span>
                          </div>
                          <h3 className="mb-2 text-lg font-bold text-slate-900">{meeting.title || '—'}</h3>
                          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                            <FiCalendar className="h-4 w-4" />
                            {isValidDate(meeting.parsedDate) ? meeting.parsedDate.toLocaleString() : (meeting.date || '—')}
                          </div>
                          {meeting.transcriptLanguage && (
                            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                              <FiGlobe className="h-3.5 w-3.5" /> {meeting.transcriptLanguage}
                            </div>
                          )}
                          <div
                            className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
                            title="The room opens 15 minutes before the start time"
                          >
                            <FiClock className="h-4 w-4" /> {meeting._state.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                      <p className="text-sm text-slate-500">No upcoming classes scheduled.</p>
                    </div>
                  )}
                </div>

                {/* Past Classes */}
                {pastMeetings.length > 0 && (
                  <div>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <FiCheckCircle className="h-5 w-5 text-violet-500" /> Past Classes
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pastMeetings.map((meeting, idx) => {
                        const hasRecap = meeting.transcriptSummary || (Array.isArray(meeting.snapshots) && meeting.snapshots.length > 0)
                        return (
                          <div key={idx} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/60 p-6">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                                <FiBookOpen className="h-3 w-3" /> {meeting.courseTitle || '—'}
                              </span>
                              {hasRecap && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  <FiFileText className="h-3 w-3" /> Recap available
                                </span>
                              )}
                            </div>
                            <h3 className="mb-2 text-lg font-bold text-slate-700">{meeting.title || '—'}</h3>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                              <FiCalendar className="h-4 w-4" />
                              {isValidDate(meeting.parsedDate) ? meeting.parsedDate.toLocaleString() : (meeting.date || '—')}
                            </div>
                            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              {meeting.transcriptLanguage && (
                                <span className="flex items-center gap-1">
                                  <FiGlobe className="h-3.5 w-3.5" /> {meeting.transcriptLanguage}
                                </span>
                              )}
                              {meeting.transcriptGeneratedAt && (
                                <span className="flex items-center gap-1">
                                  <FiClock className="h-3.5 w-3.5" /> Recap {new Date(meeting.transcriptGeneratedAt).toLocaleDateString()}
                                </span>
                              )}
                              {Array.isArray(meeting.snapshots) && meeting.snapshots.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FiImage className="h-3.5 w-3.5" /> {meeting.snapshots.length} snapshot{meeting.snapshots.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            <button
                              disabled
                              className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
                            >
                              Ended
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* LiveKit Meeting */}
        {activeMeeting && (
          <LiveKitMeeting
            roomName={meetingRoom(activeMeeting)}
            meetingTitle={activeMeeting.title}
            meeting={activeMeeting}
            displayName={user?.name || 'Student'}
            isAdmin={false}
            onClose={() => setActiveMeeting(null)}
          />
        )}
      </div>
    </div>
  )
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d)
}
