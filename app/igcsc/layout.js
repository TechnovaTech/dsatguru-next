'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../components/AuthContext'
import {
  FiGrid, FiAward, FiDatabase, FiLayers, FiClipboard, FiMic, FiSend, FiActivity,
  FiUsers, FiTrendingUp, FiBarChart2, FiFileText, FiPieChart, FiUser, FiLogOut,
  FiMenu, FiX, FiChevronRight,
} from 'react-icons/fi'

// Sidebar structure mirrors the reference tutor portal, rendered in DsatGuru's UI.
export const NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', path: '/igcsc', icon: FiGrid, exact: true },
      { label: 'Leaderboard', path: '/igcsc/leaderboard', icon: FiAward },
    ],
  },
  {
    group: 'Assessments',
    items: [
      { label: 'Question Bank', path: '/igcsc/question-bank', icon: FiDatabase },
      { label: 'APT · SMS · CSQ', path: '/igcsc/assessments', icon: FiLayers },
      { label: 'Tests', path: '/igcsc/tests', icon: FiClipboard },
      { label: 'Oral Tests', path: '/igcsc/oral-tests', icon: FiMic },
      { label: 'Test Allocation', path: '/igcsc/test-allocation', icon: FiSend },
      { label: 'Assessment Tracker', path: '/igcsc/assessment-tracker', icon: FiActivity },
    ],
  },
  {
    group: 'Students',
    items: [
      { label: 'Users', path: '/igcsc/users', icon: FiUsers },
      { label: 'Student Tracker', path: '/igcsc/student-tracker', icon: FiTrendingUp },
      { label: 'Student Performance', path: '/igcsc/student-performance', icon: FiBarChart2 },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Test Report', path: '/igcsc/reports', icon: FiFileText },
      { label: 'Reports', path: '/igcsc/analytics', icon: FiPieChart },
    ],
  },
]

const FLAT = NAV.flatMap((g) => g.items)

function isActive(item, pathname) {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(item.path + '/')
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg font-black text-white ring-1 ring-white/25">
        iG
      </span>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-tight text-white">IGCSC</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-200">Assessment Suite</div>
      </div>
    </div>
  )
}

function SidebarContent({ pathname, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link href="/igcsc" onClick={onNavigate}><BrandMark /></Link>
      </div>
      <nav className="dg-no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80">{group.group}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item, pathname)
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-white/20 text-white shadow-sm' : 'text-indigo-100/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon size={17} className={active ? 'text-white' : 'text-indigo-200'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <FiChevronRight size={14} className="text-white/70" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}

export default function IgcscLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !['Admin', 'TutorAdmin'].includes(user.role))) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const activeItem = useMemo(
    () => FLAT.filter((i) => isActive(i, pathname)).sort((a, b) => b.path.length - a.path.length)[0],
    [pathname]
  )

  if (loading) return null
  if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) return null

  const handleLogout = async () => { await logout(); router.push('/login') }
  const initials = (user.name || user.email || 'A').trim().slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Desktop sidebar ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-gradient-to-b from-indigo-800 via-indigo-700 to-blue-800 lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ===== Mobile drawer ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-indigo-800 via-indigo-700 to-blue-800 shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-white/80 hover:text-white">
              <FiX size={20} />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ===== Main column ===== */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
              <FiMenu size={20} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{activeItem?.label || 'Dashboard'}</h2>
              <p className="hidden text-[11px] text-slate-400 sm:block">IGCSC Assessment Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/igcsc/profile" className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition-colors hover:bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white">{initials}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-slate-800">{user.name || 'Administrator'}</span>
                <span className="block text-[10px] text-slate-400">{user.role}</span>
              </span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Logout">
              <FiLogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
