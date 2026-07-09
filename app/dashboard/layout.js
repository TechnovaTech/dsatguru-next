'use client'
import Link from 'next/link'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { logActivity, prettyPath } from '../../lib/clientActivity'
import {
  FiGrid, FiFileText, FiBook, FiBarChart2, FiBookOpen, FiMoreHorizontal,
  FiUser, FiLogOut, FiChevronDown, FiMenu, FiX,
} from 'react-icons/fi'
import BugReportWidget from '../components/BugReportWidget'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid, path: '/dashboard' },
  // The single place a student sees every test assigned to them.
  { id: 'mytests', label: 'My Tests', icon: FiFileText, path: '/dashboard/tests' },
  {
    id: 'tests', label: 'Practice', icon: FiFileText, items: [
      { label: 'Create Practice', path: '/dashboard/tests/create' },
      { label: 'Practice History', path: '/dashboard/tests/history' },
      { label: 'Adaptive Practice', path: '/dashboard/adaptive-tests' },
      { label: 'Mock Exams', path: '/dashboard/admin-tests' },
      { label: 'Retest', path: '/dashboard/tests/retest' },
    ],
  },
  {
    id: 'tutor', label: 'Tutor Tests', icon: FiBook, items: [
      { label: 'Math', path: '/dashboard/tutor/math' },
      { label: 'Reading & Writing', path: '/dashboard/tutor/rw' },
      { label: 'Full-Length Section Tests', path: '/dashboard/tutor/module-tests' },
    ],
  },
  {
    id: 'progress', label: 'Progress', icon: FiBarChart2, items: [
      { label: 'Analytics', path: '/dashboard/analytics' },
      { label: 'Score Tracker', path: '/dashboard/score-tracker' },
      { label: 'Daily Tracker', path: '/dashboard/daily-tracker' },
      { label: 'Study Plan', path: '/dashboard/study-plan' },
      { label: 'Error Log', path: '/dashboard/error-log' },
      { label: 'My Redo Queue', path: '/dashboard/redo-queue' },
    ],
  },
  {
    id: 'learn', label: 'Learn', icon: FiBookOpen, items: [
      { label: 'Live Classes', path: '/dashboard/live-classes' },
      { label: 'Live Courses', path: '/dashboard/courses' },
      { label: 'Question Banks', path: '/dashboard/question-banks' },
      { label: 'Formula Sheet', path: '/dashboard/formula-sheet' },
    ],
  },
  {
    id: 'more', label: 'More', icon: FiMoreHorizontal, align: 'right', items: [
      { label: 'Profile', path: '/dashboard/profile' },
      { label: 'Messages', path: '/dashboard/messages' },
      { label: 'Announcements', path: '/dashboard/announcements' },
      { label: 'Payments', path: '/dashboard/payments' },
    ],
  },
]

export default function DashboardLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => { setMobileOpen(false); setOpenMenu(null) }, [pathname])

  // Record every page the student visits (one entry per navigation).
  const lastPath = useRef(null)
  useEffect(() => {
    if (user && pathname && pathname !== lastPath.current) {
      lastPath.current = pathname
      logActivity('page_view', 'Visited ' + prettyPath(pathname), { path: pathname })
    }
  }, [pathname, user])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    )
  }

  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const handleLogout = async () => { await logout(); router.push('/login') }

  const isActive = (sec) => {
    if (sec.path) return pathname === sec.path
    return sec.items?.some((it) => pathname === it.path || pathname.startsWith(it.path + '/'))
  }
  const navBtn = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Top navbar ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
          {/* Brand */}
          <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2">
            <span className="text-lg font-extrabold text-slate-900">DSAT<span className="dg-gradient-text">GURU</span></span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">Student</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {SECTIONS.map((sec) => {
              const active = isActive(sec)
              if (sec.path) {
                return (
                  <Link key={sec.id} href={sec.path} className={`${navBtn} ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <sec.icon size={15} /> {sec.label}
                  </Link>
                )
              }
              return (
                <div key={sec.id} className="relative">
                  <button
                    onClick={() => setOpenMenu((m) => (m === sec.id ? null : sec.id))}
                    className={`${navBtn} ${active || openMenu === sec.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <sec.icon size={15} /> {sec.label}
                    <FiChevronDown size={13} className={`transition-transform ${openMenu === sec.id ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenu === sec.id && (
                    <div className={`absolute top-full ${sec.align === 'right' ? 'right-0' : 'left-0'} z-[60] mt-2 w-60 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl`}>
                      {sec.items.map((it) => (
                        <Link
                          key={it.path}
                          href={it.path}
                          onClick={() => setOpenMenu(null)}
                          className={`block px-4 py-2 text-sm transition-colors ${pathname === it.path ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}
                        >
                          {it.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Right */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <BugReportWidget />
            <Link href="/dashboard/profile" className="hidden items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{initials}</span>
              <span className="text-sm font-medium text-slate-700">{user.name?.split(' ')[0]}</span>
            </Link>
            <button onClick={handleLogout} className="hidden items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 sm:flex">
              <FiLogOut size={15} /> Logout
            </button>
            <button onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[80vh] overflow-y-auto border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            {SECTIONS.map((sec) => (
              <div key={sec.id} className="mb-3">
                {sec.path ? (
                  <Link href={sec.path} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${isActive(sec) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-800'}`}>
                    <sec.icon size={15} /> {sec.label}
                  </Link>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <sec.icon size={13} /> {sec.label}
                    </div>
                    <div className="space-y-0.5">
                      {sec.items.map((it) => (
                        <Link key={it.path} href={it.path} className={`block rounded-lg py-2 pl-9 pr-3 text-sm ${pathname === it.path ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                          {it.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">
              <FiLogOut size={15} /> Logout
            </button>
          </div>
        )}
      </header>

      {/* click-outside backdrop for dropdowns */}
      {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
