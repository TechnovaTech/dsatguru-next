'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiCalendar, FiEdit2, FiSave, FiX, FiCheckCircle, FiBarChart2, FiClock, FiTarget, FiAward, FiAlertCircle, FiUsers, FiTrendingUp } from 'react-icons/fi'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [recentResults, setRecentResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProfile(data.user)
      setTotalAttempts(data.totalAttempts || 0)
      setRecentResults(data.recentResults || [])
      setForm({
        name: data.user.name || '',
        phone: data.user.phone || '',
        dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.split('T')[0] : '',
        nextExamDate: data.user.nextExamDate ? data.user.nextExamDate.split('T')[0] : '',
        lastAttemptDate: data.user.lastAttemptDate ? data.user.lastAttemptDate.split('T')[0] : '',
        targetExamDate: data.user.targetExamDate ? data.user.targetExamDate.split('T')[0] : '',
        totalDsatAttempts: data.user.totalDsatAttempts || 0
      })
    } catch (e) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(data.user)
      setEditing(false)
      setSuccess('Profile updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fmtDate = d => (d ? new Date(d).toLocaleDateString() : 'Not set')
  const initials = profile?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '—'
  const assignedTutors = profile?.assignedTutors || []

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
    </div>
  )

  if (error && !profile) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <FiAlertCircle className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>
          <button
            onClick={fetchProfile}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiUser className="h-5 w-5" />
            </span>
            My Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal details and DSAT exam information.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <FiCheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {/* Header Card */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile?.name || '—'}</h2>
                <p className="text-sm text-slate-500">{profile?.email || '—'}</p>
                <span className="mt-1.5 inline-block rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {profile?.role || 'Student'}
                </span>
              </div>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <FiEdit2 /> Edit Profile
              </button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <FiX /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<FiCheckCircle className="h-5 w-5 text-white" />} chip="bg-emerald-500" label="Total Attempts" value={totalAttempts} />
          <StatCard icon={<FiBarChart2 className="h-5 w-5 text-white" />} chip="bg-indigo-500" label="Recent Results" value={recentResults.length} />
          <StatCard icon={<FiCalendar className="h-5 w-5 text-white" />} chip="bg-violet-500" label="Next Exam" value={fmtDate(profile?.nextExamDate)} />
          <StatCard icon={<FiClock className="h-5 w-5 text-white" />} chip="bg-amber-500" label="Member Since" value={fmtDate(profile?.createdAt)} />
        </div>

        {/* Personal Info */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiUser className="h-4 w-4" />
            </span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field icon={<FiUser />} label="Full Name" editing={editing}
              value={form.name} display={profile?.name || '—'}
              onChange={v => setForm(f => ({ ...f, name: v }))} />
            <Field icon={<FiMail />} label="Email Address" editing={false}
              value={profile?.email} display={profile?.email || '—'} />
            <Field icon={<FiPhone />} label="Mobile Number" editing={editing}
              value={form.phone} display={profile?.phone || 'Not set'}
              onChange={v => setForm(f => ({ ...f, phone: v }))}
              type="tel" placeholder="+1 234 567 8900" />
            <Field icon={<FiCalendar />} label="Date of Birth" editing={editing}
              value={form.dateOfBirth} display={fmtDate(profile?.dateOfBirth)}
              onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))}
              type="date" />
            <Field icon={<FiCalendar />} label="Next DSAT Exam Date" editing={editing}
              value={form.nextExamDate} display={fmtDate(profile?.nextExamDate)}
              onChange={v => setForm(f => ({ ...f, nextExamDate: v }))}
              type="date" />
            <Field icon={<FiTrendingUp />} label="Target Score" editing={false}
              value={profile?.targetScore} display={profile?.targetScore ?? 'Not set'} />
          </div>

          {assignedTutors.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FiUsers className="h-3.5 w-3.5" /> Assigned {assignedTutors.length > 1 ? 'Tutors' : 'Tutor'}
              </p>
              <div className="flex flex-wrap gap-2">
                {assignedTutors.map((t, i) => (
                  <span key={t._id || i} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    {(t.name || '—')}{t.email ? ` · ${t.email}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DSAT Exam Info */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FiTarget className="h-4 w-4" />
            </span>
            DSAT Exam Information
          </h2>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500">
                <FiAward className="h-5 w-5 text-white" />
              </span>
              <div className="text-2xl font-bold text-slate-900">{profile?.totalDsatAttempts || 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">Total DSAT Attempts</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500">
                <FiCalendar className="h-5 w-5 text-white" />
              </span>
              <div className="text-sm font-bold text-slate-900">{fmtDate(profile?.lastAttemptDate)}</div>
              <div className="mt-0.5 text-xs text-slate-500">Last Attempt Date</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
                <FiTarget className="h-5 w-5 text-white" />
              </span>
              <div className="text-sm font-bold text-slate-900">{fmtDate(profile?.targetExamDate)}</div>
              <div className="mt-0.5 text-xs text-slate-500">Target Exam Date</div>
            </div>
          </div>
          {editing && (
            <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-5 md:grid-cols-3">
              <Field icon={<FiAward />} label="Total DSAT Attempts" editing={editing}
                value={form.totalDsatAttempts} display={profile?.totalDsatAttempts || 0}
                onChange={v => setForm(f => ({ ...f, totalDsatAttempts: v }))}
                type="number" placeholder="0" />
              <Field icon={<FiCalendar />} label="Last Attempt Date" editing={editing}
                value={form.lastAttemptDate} display={fmtDate(profile?.lastAttemptDate)}
                onChange={v => setForm(f => ({ ...f, lastAttemptDate: v }))}
                type="date" />
              <Field icon={<FiTarget />} label="Target Exam Date" editing={editing}
                value={form.targetExamDate} display={fmtDate(profile?.targetExamDate)}
                onChange={v => setForm(f => ({ ...f, targetExamDate: v }))}
                type="date" />
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBarChart2 className="h-4 w-4" />
            </span>
            Recent Results
          </h2>
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FiBarChart2 className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700">No results yet</p>
              <p className="mt-1 text-xs text-slate-500">Completed test results will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentResults.map((r, i) => (
                <div key={r._id || i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-indigo-50/40">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.testTitle || 'Untitled Test'}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.subject === 'Math' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'
                    }`}>{r.subject || '—'}</span>
                    <span className="text-lg font-bold text-slate-900">{r.score ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, chip, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
      <div className="mt-3 text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  )
}

function Field({ icon, label, editing, value, display, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
        {icon} {label}
      </label>
      {editing && onChange ? (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <p className="py-2 text-sm font-medium text-slate-900">{display}</p>
      )}
    </div>
  )
}
