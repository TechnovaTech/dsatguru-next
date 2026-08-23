'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../components/AuthContext'
import {
  FiGrid, FiAward, FiDatabase, FiLayers, FiClipboard, FiMic, FiSend, FiActivity,
  FiUsers, FiTrendingUp, FiBarChart2, FiFileText, FiPieChart, FiLogOut,
  FiMenu, FiX, FiChevronDown,
} from 'react-icons/fi'

// Top-nav structure: two primary links + three grouped dropdowns. Rendered in DsatGuru's UI.
const LINKS = [
  { label: 'Dashboard', path: '/igcsc', icon: FiGrid, exact: true },
  { label: 'Leaderboard', path: '/igcsc/leaderboard', icon: FiAward },
]
const GROUPS = [
  {
    id: 'assessments', label: 'Assessments', icon: FiClipboard, items: [
      { label: 'Question Bank', path: '/igcsc/question-bank', icon: FiDatabase },
      { label: 'APT · SMS · CSQ', path: '/igcsc/assessments', icon: FiLayers },
      { label: 'Tests', path: '/igcsc/tests', icon: FiClipboard },
      { label: 'Oral Tests', path: '/igcsc/oral-tests', icon: FiMic },
      { label: 'Test Allocation', path: '/igcsc/test-allocation', icon: FiSend },
      { label: 'Assessment Tracker', path: '/igcsc/assessment-tracker', icon: FiActivity },
    ],
  },
  {
    id: 'students', label: 'Students', icon: FiUsers, items: [
      { label: 'Users', path: '/igcsc/users', icon: FiUsers },
      { label: 'Student Tracker', path: '/igcsc/student-tracker', icon: FiTrendingUp },
      { label: 'Student Performance', path: '/igcsc/student-performance', icon: FiBarChart2 },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: FiPieChart, items: [
      { label: 'Test Report', path: '/igcsc/reports', icon: FiFileText },
      { label: 'Reports', path: '/igcsc/analytics', icon: FiPieChart },
    ],
  },
]

// Flat list for resolving the current page title.
export const NAV = [{ group: '', items: [...LINKS, ...GROUPS.flatMap((g) => g.items)] }]
const FLAT = [...LINKS, ...GROUPS.flatMap((g) => g.items)]

const isActive = (item, pathname) =>
  item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/')

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-black text-white shadow-sm">iG</span>
      <div className="leading-none">
        <div className="text-base font-extrabold tracking-tight text-slate-900">IGCSC</div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Assessment Suite</div>
      </div>
    </div>
  )
}

export default function IgcscLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    if (!loading && (!user || !['Admin', 'TutorAdmin'].includes(user.role))) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => { setOpenMenu(null); setMobileOpen(false) }, [pathname])

  // Close dropdowns on outside click.
  useEffect(() => {
    const onClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const activeItem = useMemo(
    () => FLAT.filter((i) => isActive(i, pathname)).sort((a, b) => b.path.length - a.path.length)[0],
    [pathname]
  )

  if (loading) return null
  if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) return null

  const handleLogout = async () => { await logout(); router.push('/login') }
  const initials = (user.name || user.email || 'A').trim().slice(0, 2).toUpperCase()
  const linkCls = (active) => `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`
  const groupActive = (g) => g.items.some((it) => isActive(it, pathname))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Top navbar ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/igcsc"><BrandMark /></Link>

          {/* Desktop nav */}
          <nav ref={navRef} className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.path} href={l.path} className={linkCls(isActive(l, pathname))}>
                <l.icon size={15} /> {l.label}
              </Link>
            ))}
            {GROUPS.map((g) => (
              <div key={g.id} className="relative">
                <button
                  onClick={() => setOpenMenu((m) => (m === g.id ? null : g.id))}
                  className={linkCls(groupActive(g) || openMenu === g.id)}
                >
                  <g.icon size={15} /> {g.label}
                  <FiChevronDown size={13} className={`transition-transform ${openMenu === g.id ? 'rotate-180' : ''}`} />
                </button>
                {openMenu === g.id && (
                  <div className="absolute left-0 top-full z-[60] mt-2 w-60 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl">
                    {g.items.map((it) => (
                      <Link key={it.path} href={it.path}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${isActive(it, pathname) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <it.icon size={15} className="text-slate-400" /> {it.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

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
            <button onClick={() => setMobileOpen((o) => !o)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-0.5">
              {FLAT.map((it) => (
                <Link key={it.path} href={it.path}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive(it, pathname) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <it.icon size={16} className="text-slate-400" /> {it.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  )
}
