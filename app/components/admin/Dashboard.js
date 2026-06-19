'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FiUsers, FiUserCheck, FiBookOpen, FiHelpCircle, FiFileText, FiAward, FiTrendingUp, FiDollarSign,
  FiArrowRight, FiArrowUpRight, FiPlus, FiUpload, FiLayers, FiCreditCard, FiBarChart2, FiFlag, FiGrid,
} from 'react-icons/fi'

const statMeta = [
  { key: 'students', title: 'Total Students', icon: <FiUsers />, grad: 'from-indigo-500 to-indigo-600' },
  { key: 'tutors', title: 'Total Tutors', icon: <FiUserCheck />, grad: 'from-blue-500 to-blue-600' },
  { key: 'courses', title: 'Courses', icon: <FiBookOpen />, grad: 'from-teal-500 to-teal-600' },
  { key: 'questions', title: 'Questions', icon: <FiHelpCircle />, grad: 'from-violet-500 to-violet-600' },
  { key: 'sessions', title: 'Test Sessions', icon: <FiFileText />, grad: 'from-sky-500 to-sky-600' },
  { key: 'enrollments', title: 'Enrollments', icon: <FiAward />, grad: 'from-emerald-500 to-emerald-600' },
  { key: 'averageScore', title: 'Avg. Score', icon: <FiTrendingUp />, grad: 'from-amber-500 to-orange-500' },
  { key: 'revenue', title: 'Revenue', icon: <FiDollarSign />, grad: 'from-rose-500 to-pink-600', money: true },
]

const quickLinks = [
  { label: 'Manage Users', href: '/admin/users', icon: <FiUsers />, c: 'bg-indigo-50 text-indigo-600' },
  { label: 'Courses', href: '/admin/courses', icon: <FiBookOpen />, c: 'bg-teal-50 text-teal-600' },
  { label: 'Question Bank', href: '/admin/question-bank', icon: <FiLayers />, c: 'bg-violet-50 text-violet-600' },
  { label: 'Test Management', href: '/admin/test-management', icon: <FiFileText />, c: 'bg-sky-50 text-sky-600' },
  { label: 'Payments', href: '/admin/payments', icon: <FiCreditCard />, c: 'bg-rose-50 text-rose-600' },
  { label: 'Student Progress', href: '/admin/master-dashboard', icon: <FiBarChart2 />, c: 'bg-blue-50 text-blue-600' },
  { label: 'Comparison', href: '/admin/comparison', icon: <FiGrid />, c: 'bg-emerald-50 text-emerald-600' },
  { label: 'Flagged Questions', href: '/admin/flagged-questions', icon: <FiFlag />, c: 'bg-amber-50 text-amber-600' },
]

const avatarColors = ['bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-violet-500', 'bg-rose-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500']

function fmt(v, money) {
  if (v == null) return money ? '$0' : '0'
  const n = Math.round(v)
  return (money ? '$' : '') + n.toLocaleString()
}

export default function Dashboard() {
  const [totals, setTotals] = useState({})
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    ;(async () => {
      try {
        const [aRes, uRes] = await Promise.all([
          fetch('/api/admin/analytics', { headers }),
          fetch('/api/admin/users?role=Student', { headers }),
        ])
        if (aRes.ok) setTotals((await aRes.json()).totals || {})
        if (uRes.ok) {
          const u = await uRes.json()
          setStudents((Array.isArray(u) ? u : u.users || []).slice(0, 6))
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
            Admin <span className="dg-gradient-text">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Overview of your DSATGURU platform at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/sat-question-upload" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5">
            <FiUpload /> Upload Questions
          </Link>
          <Link href="/admin/courses" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700">
            <FiPlus /> Add Course
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statMeta.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.grad} opacity-10 blur-xl`} />
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
              {s.icon}
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
              {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" /> : fmt(totals[s.key], s.money)}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">{s.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Lower grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent students */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Students</h3>
            <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
              View all <FiArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-50" />)}
            </div>
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No students yet.</p>
          ) : (
            <div className="space-y-2">
              {students.map((st, i) => {
                const initials = (st.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <div key={st._id || st.id || i} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColors[i % avatarColors.length]}`}>
                        {initials}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-500">{st.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {st.targetScore ? <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600">Target {st.targetScore}</span> : null}
                      {st.createdAt && <p className="mt-1 text-[11px] text-slate-400">{new Date(st.createdAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex flex-col gap-2 rounded-xl border border-slate-100 p-4 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${q.c}`}>{q.icon}</span>
                <span className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  {q.label}
                  <FiArrowUpRight className="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
