'use client'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useCourses } from './CourseContext'
import { FiMenu, FiX, FiHome, FiBookOpen, FiInfo, FiPhone, FiArrowUp } from 'react-icons/fi'
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

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setScrolled(y > 10)
      setShowScrollTop(y > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="font-[Poppins]">
      <nav
        className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? 'shadow-md' : 'shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a
            href="/"
            onClick={scrollToTop}
            className="text-3xl font-extrabold text-blue-700 tracking-wide"
          >
            DSATGURU
          </a>

          <div className="hidden md:flex items-center space-x-10">
            <div className="flex space-x-8 items-center">
              <a
                href="/"
                className="flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 text-gray-700"
              >
                <FiHome /> Home
              </a>

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
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50"
                    >
                      {courses.map((course, idx) => {
                        const color = colors[idx % colors.length]
                        return (
                          idx !== colors.length - 1 && course.slug && course.slug !== 'individual-tutoring' && (
                            <a
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
                            </a>
                          )
                        )
                      })}
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
            <button onClick={toggleMenu}>
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
                className="fixed top-0 right-0 h-full w-3/4 bg-white shadow-lg z-50 flex flex-col justify-between px-8 py-12"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-700">Menu</h2>
                    <button onClick={toggleMenu}>
                      <FiX size={28} className="text-gray-700" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <a
                      href="/"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium border-b pb-2"
                    >
                      <FiHome /> Home
                    </a>
                    <a
                      href="/about"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium border-b pb-2"
                    >
                      <FiInfo /> About Us
                    </a>
                    <a
                      href="/contact"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium border-b pb-2"
                    >
                      <FiPhone /> Contact Us
                    </a>
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