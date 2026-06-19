'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { FiGrid, FiUsers, FiFileText, FiAward, FiMessageSquare, FiLogOut, FiMenu, FiX } from 'react-icons/fi'

const NAV = [
  { label: 'Dashboard', icon: FiGrid, path: '/tutor/dashboard' },
  { label: 'My Students', icon: FiUsers, path: '/tutor/students' },
  { label: 'Test Sheets', icon: FiFileText, path: '/tutor/tests' },
  { label: 'Test Results', icon: FiAward, path: '/tutor/results' },
  { label: 'Messages', icon: FiMessageSquare, path: '/tutor/messages' },
]

export default function TutorLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'Tutor')) router.push('/login')
  }, [user, loading, router])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (loading) return null
  if (!user || user.role !== 'Tutor') return null

  const handleLogout = async () => { await logout(); router.push('/login') }
  const isActive = (p) => pathname === p || pathname.startsWith(p + '/')
  const navBtn = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Top navbar ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
          {/* Brand */}
          <Link href="/tutor/dashboard" className="flex flex-shrink-0 items-center gap-2">
            <span className="text-lg font-extrabold text-slate-900">DSAT<span className="dg-gradient-text">GURU</span></span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Tutor</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`${navBtn} ${isActive(item.path) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <item.icon size={15} /> {item.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">Hi, <span className="font-semibold text-slate-800">{user.name?.split(' ')[0]}</span></span>
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
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <div className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive(item.path) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <item.icon size={15} /> {item.label}
                </Link>
              ))}
            </div>
            <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">
              <FiLogOut size={15} /> Logout
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
