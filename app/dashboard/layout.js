'use client'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'
import { FiMenu, FiX, FiGrid, FiBook, FiLogOut, FiTarget, FiBarChart, FiDatabase, FiDollarSign, FiFileText, FiChevronDown, FiChevronRight, FiClipboard, FiPieChart, FiActivity, FiClock, FiVideo, FiUser, FiCalendar, FiMessageSquare, FiZap } from 'react-icons/fi'
import { TbMathSymbols } from 'react-icons/tb'
import { useState } from 'react'
import { FiAlertCircle } from 'react-icons/fi'

const navItems = [
  { name: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
  { name: "Profile", icon: <FiUser />, path: "/dashboard/profile" },
  { 
    name: "Practice Tests", 
    icon: <FiFileText />, 
    path: "/dashboard/tests",
    children: [
      { name: "Create Practice", icon: <FiFileText />, path: "/dashboard/tests/create" },
      { name: "Practice History", icon: <FiClock />, path: "/dashboard/tests/history" },
    ]
  },
  { 
    name: "Tutor Test", 
    icon: <FiBook />, 
    path: "/dashboard/tutor",
    children: [
      { name: "Tutor Math", icon: <FiActivity />, path: "/dashboard/tutor/math" },
      { name: "Tutor Read and Write", icon: <FiPieChart />, path: "/dashboard/tutor/rw" },
    ]
  },
  { 
    name: "Admin Tests", 
    icon: <FiClipboard />, 
    path: "/dashboard/admin-tests"
  },
  { name: "Adaptive Tests", icon: <FiZap />, path: "/dashboard/adaptive-tests" },
  { name: "Live Classes", icon: <FiVideo />, path: "/dashboard/live-classes" },
  { name: "Live Courses", icon: <FiBook />, path: "/dashboard/courses" },
  { name: "Question Banks", icon: <FiDatabase />, path: "/dashboard/question-banks" },
  { name: "Study Plan", icon: <FiTarget />, path: "/dashboard/study-plan" },
  { name: "Daily Tracker", icon: <FiCalendar />, path: "/dashboard/daily-tracker" },
  { name: "Score Tracker", icon: <FiActivity />, path: "/dashboard/score-tracker" },
  { 
    name: "Errors & Redo", 
    icon: <FiAlertCircle />, 
    children: [
      { name: "Error Log", icon: <FiAlertCircle />, path: "/dashboard/error-log" },
      { name: "My Redo Queue", icon: <FiActivity />, path: "/dashboard/redo-queue" },
    ]
  },
  { name: "Analytics", icon: <FiBarChart />, path: "/dashboard/analytics" },
  { name: "Payments", icon: <FiDollarSign />, path: "/dashboard/payments" },
  { name: "Formula Sheet", icon: <TbMathSymbols />, path: "/dashboard/formula-sheet" },
  { name: "Messages", icon: <FiMessageSquare />, path: "/dashboard/messages" },
]

export default function DashboardLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState(['Practice Tests', 'Performance'])

  const toggleExpand = (name, e) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) return <div>Loading...</div>

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Poppins] overflow-hidden">
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside className={`h-screen fixed z-50 md:static top-0 left-0 bg-white text-gray-800 w-64 p-6 space-y-6 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-in-out shadow-lg ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div>
          <div className="flex items-center justify-between gap-3 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo (2).png"
                alt="DSATGURU"
                width={151}
                height={64}
                priority
                className="object-contain h-10 w-auto"
              />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-800 md:hidden"
            >
              <FiX size={24} />
            </button>
          </div>
          <nav className="space-y-3">
            {navItems.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <div
                    className="flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-100 cursor-pointer"
                    onClick={(e) => toggleExpand(item.name, e)}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon} {item.name}
                    </div>
                    {expandedItems.includes(item.name) ? <FiChevronDown /> : <FiChevronRight />}
                  </div>
                ) : (
                  <Link
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-100"
                  >
                    {item.icon} {item.name}
                  </Link>
                )}

                {item.children && expandedItems.includes(item.name) && (
                  <div className="ml-4 space-y-1 mt-1 border-l-2 border-gray-100 pl-2">
                    {item.children.map((child) => (
                      child.children ? (
                        <div key={child.name}>
                          <div
                            className="flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-50 text-gray-600 hover:text-blue-700 cursor-pointer"
                            onClick={(e) => toggleExpand(child.name, e)}
                          >
                            <div className="flex items-center gap-3">
                              {child.icon} {child.name}
                            </div>
                            {expandedItems.includes(child.name) ? <FiChevronDown /> : <FiChevronRight />}
                          </div>
                          {expandedItems.includes(child.name) && (
                            <div className="ml-4 space-y-1 mt-1 border-l-2 border-gray-100 pl-2">
                              {child.children.map((subChild) => (
                                <Link
                                  key={subChild.name}
                                  href={subChild.path}
                                  onClick={() => setIsOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                                >
                                  {subChild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          key={child.name}
                          href={child.path}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                        >
                          {child.icon} {child.name}
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div 
            className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
            onClick={() => router.push('/dashboard/profile')}
          >
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                Student
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
