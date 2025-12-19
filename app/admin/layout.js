'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { FiGrid, FiHelpCircle, FiCalendar, FiUsers, FiMessageSquare, FiBarChart, FiDollarSign, FiSettings, FiLogOut, FiBookOpen, FiTarget, FiClipboard, FiTrendingUp, FiUpload, FiDatabase, FiFileText } from 'react-icons/fi'

export default function AdminLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'Admin')) {
      router.push('/login')
    }
  }, [user, loading, router])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/admin/dashboard' },
    { id: 'manage-courses', label: 'Manage Courses', icon: <FiBookOpen />, path: '/admin/manage-courses' },
    { id: 'courses', label: 'Course & Question Bank', icon: <FiBookOpen />, path: '/admin/courses' },
    { id: 'sat-question-upload', label: 'SAT Question Upload', icon: <FiUpload />, path: '/admin/sat-question-upload' },
    { id: 'question-bank', label: 'Question Bank Management', icon: <FiDatabase />, path: '/admin/question-bank' },
    { id: 'study-plan', label: 'Study Plan Management', icon: <FiTarget />, path: '/admin/study-plan' },
    { id: 'test-management', label: 'Test Management', icon: <FiClipboard />, path: '/admin/test-management' },
    { id: 'test-sessions', label: 'Test Session Monitoring', icon: <FiBarChart />, path: '/admin/test-sessions' },
    { id: 'user-results', label: 'User Result Management', icon: <FiUsers />, path: '/admin/user-results' },
    { id: 'student-progress', label: 'Student Progress', icon: <FiTrendingUp />, path: '/admin/student-progress' },
    { id: 'users', label: 'User Management', icon: <FiUsers />, path: '/admin/users' },
    { id: 'communication', label: 'Communication', icon: <FiMessageSquare />, path: '/admin/communication' },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart />, path: '/admin/analytics' },
    { id: 'payments', label: 'Payments', icon: <FiDollarSign />, path: '/admin/payments' },
    { id: 'settings', label: 'Settings', icon: <FiSettings />, path: '/admin/settings' }
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) return null
  if (!user || user.role !== 'Admin') return null

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 h-screen bg-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b">
          <a href="https://dsatguru.com" className="block">
            <h1 className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">DSATGURU Admin</h1>
          </a>
          <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.path} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-left transition-colors ${pathname === item.path ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}> 
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-8 text-red-600 hover:bg-red-50 transition-colors">
            <FiLogOut />
            Logout
          </button>
        </nav>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
