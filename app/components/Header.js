'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { useCourses } from './CourseContext'
import { FiMenu, FiX, FiHome, FiBookOpen, FiInfo, FiPhone, FiArrowUp, FiChevronDown } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

const colors = [
  { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
  { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
  { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700" },
]

export default function Header() {
  const { user } = useAuth()
  const { courses } = useCourses()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [dropdownHover, setDropdownHover] = useState(false)
  const [questionBankHover, setQuestionBankHover] = useState(false)
  const [dsatHover, setDsatHover] = useState(false)
  const [psatHover, setPsatHover] = useState(false)
  const [questionBanks, setQuestionBanks] = useState([])
  const [mobileDsatOpen, setMobileDsatOpen] = useState(false)
  const [mobilePsatOpen, setMobilePsatOpen] = useState(false)
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false)
  const [mobileQbOpen, setMobileQbOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setScrolled(y > 10)
      setShowScrollTop(y > 300)
    }

    const fetchQuestionBanks = async () => {
      try {
        const res = await fetch('/api/courses')
        const data = await res.json()
        console.log('All fetched data:', data)
        
        if (data.courses || data.data) {
          const allCourses = data.courses || data.data
          console.log('All courses:', allCourses)
          
          // Filter for question banks
          const qBanks = allCourses.filter(course => {
            console.log('Course type:', course.type, 'Title:', course.title)
            return course.type === 'question_bank'
          })
          
          console.log('Filtered question banks:', qBanks)
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

  const psatLinks = [
    { title: 'PSAT Live Bootcamp Course', href: '/programs/psat/live-bootcamp-course' },
    { title: 'PSAT Live Prep Course', href: '/programs/psat/live-prep-course' },
    { title: 'PSAT Individual Tutoring', href: '/programs/psat/individual-tutoring' },
    { title: 'Reading and Writing Section', href: '/programs/psat/reading-and-writing-section' },
    { title: 'Diagnostic Test', href: '/programs/psat/diagnostic-test' },
    { title: 'Practice Test', href: '/programs/psat/practice-test' },
    { title: 'Mock Test', href: '/programs/psat/mock-test' },
    { title: 'Math Section', href: '/programs/psat/math-section' },
    { title: 'Study-Guide', href: '/programs/psat/study-guide' },
  ]

  return (
    <div className="font-[Poppins]">
      <nav
        className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? 'shadow-md' : 'shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            onClick={scrollToTop}
            className="flex items-center gap-3"
          >
            <div className="relative h-10 w-40 sm:h-12 sm:w-48 lg:h-16 lg:w-56">
              <Image
                src="/logo (2).png"
                alt="DSATGURU"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-10">
            <div className="flex space-x-8 items-center">
              <Link
                href="/"
                className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
              >
                <FiHome /> Home
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setDsatHover(true)}
                onMouseLeave={() => setDsatHover(false)}
              >
                <button
                  className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
                >
                  <FiBookOpen /> DSAT
                </button>
                <AnimatePresence>
                  {dsatHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                      {dsatLinks.map((item, idx) => {
                        const color = colors[idx % colors.length]
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 p-4 ${color.bg} ${color.border} border rounded-lg ${color.text} hover:shadow-md transition-all truncate`}
                          >
                            <FiBookOpen size={20} />
                            <span
                              className="text-sm font-semibold truncate w-full"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setPsatHover(true)}
                onMouseLeave={() => setPsatHover(false)}
              >
                <button
                  className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
                >
                  <FiBookOpen /> PSAT
                </button>
                <AnimatePresence>
                  {psatHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                      {psatLinks.map((item, idx) => {
                        const color = colors[idx % colors.length]
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 p-4 ${color.bg} ${color.border} border rounded-lg ${color.text} hover:shadow-md transition-all truncate`}
                          >
                            <FiBookOpen size={20} />
                            <span
                              className="text-sm font-semibold truncate w-full"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setDropdownHover(true)}
                onMouseLeave={() => setDropdownHover(false)}
              >
                <button
                  className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
                >
                  <FiBookOpen /> Courses
                </button>
                <AnimatePresence>
                  {dropdownHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                      {courses.map((course, idx) => {
                        const color = colors[idx % colors.length]
                        return (
                          idx !== colors.length - 1 && course.slug && course.slug !== 'individual-tutoring' && (
                            <Link
                              key={course.id}
                              href={`/enrollment/${course.courseId || course.id}`}
                              className={`flex items-center gap-3 p-4 ${color.bg} ${color.border} border rounded-lg ${color.text} hover:shadow-md transition-all truncate`}
                            >
                              <FiBookOpen size={20} />
                              <span
                                className="text-sm font-semibold truncate w-full"
                                title={course.title}
                              >
                                {course.title}
                              </span>
                            </Link>
                          )
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setQuestionBankHover(true)}
                onMouseLeave={() => setQuestionBankHover(false)}
              >
                <button
                  className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
                >
                  <FiBookOpen /> Question Banks
                </button>
                <AnimatePresence>
                  {questionBankHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                      {questionBanks.length > 0 ? questionBanks.map((qBank, idx) => {
                        const color = colors[idx % colors.length]
                        return (
                          <Link
                            key={qBank.id}
                            href={`/question-bank/${qBank.id}`}
                            className={`flex items-center gap-3 p-4 ${color.bg} ${color.border} border rounded-lg ${color.text} hover:shadow-md transition-all truncate`}
                          >
                            <FiBookOpen size={20} />
                            <span
                              className="text-sm font-semibold truncate w-full"
                              title={qBank.title}
                            >
                              {qBank.title}
                            </span>
                          </Link>
                        )
                      }) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No question banks available
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <a
                href="/about"
                className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
              >
                <FiInfo /> About Us
              </a>

              <Link
                href="/blog"
                className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
              >
                Blog
              </Link>
              <a
                href="/contact"
                className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
              >
                <FiPhone /> Contact Us
              </a>
            </div>

            {user ? (
              <a
                href={user?.role === 'Admin' ? '/admin' : '/dashboard'}
                className="text-sm bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
              >
                Go to Dashboard
              </a>
            ) : (
              <div className="flex space-x-4">
                <a
                  href="/login"
                  className="text-sm bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                >
                  Login
                </a>
                <a
                  href="/register"
                  className="text-sm border border-blue-600 text-blue-600 px-5 py-2 rounded-md font-medium hover:bg-blue-50 transition cursor-pointer"
                >
                  Signup
                </a>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40"
                onClick={closeMenu}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 right-0 h-full w-3/4 bg-white shadow-lg z-50 flex flex-col justify-between px-8 py-12 overflow-y-auto"
              >
                <div id="mobile-menu">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-700">Menu</h2>
                    <button onClick={toggleMenu} aria-label="Close navigation menu">
                      <FiX size={28} className="text-gray-700" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <Link
                      href="/"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium border-b pb-3"
                    >
                      <FiHome /> Home
                    </Link>

                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setMobileDsatOpen(!mobileDsatOpen)}
                        className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 font-medium py-2"
                      >
                        <span className="flex items-center gap-2">
                          <FiBookOpen /> DSAT
                        </span>
                        <FiChevronDown
                          className={`transition-transform ${mobileDsatOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mobileDsatOpen && (
                        <div className="mt-1 space-y-1">
                          {dsatLinks.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMenu}
                              className="block pl-6 text-sm text-gray-700 hover:text-blue-600 py-1.5 border-b last:border-b-0"
                            >
                              {item.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setMobilePsatOpen(!mobilePsatOpen)}
                        className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 font-medium py-2"
                      >
                        <span className="flex items-center gap-2">
                          <FiBookOpen /> PSAT
                        </span>
                        <FiChevronDown
                          className={`transition-transform ${mobilePsatOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mobilePsatOpen && (
                        <div className="mt-1 space-y-1">
                          {psatLinks.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMenu}
                              className="block pl-6 text-sm text-gray-700 hover:text-blue-600 py-1.5 border-b last:border-b-0"
                            >
                              {item.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)}
                        className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 font-medium py-2"
                      >
                        <span className="flex items-center gap-2">
                          <FiBookOpen /> Courses
                        </span>
                        <FiChevronDown
                          className={`transition-transform ${mobileCoursesOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mobileCoursesOpen && (
                        <div className="mt-1 space-y-1">
                          {courses.map((course) => {
                            if (!course.slug || course.slug === 'individual-tutoring') return null
                            const id = course.courseId || course.id
                            return (
                              <Link
                                key={course.id}
                                href={`/enrollment/${id}`}
                                onClick={closeMenu}
                                className="block pl-6 text-sm text-gray-700 hover:text-blue-600 py-1.5 border-b last:border-b-0"
                              >
                                {course.title}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setMobileQbOpen(!mobileQbOpen)}
                        className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 font-medium py-2"
                      >
                        <span className="flex items-center gap-2">
                          <FiBookOpen /> Question Banks
                        </span>
                        <FiChevronDown
                          className={`transition-transform ${mobileQbOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mobileQbOpen && (
                        <div className="mt-1 space-y-1">
                          {questionBanks.length > 0 ? (
                            questionBanks.map((qBank) => (
                              <Link
                                key={qBank.id}
                                href={`/question-bank/${qBank.id}`}
                                onClick={closeMenu}
                                className="block pl-6 text-sm text-gray-700 hover:text-blue-600 py-1.5 border-b last:border-b-0"
                              >
                                {qBank.title}
                              </Link>
                            ))
                          ) : (
                            <p className="pl-6 text-xs text-gray-500 py-1.5">
                              No question banks available
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <Link
                        href="/about"
                        onClick={closeMenu}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium pb-2"
                      >
                        <FiInfo /> About Us
                      </Link>
                      <Link
                        href="/blog"
                        onClick={closeMenu}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium pb-2"
                      >
                        <FiBookOpen /> Blog
                      </Link>
                      <Link
                        href="/contact"
                        onClick={closeMenu}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium pb-2"
                      >
                        <FiPhone /> Contact Us
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {user ? (
                    <a
                      href={user?.role === 'Admin' ? '/admin' : '/dashboard'}
                      onClick={closeMenu}
                      className="w-full text-center bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                    >
                      Dashboard
                    </a>
                  ) : (
                    <>
                      <a
                        href="/login"
                        onClick={closeMenu}
                        className="w-full text-center bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                      >
                        Login
                      </a>
                      <a
                        href="/register"
                        onClick={closeMenu}
                        className="w-full text-center border border-blue-600 text-blue-600 py-2 rounded-md font-medium hover:bg-blue-50 transition cursor-pointer"
                      >
                        Signup
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50"
            aria-label="Scroll to top"
          >
            <FiArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
