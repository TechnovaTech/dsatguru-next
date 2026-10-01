'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { igcscToken, igcscUser, igcscTokenExpired, igcscLogout } from './_components/auth'
import { apiGetSafe } from './_components/api'
import Watermark from '../components/Watermark'
import {
  FiGrid, FiDatabase, FiSend, FiUsers, FiBarChart2, FiLogOut, FiMenu, FiX,
  FiVideo, FiEdit3, FiUser, FiShoppingBag, FiBookOpen, FiCheckSquare, FiTag,
} from 'react-icons/fi'

// Staff run the centre; students sit exams. They share a shell and nothing else.
const STUDENT_LINKS = [
  { label: 'Dashboard', path: '/igcsc', icon: FiGrid, exact: true },
  { label: 'Test Papers', path: '/igcsc/store', icon: FiShoppingBag },
  { label: 'My Tests', path: '/igcsc/my-tests', icon: FiBookOpen },
  { label: 'Practice', path: '/igcsc/practice', icon: FiEdit3 },
  { label: 'My Results', path: '/igcsc/my-results', icon: FiBarChart2 },
  { label: 'Live Classes', path: '/igcsc/meetings', icon: FiVideo },
  { label: 'Profile', path: '/igcsc/profile', icon: FiUser },
]

// Seven plain links, in the order the work happens: find a paper, give it to
// students, check what comes back. There used to be five dropdowns of
// seventeen pages, most of them built on an old test model that never held a
// single record - an admin could not tell where anything was.
const STAFF_LINKS = [
  { label: 'Dashboard', path: '/igcsc', icon: FiGrid, exact: true },
  { label: 'Question Bank', path: '/igcsc/question-bank', icon: FiDatabase },
  { label: 'Users', path: '/igcsc/users', icon: FiUsers },
  { label: 'Assigned', path: '/igcsc/paper-assign', icon: FiSend },
  { label: 'Marking', path: '/igcsc/grading', icon: FiCheckSquare, badge: 'marking' },
  { label: 'Live Classes', path: '/igcsc/meetings', icon: FiVideo },
  { label: 'Store', path: '/igcsc/store-admin', icon: FiTag, adminOnly: true },
]

// Everything a student must never reach. The nav hides them; this bounces a
// typed URL as well.
const STAFF_ONLY = [
  '/igcsc/question-bank', '/igcsc/exam-paper', '/igcsc/users',
  '/igcsc/store-admin', '/igcsc/paper-assign', '/igcsc/grading',
]

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

function CountBadge({ n }) {
  if (!n) return null
  return (
    <span className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold leading-5 text-white">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function IgcscLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(undefined) // undefined = checking, null = none
  const [mobileOpen, setMobileOpen] = useState(false)
  // Answers waiting for a tutor, shown on the Marking link.
  const [toCheck, setToCheck] = useState(0)

  const isLoginPage = pathname === '/igcsc/login'
  // Class join links are public: a guest has no account, and a signed-in user's
  // token is still checked by the meeting API. Both render without the portal
  // chrome and without the auth guard.
  const isJoinPage = pathname.startsWith('/igcsc/join/')
  // Registration must be reachable without an account — same trap as the join
  // page: the guard would send a would-be student to a login they cannot pass.
  const isRegisterPage = pathname === '/igcsc/register'
  const isPublicPage = isLoginPage || isJoinPage || isRegisterPage
  // A timed test and a printable answer sheet take the whole screen: the
  // portal header would sit on top of the timer, and would print.
  const isBarePage = /^\/igcsc\/attempt\/[^/]+\/(mcq|print)(\/|$)/.test(pathname)

  useEffect(() => {
    if (isPublicPage) return
    const t = igcscToken()
    if (!t || igcscTokenExpired(t)) { router.replace('/igcsc/login'); return }
    const u = igcscUser()
    // A student must not reach a staff screen by typing its URL — those pages
    // hold the question bank, the user list and other students' work.
    if (u?.role === 'student' && STAFF_ONLY.some((base) => pathname === base || pathname.startsWith(base + '/'))) {
      router.replace('/igcsc')
      return
    }
    setUser(u)
  }, [pathname, router, isPublicPage])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  // The Marking badge: refreshed on every page change (the layout itself never
  // remounts) and once a minute, so it falls as answers are checked.
  const isStaff = user?.role === 'admin' || user?.role === 'tutor'
  useEffect(() => {
    if (!isStaff) return undefined
    let alive = true
    const load = async () => {
      const r = await apiGetSafe('/api/igcsc/grading?status=needs_review', null)
      if (alive && r?.counts) setToCheck(Number(r.counts.needs_review || 0))
    }
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [isStaff, pathname])

  // The login page renders full-screen with no portal chrome or guard.
  if (isPublicPage) return <>{children}</>
  if (!user) return null
  if (isBarePage) {
    return (
      <>
        {children}
        {user?.email && <Watermark label={user.email} />}
      </>
    )
  }

  const handleLogout = () => { igcscLogout(); router.push('/igcsc/login') }
  const initials = (user.name || user.email || 'A').trim().slice(0, 2).toUpperCase()
  const linkCls = (active) => `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`
  const roleLabel = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''
  const isStudent = user.role === 'student'
  const links = isStudent ? STUDENT_LINKS : STAFF_LINKS.filter((l) => user.role === 'admin' || !l.adminOnly)
  const badgeFor = (l) => (l.badge === 'marking' ? toCheck : 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/igcsc"><BrandMark /></Link>
          {/* Seven links do not fit an iPad in landscape: the full row waits for
              xl, and the menu button covers everything below it. */}
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {links.map((l) => (
              <Link key={l.path} href={l.path} className={linkCls(isActive(l, pathname))}>
                <l.icon size={15} /> {l.label} <CountBadge n={badgeFor(l)} />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/igcsc/profile" className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition-colors hover:bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white">{initials}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-slate-800">{user.name || 'Administrator'}</span>
                <span className="block text-[10px] text-slate-400">{roleLabel}</span>
              </span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Logout">
              <FiLogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
            <button onClick={() => setMobileOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 xl:hidden" aria-label="Menu">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              {!mobileOpen && toCheck > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-600" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 xl:hidden">
            <div className="flex flex-col gap-0.5">
              {links.map((it) => (
                <Link key={it.path} href={it.path} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive(it, pathname) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <it.icon size={16} className="text-slate-400" /> {it.label} <CountBadge n={badgeFor(it)} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      {user?.email && <Watermark label={user.email} />}
    </div>
  )
}
