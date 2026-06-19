'use client'
import { useState, useEffect, useCallback } from 'react'
import { FiBell, FiUsers, FiCalendar, FiAlertCircle } from 'react-icons/fi'

const AUDIENCE_BADGES = {
  all: { label: 'Everyone', className: 'bg-indigo-100 text-indigo-700' },
  students: { label: 'Students', className: 'bg-emerald-100 text-emerald-700' },
  tutors: { label: 'Tutors', className: 'bg-violet-100 text-violet-700' },
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/announcements', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load announcements')
      const data = await res.json()
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBell className="h-5 w-5" />
            </span>
            Announcements
          </h1>
          <p className="mt-1 text-sm text-slate-500">Updates and notices for you</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </span>
            <button
              onClick={fetchAnnouncements}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <FiBell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No announcements yet</h3>
            <p className="mt-1 text-sm text-slate-500">New updates and notices will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const badge = AUDIENCE_BADGES[announcement.audience] || AUDIENCE_BADGES.all
              const edited =
                announcement.updatedAt &&
                announcement.createdAt &&
                new Date(announcement.updatedAt).getTime() - new Date(announcement.createdAt).getTime() > 60000
              return (
                <article
                  key={announcement._id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-colors hover:bg-indigo-50/40"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">{announcement.title || '—'}</h2>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                    >
                      <FiUsers className="h-3.5 w-3.5" />
                      {badge.label}
                    </span>
                  </div>

                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {announcement.body || '—'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <FiCalendar className="h-3.5 w-3.5" />
                      Posted {formatDate(announcement.createdAt)}
                    </span>
                    {edited && (
                      <span className="inline-flex items-center gap-1.5">
                        Edited {formatDate(announcement.updatedAt)}
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
