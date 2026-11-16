'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LuArrowRight, LuArrowUp, LuChevronDown, LuMenu, LuPhone, LuX } from 'react-icons/lu'
import { useAuth } from './AuthContext'
import { useCourses } from './CourseContext'
import { Button, Container, Logo, cn } from './site/ui'

const PHONE = '1-329-239-8577'
const PHONE_HREF = 'tel:+13292398577'

const dsatLinks = [
  { title: 'Digital SAT Live Bootcamp Course', href: '/sat-bootcamp-courses' },
  { title: 'Digital SAT Live Prep Course', href: '/sat-live-prep-course' },
  { title: 'Digital SAT Individual Tutoring', href: '/sat-individual-tutoring' },
  { title: 'Reading and Writing Section', href: '/sat-reading-writing' },
  { title: 'Diagnostic Test', href: '/free-sat-diagnostic-test' },
  { title: 'Practice Test', href: '/free-sat-practice-test' },
  { title: 'Mock Test', href: '/free-sat-mock-test' },
  { title: 'Math Section', href: '/sat-math' },
  { title: 'Study-Guide', href: '/sat-study-guide' },
]


export default function Header() {
  const { user } = useAuth()
  const { courses } = useCourses()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileGroup, setMobileGroup] = useState(null)
  const [questionBanks, setQuestionBanks] = useState([])
  const progress = useRef(null)

  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setScrolled(y > 10)
      setShowScrollTop(y > 300)
      setShowDemoBanner(y < 80)
      const max = document.documentElement.scrollHeight - innerHeight
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`
    }

    const fetchQuestionBanks = async () => {
      try {
        const res = await fetch('/api/courses')
        const data = await res.json()
        if (data.courses || data.data) {
          const allCourses = data.courses || data.data
          setQuestionBanks(allCourses.filter((course) => course.type === 'question_bank'))
        }
      } catch (error) {
        console.error('Error fetching question banks:', error)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    fetchQuestionBanks()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when the page changes.
  useEffect(() => {
    setIsOpen(false)
    setOpenMenu(null)
  }, [pathname])

  // Same rules as before: the course list leaves out individual tutoring (it has its own page and phone number).
  const courseLinks = courses
    .filter((course, idx) => course.slug && course.slug !== 'individual-tutoring' && idx !== courses.length - 1)
    .map((course) => ({ key: course.id, title: course.title, href: `/enrollment/${course.courseId || course.id}` }))
  const mobileCourseLinks = courses
    .filter((course) => course.slug && course.slug !== 'individual-tutoring')
    .map((course) => ({ key: course.id, title: course.title, href: `/enrollment/${course.courseId || course.id}` }))
  const bankLinks = questionBanks.map((q) => ({ key: q.id, title: q.title, href: `/enrollment/${q.id}` }))

  const menus = [
    { id: 'dsat', label: 'DSAT', links: dsatLinks.map((l) => ({ key: l.href, ...l })) },
    { id: 'courses', label: 'Courses', links: courseLinks, mobileLinks: mobileCourseLinks },
    { id: 'banks', label: 'Question Banks', links: bankLinks, empty: 'No question banks yet' },
  ]
  const pages = [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ]
  const onHome = pathname === '/'
  const dashboardHref = user?.role === 'Admin' ? '/admin' : '/dashboard'
  const navLink = (active) =>
    cn('relative flex h-10 items-center gap-1 px-3 text-[15px] font-medium transition-colors hover:bg-ink/5', active ? 'bg-ink/5 text-ink' : 'text-ink-2 hover:text-ink')

  return (
    <div className="sticky top-0 z-50">
      {/* Free demo test strip (home page), as before */}
      {onHome && showDemoBanner ? (
        <div className="border-b border-line bg-[var(--bar)] text-[13px] text-panel-ink-2">
          <Container className="flex h-9 items-center justify-center gap-3">
            <span className="animate-pulse-dot size-1.5 shrink-0 bg-brand" aria-hidden="true" />
            <p className="truncate">
              <strong className="font-semibold text-panel-ink">Free DSAT demo test.</strong>
              <span className="hidden sm:inline"> Experience the real interface, no signup needed. Two modules, instant scoring.</span>
            </p>
            <Link href="/demo-test" className="group hidden shrink-0 items-center gap-1 font-semibold text-brand sm:inline-flex">
              Start free demo test <LuArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Container>
        </div>
      ) : null}

      <header className={cn('relative border-b border-line backdrop-blur-md transition-colors', scrolled ? 'bg-[var(--glass)]' : 'bg-page')}>
        <div ref={progress} aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand" />
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {menus.map((m) => (
              <div key={m.id} className="relative" onMouseEnter={() => setOpenMenu(m.id)} onMouseLeave={() => setOpenMenu(null)}>
                <button
                  type="button"
                  className={navLink(openMenu === m.id)}
                  aria-expanded={openMenu === m.id}
                  onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                >
                  {m.label}
                  <LuChevronDown className={cn('size-4 transition-transform', openMenu === m.id && 'rotate-180')} />
                </button>
                {openMenu === m.id ? (
                  <div className="absolute left-0 top-full z-50 w-[340px] pt-2">
                    <div className="animate-pop border border-line bg-surface p-2 shadow-[0_30px_60px_-24px_#00000080]">
                      {m.links.length ? (
                        m.links.map((l) => (
                          <Link
                            key={l.key}
                            href={l.href}
                            onClick={() => setOpenMenu(null)}
                            className="group flex items-center justify-between gap-3 px-3 py-2.5 text-[14.5px] text-ink-2 transition-colors hover:bg-brand-50 hover:text-brand"
                          >
                            <span className="truncate" title={l.title}>
                              {l.title}
                            </span>
                            <LuArrowRight className="size-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                          </Link>
                        ))
                      ) : (
                        <p className="px-3 py-2.5 text-[14px] text-muted">{m.empty || 'Nothing here yet'}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {pages.map((p) => (
              <Link key={p.href} href={p.href} className={navLink(pathname === p.href)}>
                {p.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={PHONE_HREF} className="hidden h-10 items-center gap-2 border border-line px-3 text-[14px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink 2xl:flex">
              <LuPhone className="size-4" /> {PHONE}
            </a>
            <Link
              href="/igcsc/login"
              title="IGCSC — IGCSE Assessment Platform"
              className="hidden h-10 items-center border border-line px-3 font-code text-[12.5px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:border-brand hover:text-brand lg:flex"
            >
              IGCSC
            </Link>
            {user ? (
              <Button href={dashboardHref} size="sm" arrow className="hidden h-10 sm:inline-flex">
                Dashboard
              </Button>
            ) : (
              <>
                <Button href="/login" variant="outline" size="sm" className="hidden h-10 sm:inline-flex">
                  Log in
                </Button>
                <Button href="/register" size="sm" className="hidden h-10 sm:inline-flex">
                  Sign up
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
              className="grid size-10 place-items-center border border-line text-ink xl:hidden"
            >
              <LuMenu className="size-5" />
            </button>
          </div>
        </Container>
      </header>

      {/* Phone / tablet menu: a sheet from the right */}
      {isOpen ? (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={closeMenu} className="absolute inset-0 bg-black/50" />
          <div className="animate-sheet absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col border-l border-line bg-page">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <button type="button" onClick={closeMenu} aria-label="Close menu" className="grid size-10 place-items-center border border-line text-ink">
                <LuX className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile">
              <Link href="/" onClick={closeMenu} className="block border-b border-line py-3.5 text-[17px] font-medium text-ink">
                Home
              </Link>
              {menus.map((m) => {
                const list = m.mobileLinks || m.links
                const open = mobileGroup === m.id
                return (
                  <div key={m.id} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setMobileGroup(open ? null : m.id)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between py-3.5 text-[17px] font-medium text-ink"
                    >
                      {m.label}
                      <LuChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pb-3">
                            {list.length ? (
                              list.map((l) => (
                                <Link key={l.key} href={l.href} onClick={closeMenu} className="block py-2 pl-3 text-[15px] text-ink-2 hover:text-brand">
                                  {l.title}
                                </Link>
                              ))
                            ) : (
                              <p className="py-2 pl-3 text-[15px] text-muted">{m.empty || 'Nothing here yet'}</p>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                )
              })}
              {pages.map((p) => (
                <Link key={p.href} href={p.href} onClick={closeMenu} className="block border-b border-line py-3.5 text-[17px] font-medium text-ink">
                  {p.label}
                </Link>
              ))}
              <Link href="/igcsc/login" onClick={closeMenu} className="block border-b border-line py-3.5 text-[17px] font-medium text-ink">
                IGCSC <span className="text-[14px] font-normal text-muted">· IGCSE platform</span>
              </Link>
              <a href={PHONE_HREF} className="mt-4 flex items-center gap-2 text-[15px] text-ink-2">
                <LuPhone className="size-4 text-brand" /> {PHONE}
              </a>
            </nav>
            <div className="grid gap-2 border-t border-line p-5">
              {user ? (
                <Button href={dashboardHref} arrow onClick={closeMenu}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button href="/register" arrow onClick={closeMenu}>
                    Sign up
                  </Button>
                  <Button href="/login" variant="outline" onClick={closeMenu}>
                    Log in
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Back to top */}
      {showScrollTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="animate-pop fixed bottom-6 right-6 z-50 grid size-12 place-items-center bg-cta text-on-cta shadow-[0_20px_40px_-16px_#000000b3] transition-colors hover:bg-cta-hover"
        >
          <LuArrowUp className="size-5" />
        </button>
      ) : null}
    </div>
  )
}
