'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiCalendar, FiEdit2, FiSave, FiX, FiBookOpen, FiCheckCircle, FiBarChart2, FiClock, FiTarget, FiAward } from 'react-icons/fi'

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

  const initials = profile?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}
        {success && <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">{success}</div>}

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                <p className="text-gray-500">{profile?.email}</p>
                <span className="inline-block mt-1 px-3 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                  Student
                </span>
              </div>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <FiEdit2 /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <FiX /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <FiCheckCircle className="w-5 h-5 text-green-600" />, label: 'Total Attempts', value: totalAttempts, bg: 'bg-green-50' },
            { icon: <FiBarChart2 className="w-5 h-5 text-blue-600" />, label: 'Recent Results', value: recentResults.length, bg: 'bg-blue-50' },
            { icon: <FiCalendar className="w-5 h-5 text-purple-600" />, label: 'Next Exam', value: profile?.nextExamDate ? new Date(profile.nextExamDate).toLocaleDateString() : 'Not set', bg: 'bg-purple-50' },
            { icon: <FiClock className="w-5 h-5 text-orange-600" />, label: 'Member Since', value: new Date(profile?.createdAt).toLocaleDateString(), bg: 'bg-orange-50' }
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 border border-white shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <FiUser className="text-blue-600" /> Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field icon={<FiUser />} label="Full Name" editing={editing}
              value={form.name} display={profile?.name}
              onChange={v => setForm(f => ({ ...f, name: v }))} />
            <Field icon={<FiMail />} label="Email Address" editing={false}
              value={profile?.email} display={profile?.email} />
            <Field icon={<FiPhone />} label="Mobile Number" editing={editing}
              value={form.phone} display={profile?.phone || 'Not set'}
              onChange={v => setForm(f => ({ ...f, phone: v }))}
              type="tel" placeholder="+1 234 567 8900" />
            <Field icon={<FiCalendar />} label="Date of Birth" editing={editing}
              value={form.dateOfBirth} display={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}
              onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))}
              type="date" />
            <Field icon={<FiCalendar />} label="Next DSAT Exam Date" editing={editing}
              value={form.nextExamDate} display={profile?.nextExamDate ? new Date(profile.nextExamDate).toLocaleDateString() : 'Not set'}
              onChange={v => setForm(f => ({ ...f, nextExamDate: v }))}
              type="date" />
            {profile?.assignedTutor && (
              <Field icon={<FiUser />} label="Assigned Tutor" editing={false}
                value={profile.assignedTutor.name} display={`${profile.assignedTutor.name} (${profile.assignedTutor.email})`} />
            )}
          </div>
        </div>

        {/* DSAT Exam Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <FiTarget className="text-purple-600" /> DSAT Exam Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center">
              <FiAward className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-900">{profile?.totalDsatAttempts || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total DSAT Attempts</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
              <FiCalendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-sm font-bold text-gray-900">{profile?.lastAttemptDate ? new Date(profile.lastAttemptDate).toLocaleDateString() : 'Not set'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Last Attempt Date</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
              <FiTarget className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-sm font-bold text-gray-900">{profile?.targetExamDate ? new Date(profile.targetExamDate).toLocaleDateString() : 'Not set'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Target Exam Date</div>
            </div>
          </div>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-100">
              <Field icon={<FiAward />} label="Total DSAT Attempts" editing={editing}
                value={form.totalDsatAttempts} display={profile?.totalDsatAttempts || 0}
                onChange={v => setForm(f => ({ ...f, totalDsatAttempts: v }))}
                type="number" placeholder="0" />
              <Field icon={<FiCalendar />} label="Last Attempt Date" editing={editing}
                value={form.lastAttemptDate} display={profile?.lastAttemptDate ? new Date(profile.lastAttemptDate).toLocaleDateString() : 'Not set'}
                onChange={v => setForm(f => ({ ...f, lastAttemptDate: v }))}
                type="date" />
              <Field icon={<FiTarget />} label="Target Exam Date" editing={editing}
                value={form.targetExamDate} display={profile?.targetExamDate ? new Date(profile.targetExamDate).toLocaleDateString() : 'Not set'}
                onChange={v => setForm(f => ({ ...f, targetExamDate: v }))}
                type="date" />
            </div>
          )}
        </div>

        {/* Recent Results */}
        {recentResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <FiBarChart2 className="text-blue-600" /> Recent Results
            </h2>
            <div className="space-y-3">
              {recentResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{r.testTitle}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{new Date(r.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      r.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>{r.subject}</span>
                    <span className="text-lg font-bold text-gray-900">{r.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ icon, label, editing, value, display, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      {editing && onChange ? (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      ) : (
        <p className="text-sm font-medium text-gray-900 py-2">{display}</p>
      )}
    </div>
  )
}
