'use client'
import { useState, useEffect } from 'react'
import { FiSend, FiUsers, FiMail, FiMessageSquare, FiBell, FiTrash2, FiX } from 'react-icons/fi'
import { useConfirm, useToast } from '../ui/UIProvider'

export default function Communication() {
  const confirm = useConfirm()
  const toast = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchAnnouncements = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/announcements', {
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
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreate = async (formData) => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          audience: formData.audience
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create announcement')
      }
      const data = await res.json().catch(() => ({}))
      setShowModal(false)
      await fetchAnnouncements()
      const n = data?.emailSent || 0
      toast.success(n > 0
        ? `Announcement posted and emailed to ${n} user${n === 1 ? '' : 's'}.`
        : 'Announcement posted.')
    } catch (err) {
      setError(err.message || 'Failed to create announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm({ message: 'Delete this announcement?', tone: 'danger', confirmText: 'Delete' }))) return
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete announcement')
      }
      await fetchAnnouncements()
    } catch (err) {
      setError(err.message || 'Failed to delete announcement')
    }
  }

  const total = announcements.length
  const studentCount = announcements.filter(a => a.audience === 'students').length
  const tutorCount = announcements.filter(a => a.audience === 'tutors').length
  const allCount = announcements.filter(a => a.audience === 'all').length

  const audienceLabel = (audience) => {
    if (audience === 'students') return 'Students'
    if (audience === 'tutors') return 'Tutors'
    return 'All Users'
  }

  const audienceBadge = (audience) => {
    if (audience === 'students') return 'bg-blue-50 text-blue-700'
    if (audience === 'tutors') return 'bg-indigo-50 text-indigo-700'
    return 'bg-emerald-50 text-emerald-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Communication</h1>
            <p className="mt-1 text-sm text-slate-500">Send announcements to students and tutors</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <FiSend /> Create Announcement
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              onClick={fetchAnnouncements}
              className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {/* Communication Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Announcements"
            value={String(total)}
            icon={<FiMail />}
            color="bg-indigo-500"
          />
          <StatCard
            title="To All Users"
            value={String(allCount)}
            icon={<FiBell />}
            color="bg-amber-500"
          />
          <StatCard
            title="To Students"
            value={String(studentCount)}
            icon={<FiUsers />}
            color="bg-blue-500"
          />
          <StatCard
            title="To Tutors"
            value={String(tutorCount)}
            icon={<FiMessageSquare />}
            color="bg-emerald-500"
          />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recent Announcements</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiBell size={22} />
                </div>
                <p className="text-sm font-medium text-slate-500">No announcements yet</p>
                <p className="mt-1 text-sm text-slate-400">Create one to get started.</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement._id} className="p-6 transition-colors hover:bg-indigo-50/40">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${audienceBadge(announcement.audience)}`}>
                          {audienceLabel(announcement.audience)}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-2 whitespace-pre-line">{announcement.body}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>Target: {audienceLabel(announcement.audience)}</span>
                        {announcement.createdBy?.name && (
                          <span>By: {announcement.createdBy.name}</span>
                        )}
                        {announcement.createdAt && (
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Delete announcement"
                        aria-label={`Delete announcement: ${announcement.title}`}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showModal && (
          <AnnouncementModal
            saving={saving}
            onClose={() => setShowModal(false)}
            onSave={handleCreate}
          />
        )}
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, color }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
)

const AnnouncementModal = ({ onClose, onSave, saving }) => {
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    audience: "all"
  })

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Create Announcement</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="announcement-title" className="block text-sm font-medium text-slate-600 mb-1">Title</label>
            <input
              id="announcement-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="announcement-body" className="block text-sm font-medium text-slate-600 mb-1">Content</label>
            <textarea
              id="announcement-body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="4"
              required
            />
          </div>
          <div>
            <label htmlFor="announcement-audience" className="block text-sm font-medium text-slate-600 mb-1">Target Audience</label>
            <select
              id="announcement-audience"
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="students">Students Only</option>
              <option value="tutors">Tutors Only</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
