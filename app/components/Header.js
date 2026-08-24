'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { useCourses } from './CourseContext'
import {
  FiMenu, FiX, FiHome, FiBookOpen, FiInfo, FiPhone, FiArrowUp,
  FiChevronDown, FiArrowRight, FiLayers, FiEdit3,
} from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { user } = useAuth()
  const { courses } = useCourses()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)
  const [dropdownHover, setDropdownHover] = useState(false)
  const [questionBankHover, setQuestionBankHover] = useState(false)
  const [dsatHover, setDsatHover] = useState(false)
  const [questionBanks, setQuestionBanks] = useState([])
  const [mobileDsatOpen, setMobileDsatOpen] = useState(false)
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false)
  const [mobileQbOpen, setMobileQbOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      const goingDown = y > lastScrollY.current
      setScrolled(y > 10)
      setShowScrollTop(y > 300)
      if (y > 80) {
        setShowDemoBanner(!goingDown)
      } else {
        setShowDemoBanner(true)
      }
      // Hide the whole nav when scrolling down; reveal on scroll up / near top
      setNavHidden(goingDown && y > 160)
      lastScrollY.current = y
    }

    const fetchQuestionBanks = async () => {
      try {
        const res = await fetch('/api/courses')
        const data = await res.json()
        if (data.courses || data.data) {
          const allCourses = data.courses || data.data
          const qBanks = allCourses.filter((course) => course.type === 'question_bank')
          setQuestionBanks(qBanks)
        }
      } catch (error) {
        console.error('Error fetching question banks:', error)
      }
    }

    window.addEventListener('scroll', handleScroll)
    fetchQuestionBanks()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dsatLinks = [
    { title: 'Digital SAT Live Bootcamp Course', href: '/programs/dsat/live-bootcamp-course' },
    { title: 'Digital SAT Live Prep Course', href: '/programs/dsat/live-prep-course' },
    { title: 'Digital SAT Individual Tutoring', href: '/programs/dsat/individual-tutoring' },
    { title: 'Reading and Writing Section', href: '/programs/dsat/reading-and-writing-section' },
    { title: 'Diagnostic Test', href: '/programs/dsat/diagnostic-test' },
    { title: 'Practice Test', href: '/programs/dsat/practice-test' },
    { title: 'Mock Test', href: '/programs/dsat/mock-test' },
    { title: 'Math Section', href: '/programs/dsat/math-section' },
    { title: 'Study-Guide', href: '/programs/dsat/study-guide' },
  ]

  // Pill-style nav trigger
  const navLinkClass =
    'group relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700'

  const DropdownPanel = ({ render }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.16 }}
      className="absolute top-full left-1/2 z-50 w-[20rem] -translate-x-1/2 pt-2"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
        <div className="grid gap-0.5">{render}</div>
      </div>
    </motion.div>
  )

  const linkRow = (key, href, title, idx, onClick) => (
    <Link
      key={key}
      href={href}
      onClick={onClick}
      className="group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover/item:bg-indigo-600 group-hover/item:text-white">
        <FiBookOpen size={15} />
      </span>
      <span className="truncate text-[13px] font-medium text-slate-700 group-hover/item:text-indigo-700" title={title}>
        {title}
      </span>
    </Link>
  )

  const onHome = pathname === '/'

  return (
    <div className="dg">
      {/* ===== Floating island header (overlays the hero) ===== */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={`transition-transform duration-500 ease-out will-change-transform ${
            navHidden ? '-translate-y-[140%]' : 'translate-y-0'
          }`}
        >
        {/* Demo Test sub-banner — home page (shown to everyone) */}
        {onHome && (
          <AnimatePresence>
            {showDemoBanner && (
              <motion.div
                key="demo-banner"
                initial={{ y: -44, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -44, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-indigo-700 text-white"
              >
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
                  <p className="hidden text-[13px] font-medium sm:block">
                    🎯 Experience the real DSAT interface — free, no signup needed. Two modules, instant scoring.
                  </p>
                  <p className="text-[13px] font-medium sm:hidden">🎯 Free DSAT Demo Test — no signup!</p>
                  <a
                    href="/demo-test"
                    className="flex-shrink-0 rounded-full bg-white px-4 py-1.5 text-[13px] font-bold text-indigo-600 shadow transition-transform hover:-translate-y-0.5"
                  >
                    Start Free Demo Test →
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* The pill */}
        <div className="px-3 sm:px-4">
          <div
            className={`mx-auto mt-3 max-w-7xl rounded-full border transition-all duration-300 ${
              scrolled
                ? 'border-slate-200 bg-white shadow-lg shadow-slate-900/5'
                : 'border-white/60 bg-white/85 shadow-md shadow-slate-900/5 backdrop-blur-xl'
            }`}
          >
            <nav className="relative flex items-center justify-between gap-2 rounded-full px-3 py-2">
              {/* Logo */}
              <Link
                href="/"
                onClick={scrollToTop}
                className="flex flex-shrink-0 items-center pl-1 transition-transform duration-300 hover:scale-[1.04]"
                aria-label="DSATGURU home"
              >
                <Image
                  src="/logo-dsg-trans.png"
                  alt="DSG — Score Higher, Dream Bigger"
                  width={242}
                  height={176}
                  priority
                  className="h-9 w-auto object-contain sm:h-10 lg:h-11"
                />
              </Link>

              {/* Center links */}
              <div className="mx-auto hidden items-center gap-0.5 lg:flex">
                <Link href="/" className={navLinkClass}>
                  <FiHome size={15} /> Home
                </Link>

                <div className="relative" onMouseEnter={() => setDsatHover(true)} onMouseLeave={() => setDsatHover(false)}>
                  <button className={navLinkClass}>
                    <FiBookOpen size={15} /> DSAT <FiChevronDown className={`transition-transform ${dsatHover ? 'rotate-180' : ''}`} size={13} />
                  </button>
                  <AnimatePresence>
                    {dsatHover && <DropdownPanel render={dsatLinks.map((item, idx) => linkRow(item.href, item.href, item.title, idx))} />}
                  </AnimatePresence>
                </div>

                <div className="relative" onMouseEnter={() => setDropdownHover(true)} onMouseLeave={() => setDropdownHover(false)}>
                  <button className={navLinkClass}>
                    <FiLayers size={15} /> Courses <FiChevronDown className={`transition-transform ${dropdownHover ? 'rotate-180' : ''}`} size={13} />
                  </button>
                  <AnimatePresence>
                    {dropdownHover && (
                      <DropdownPanel
                        render={courses.map((course, idx) =>
                          idx !== courses.length - 1 && course.slug && course.slug !== 'individual-tutoring'
                            ? linkRow(course.id, `/enrollment/${course.courseId || course.id}`, course.title, idx)
                            : null
                        )}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" onMouseEnter={() => setQuestionBankHover(true)} onMouseLeave={() => setQuestionBankHover(false)}>
                  <button className={navLinkClass}>
                    <FiEdit3 size={15} /> Question Banks <FiChevronDown className={`transition-transform ${questionBankHover ? 'rotate-180' : ''}`} size={13} />
                  </button>
                  <AnimatePresence>
                    {questionBankHover && (
                      <DropdownPanel
                        render={
                          questionBanks.length > 0
                            ? questionBanks.map((qBank, idx) => linkRow(qBank.id, `/question-bank/${qBank.id}`, qBank.title, idx))
                            : <div className="p-4 text-center text-sm text-slate-400">No question banks available</div>
                        }
                      />
                    )}
                  </AnimatePresence>
                </div>

                <a href="/about" className={navLinkClass}>
                  <FiInfo size={15} /> About
                </a>
                <Link href="/blog" className={navLinkClass}>
                  Blog
                </Link>
                <a href="/contact" className={navLinkClass}>
                  <FiPhone size={15} /> Contact
                </a>
              </div>

              {/* Right CTAs */}
              <div className="hidden flex-shrink-0 items-center gap-2 lg:flex">
                {/* Separate IGCSC (IGCSE) platform entry */}
                <a
                  href="/igcsc/login"
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                  title="IGCSC — IGCSE Assessment Platform"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-indigo-600 to-blue-600 text-[8px] font-black text-white">iG</span>
                  IGCSC
                </a>
                {user ? (
                  <a
                    href={user?.role === 'Admin' ? '/admin' : '/dashboard'}
                    className="dg-shine relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5"
                  >
                    Dashboard <FiArrowRight size={15} />
                  </a>
                ) : (
                  <>
                    <a href="/login" className="rounded-full px-4 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-900/5">
                      Login
                    </a>
                    <a
                      href="/register"
                      className="dg-shine relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5"
                    >
                      Sign up <FiArrowRight size={15} />
                    </a>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={toggleMenu}
                aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md lg:hidden"
              >
                {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            </nav>
          </div>
        </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900"
                onClick={closeMenu}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 z-50 flex h-full w-4/5 max-w-sm flex-col justify-between overflow-y-auto bg-white px-7 py-8 shadow-2xl"
              >
                <div id="mobile-menu">
                  <div className="mb-6 flex items-center justify-between">
                    <Image src="/logo-dsg-trans.png" alt="DSG" width={242} height={176} className="h-9 w-auto object-contain" />
                    <button
                      onClick={toggleMenu}
                      aria-label="Close navigation menu"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <FiX size={22} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Link href="/" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">
                      <FiHome /> Home
                    </Link>

                    {[
                      { label: 'DSAT', open: mobileDsatOpen, set: setMobileDsatOpen, links: dsatLinks },
                    ].map((grp) => (
                      <div key={grp.label} className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={() => grp.set(!grp.open)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50"
                        >
                          <span className="flex items-center gap-2"><FiBookOpen /> {grp.label}</span>
                          <FiChevronDown className={`transition-transform ${grp.open ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {grp.open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="space-y-0.5 pb-2">
                                {grp.links.map((item) => (
                                  <Link key={item.href} href={item.href} onClick={closeMenu} className="block rounded-lg py-2 pl-10 text-sm text-slate-600 hover:text-indigo-600">
                                    {item.title}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}

                    <div className="border-t border-slate-100 pt-1">
                      <button type="button" onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50">
                        <span className="flex items-center gap-2"><FiLayers /> Courses</span>
                        <FiChevronDown className={`transition-transform ${mobileCoursesOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {mobileCoursesOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-0.5 pb-2">
                              {courses.map((course) => {
                                if (!course.slug || course.slug === 'individual-tutoring') return null
                                const id = course.courseId || course.id
                                return (
                                  <Link key={course.id} href={`/enrollment/${id}`} onClick={closeMenu} className="block rounded-lg py-2 pl-10 text-sm text-slate-600 hover:text-indigo-600">
                                    {course.title}
                                  </Link>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button type="button" onClick={() => setMobileQbOpen(!mobileQbOpen)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50">
                        <span className="flex items-center gap-2"><FiEdit3 /> Question Banks</span>
                        <FiChevronDown className={`transition-transform ${mobileQbOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {mobileQbOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-0.5 pb-2">
                              {questionBanks.length > 0 ? (
                                questionBanks.map((qBank) => (
                                  <Link key={qBank.id} href={`/question-bank/${qBank.id}`} onClick={closeMenu} className="block rounded-lg py-2 pl-10 text-sm text-slate-600 hover:text-indigo-600">
                                    {qBank.title}
                                  </Link>
                                ))
                              ) : (
                                <p className="py-2 pl-10 text-xs text-slate-400">No question banks available</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 pt-1">
                      <Link href="/about" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">
                        <FiInfo /> About Us
                      </Link>
                      <Link href="/blog" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">
                        <FiBookOpen /> Blog
                      </Link>
                      <Link href="/contact" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">
                        <FiPhone /> Contact Us
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {user ? (
                    <a href={user?.role === 'Admin' ? '/admin' : '/dashboard'} onClick={closeMenu} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">
                      Dashboard
                    </a>
                  ) : (
                    <>
                      <a href="/login" onClick={closeMenu} className="w-full rounded-full border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Login
                      </a>
                      <a href="/register" onClick={closeMenu} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">
                        Sign up
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 transition-transform hover:-translate-y-1"
            aria-label="Scroll to top"
          >
            <FiArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
