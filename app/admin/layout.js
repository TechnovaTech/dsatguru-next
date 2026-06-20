'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import {
  FiGrid, FiUsers, FiBookOpen, FiDatabase, FiClipboard, FiCheckSquare, FiList, FiSettings,
  FiLogOut, FiChevronDown, FiMenu, FiX, FiSun, FiMoon,
} from 'react-icons/fi'

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid, path: '/admin/dashboard' },
  {
    id: 'students', label: 'Students', icon: FiUsers, items: [
      { label: 'Master Dashboard', path: '/admin/master-dashboard' },
      { label: 'Students Observation', path: '/admin/students-observation' },
      { label: 'Student Analysis', path: '/admin/student-analysis' },
      { label: 'User Management', path: '/admin/users' },
      { label: 'User Result Management', path: '/admin/user-results' },
    ],
  },
  {
    id: 'courses', label: 'Courses', icon: FiBookOpen, items: [
      { label: 'Manage Courses', path: '/admin/manage-courses' },
      { label: 'Course & Question Bank', path: '/admin/courses' },
      { label: 'Study Plan Management', path: '/admin/study-plan' },
    ],
  },
  {
    id: 'questions', label: 'Questions', icon: FiDatabase, items: [
      { label: 'SAT Question Upload', path: '/admin/sat-question-upload' },
      { label: 'Question Bank Management', path: '/admin/question-bank' },
    ],
  },
  {
    id: 'tests', label: 'Tests', icon: FiClipboard, items: [
      { label: 'Test Management', path: '/admin/test-management' },
      { label: 'Adaptive Results', path: '/admin/adaptive-tests/results' },
      { label: 'Demo Test', path: '/admin/demo-test' },
      { label: 'Test Session Monitoring', path: '/admin/test-sessions' },
    ],
  },
  {
    id: 'tutor', label: 'Tutor', icon: FiCheckSquare, items: [
      { label: 'Tutor Question Bank', path: '/admin/tutor/question-bank' },
      { label: 'Tutor Test Creation', path: '/admin/tutor/create-test' },
      { label: 'Tutor Test Sheets', path: '/admin/tutor/tests' },
      { label: 'Tutor & Students', path: '/admin/tutor/users' },
      { label: 'Tutor Test Results', path: '/admin/tutor/results' },
      { label: 'Create Module Test', path: '/admin/tutor/module-tests/create' },
      { label: 'Module Test Sheets', path: '/admin/tutor/module-tests' },
      { label: 'Module Test Results', path: '/admin/tutor/module-tests/results' },
    ],
  },
  {
    id: 'admin-tests', label: 'Admin Tests', icon: FiList, align: 'right', items: [
      { label: 'Question Bank', path: '/admin/admin-tests/question-bank' },
      { label: 'Create Test', path: '/admin/admin-tests/create-test' },
      { label: 'Test Sheets', path: '/admin/admin-tests/test-sheets' },
      { label: 'Result Analysis', path: '/admin/admin-tests/results' },
    ],
  },
  {
    id: 'more', label: 'More', icon: FiSettings, align: 'right', items: [
      { label: 'Communication', path: '/admin/communication' },
      { label: 'Messages', path: '/admin/messages' },
      { label: 'Bug Reports', path: '/admin/bug-reports' },
      { label: 'Comparison Table', path: '/admin/comparison' },
      { label: 'Payments', path: '/admin/payments' },
      { label: 'Settings', path: '/admin/settings' },
    ],
  },
]

const TUTOR_SECTIONS = [
  {
    id: 'tutor', label: 'Tutor Tests', icon: FiCheckSquare, items: [
      { label: 'Tutor Question Bank', path: '/admin/tutor/question-bank' },
      { label: 'Tutor Test Creation', path: '/admin/tutor/create-test' },
      { label: 'Tutor Test Sheets', path: '/admin/tutor/tests' },
      { label: 'Tutor & Students', path: '/admin/tutor/users' },
      { label: 'Tutor Test Results', path: '/admin/tutor/results' },
    ],
  },
  {
    id: 'module', label: 'Module Tests', icon: FiList, items: [
      { label: 'Create Module Test', path: '/admin/tutor/module-tests/create' },
      { label: 'Module Test Sheets', path: '/admin/tutor/module-tests' },
      { label: 'Module Test Results', path: '/admin/tutor/module-tests/results' },
    ],
  },
]

export default function AdminLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [bugUnread, setBugUnread] = useState(0)

  useEffect(() => {
    if (!loading && (!user || !['Admin', 'TutorAdmin'].includes(user.role))) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => { setMobileOpen(false); setOpenMenu(null) }, [pathname])

  // Load saved theme (admin panel only)
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('adminTheme') === 'dark') setDark(true)
  }, [])

  // Poll the unread bug-report count for the nav badge.
  useEffect(() => {
    if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) return
    let alive = true
    const load = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await fetch('/api/bug-reports/unread-count', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (res.ok && alive) { const d = await res.json(); setBugUnread(d.count || 0) }
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 20000)
    return () => { alive = false; clearInterval(t) }
  }, [user])

  const toggleTheme = () => setDark((d) => {
    const next = !d
    if (typeof window !== 'undefined') localStorage.setItem('adminTheme', next ? 'dark' : 'light')
    return next
  })

  if (loading) return null
  if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) return null

  const sections = user.role === 'TutorAdmin' ? TUTOR_SECTIONS : ADMIN_SECTIONS
  const handleLogout = async () => { await logout(); router.push('/login') }

  const isActive = (sec) => {
    if (sec.path) return pathname === sec.path
    return sec.items?.some((it) => pathname === it.path || pathname.startsWith(it.path + '/'))
  }

  const navBtn = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors'

  return (
    <div className={`min-h-screen bg-slate-50 ${dark ? 'admin-dark' : ''}`}>
      {/* ===== Top navbar ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
          {/* Brand */}
          <Link href="/admin/dashboard" className="flex flex-shrink-0 items-center gap-2">
            <span className="text-lg font-extrabold text-slate-900">
              DSAT<span className="dg-gradient-text">GURU</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.role === 'TutorAdmin' ? 'Tutor Admin' : user.role}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {sections.map((sec) => {
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
                    {sec.id === 'more' && bugUnread > 0 && <span className="ml-0.5 h-2 w-2 rounded-full bg-rose-500" />}
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
                          {it.path === '/admin/bug-reports' && bugUnread > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{bugUnread > 99 ? '99+' : bugUnread}</span>
                          )}
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
            <span className="hidden text-sm text-slate-500 sm:block">Hi, <span className="font-semibold text-slate-800">{user.name?.split(' ')[0]}</span></span>
            <button
              onClick={toggleTheme}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
            >
              {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button onClick={handleLogout} className="hidden items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 sm:flex">
              <FiLogOut size={15} /> Logout
            </button>
            <button onClick={() => setMobileOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 xl:hidden">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[80vh] overflow-y-auto border-t border-slate-100 bg-white px-4 py-4 xl:hidden">
            {sections.map((sec) => (
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
