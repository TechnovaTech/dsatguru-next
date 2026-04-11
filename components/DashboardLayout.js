'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../app/components/AuthContext'
import { FiMenu, FiX, FiGrid, FiBook, FiLogOut, FiTarget, FiBarChart, FiDatabase, FiDollarSign } from 'react-icons/fi'
import { TbMathSymbols } from 'react-icons/tb'

const navItems = [
  { name: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
  { name: "Courses", icon: <FiBook />, path: "/dashboard/courses" },
  { name: "Question Banks", icon: <FiDatabase />, path: "/dashboard/question-banks" },
  { name: "Study Plan", icon: <FiTarget />, path: "/dashboard/study-plan" },
  { name: "Analytics", icon: <FiBarChart />, path: "/dashboard/analytics" },
  { name: "Payments", icon: <FiDollarSign />, path: "/dashboard/payments" },
  { name: "Formula Sheet", icon: <TbMathSymbols />, path: "/dashboard/formula-sheet" },
]

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  
  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Poppins] overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`h-screen fixed z-50 md:static top-0 right-0 bg-white text-gray-800 w-64 p-6 space-y-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out shadow-lg
        ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        <div>
          <div className="flex items-center justify-between gap-3 mb-8">
            <Link href="/" className="text-2xl font-bold text-blue-700 tracking-wide">DSATGURU</Link>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-800 md:hidden"
            >
              <FiX size={24} />
            </button>
          </div>
          <nav className="space-y-3">
            {navItems.map((item) => (
              <Link
                href={item.path}
                key={item.name}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-100"
              >
                {item.icon} {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar for mobile */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}