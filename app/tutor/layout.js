'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { FiGrid, FiUsers, FiFileText, FiAward, FiLogOut, FiEye, FiBarChart2, FiAlertTriangle, FiMessageSquare } from 'react-icons/fi'

export default function TutorLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'Tutor') {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/tutor/dashboard' },
    { id: 'student-overview', label: 'Student Overview', icon: <FiEye />, path: '/tutor/student-overview' },
    { id: 'progress-monitor', label: 'Progress Monitor', icon: <FiBarChart2 />, path: '/tutor/progress-monitor' },
    { id: 'students', label: 'My Students', icon: <FiUsers />, path: '/tutor/students' },
    { id: 'tests', label: 'Test Sheets', icon: <FiFileText />, path: '/tutor/tests' },
    { id: 'results', label: 'Test Results', icon: <FiAward />, path: '/tutor/results' },
    { id: 'error-patterns', label: 'Error Patterns', icon: <FiAlertTriangle />, path: '/tutor/error-patterns' },
    { id: 'messages', label: 'Messages', icon: <FiMessageSquare />, path: '/tutor/messages' }
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) return null
  if (!user || user.role !== 'Tutor') return null

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 h-screen bg-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b">
          <a href="https://dsatguru.com" className="block">
            <h1 className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">DSATGURU Tutor</h1>
          </a>
          <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
              Tutor
            </span>
          </div>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link 
              key={item.id}
              href={item.path} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-left transition-colors ${
                pathname === item.path 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            > 
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-8 text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut />
            Logout
          </button>
        </nav>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
