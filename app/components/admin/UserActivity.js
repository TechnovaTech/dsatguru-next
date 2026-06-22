'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FiSearch, FiLogIn, FiCheckCircle, FiAlertTriangle, FiClock, FiFileText, FiLoader, FiActivity, FiUser,
} from 'react-icons/fi'

const TYPE_META = {
  login: { icon: FiLogIn, cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  completed: { icon: FiCheckCircle, cls: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
  autosubmit: { icon: FiAlertTriangle, cls: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
  inprogress: { icon: FiClock, cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
  assigned: { icon: FiFileText, cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}
const metaFor = (t) => TYPE_META[t] || TYPE_META.assigned

function fmt(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}
function fmtDay(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export default function UserActivity() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/user-activity', { headers: authHeaders(), cache: 'no-store' })
        if (res.ok) setUsers(await res.json())
      } finally { setLoadingUsers(false) }
    })()
  }, [authHeaders])

  const openUser = async (u) => {
    setActive(u); setEvents([]); setLoadingTimeline(true)
    try {
      const res = await fetch(`/api/admin/user-activity?userId=${u._id}`, { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) { const d = await res.json(); setEvents(d.events || []) }
    } finally { setLoadingTimeline(false) }
  }

  const visible = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  // Group timeline events by day for readability
  const grouped = []
  let lastDay = null
  for (const e of events) {
    const day = fmtDay(e.time)
    if (day !== lastDay) { grouped.push({ day }); lastDay = day }
    grouped.push({ event: e })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">User <span className="dg-gradient-text">Activity</span></h1>
          <p className="mt-1 text-sm text-slate-500">Pick a user to see their full timeline — logins, tests started/finished/left, answers, and auto-submits.</p>
        </div>

        <div className="flex h-[calc(100vh-220px)] min-h-[480px] gap-4">
          {/* Left: user list */}
          <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex justify-center py-10 text-slate-400"><FiLoader className="animate-spin" size={22} /></div>
              ) : visible.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No users.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {visible.map(u => (
                    <button
                      key={u._id}
                      onClick={() => openUser(u)}
                      className={`flex w-full flex-col gap-0.5 border-l-4 p-3 text-left transition-colors ${active?._id === u._id ? 'border-l-indigo-500 bg-indigo-50/60' : 'border-l-transparent hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{u.name || 'Unknown'}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{u.role}</span>
                      </div>
                      <span className="truncate text-xs text-slate-500">{u.email}</span>
                      <span className="text-[10px] text-slate-400">
                        {u.lastLogin ? `Last login ${fmt(u.lastLogin)}` : 'No login recorded yet'}
                        {u.testsCompleted ? ` · ${u.testsCompleted} test${u.testsCompleted === 1 ? '' : 's'}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: timeline */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
                <FiActivity size={40} />
                <p className="text-sm">Select a user to see their activity timeline.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {(active.name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-slate-900">{active.name}</h2>
                    <p className="truncate text-xs text-slate-500">{active.email} · {active.role}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {loadingTimeline ? (
                    <div className="flex justify-center py-10 text-slate-400"><FiLoader className="animate-spin" size={22} /></div>
                  ) : events.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
                      <FiActivity size={30} /><p className="text-sm">No recorded activity for this user yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {grouped.map((g, i) => g.day ? (
                        <div key={'d' + i} className="sticky top-0 z-10 bg-white py-2 text-xs font-bold uppercase tracking-wider text-slate-400">{g.day}</div>
                      ) : (
                        (() => {
                          const m = metaFor(g.event.type); const Icon = m.icon
                          return (
                            <div key={'e' + i} className="flex items-start gap-3 py-2">
                              <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${m.cls}`}>
                                <Icon size={15} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-slate-700">{g.event.text}</p>
                                <p className="text-[11px] text-slate-400">
                                  {fmt(g.event.time)}{g.event.ip ? ` · IP ${g.event.ip}` : ''}
                                </p>
                              </div>
                            </div>
                          )
                        })()
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
