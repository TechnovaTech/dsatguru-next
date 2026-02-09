'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FiGrid, FiHelpCircle, FiCalendar, FiUsers, FiMessageSquare, FiBarChart, FiDollarSign, FiSettings, FiLogOut, FiBookOpen, FiTarget, FiClipboard, FiTrendingUp, FiUpload, FiDatabase, FiFileText, FiCheckSquare, FiChevronDown, FiChevronRight, FiActivity } from 'react-icons/fi'

export default function AdminLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [openSubmenu, setOpenSubmenu] = useState({})

  useEffect(() => {
    if (!loading) {
      if (!user || (user.role !== 'Admin' && user.role !== 'Tutor')) {
        router.push('/login')
      } else if (user.role === 'Tutor') {
        setOpenSubmenu(prev => ({ ...prev, 'tutor-tests': true }))
        
        if (!pathname.startsWith('/admin/tutor')) {
          router.push('/admin/tutor/create-test')
        }
      }
    }
  }, [user, loading, router, pathname])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/admin/dashboard' },
    { id: 'manage-courses', label: 'Manage Courses', icon: <FiBookOpen />, path: '/admin/manage-courses' },
    { id: 'courses', label: 'Course & Question Bank', icon: <FiBookOpen />, path: '/admin/courses' },
    { id: 'sat-question-upload', label: 'SAT Question Upload', icon: <FiUpload />, path: '/admin/sat-question-upload' },
    { id: 'question-bank', label: 'Question Bank Management', icon: <FiDatabase />, path: '/admin/question-bank' },
    { id: 'study-plan', label: 'Study Plan Management', icon: <FiTarget />, path: '/admin/study-plan' },
    { id: 'test-management', label: 'Test Management', icon: <FiClipboard />, path: '/admin/test-management' },
    { 
      id: 'tutor-tests', 
      label: 'Tutor Tests', 
      icon: <FiCheckSquare />, 
      path: '#',
      submenu: [
        { id: 'tutor-question-bank', label: 'Tutor Question Bank', path: '/admin/tutor/question-bank' },
        { id: 'tutor-create-test', label: 'Tutor Test Creation', path: '/admin/tutor/create-test' },
        { id: 'tutor-results', label: 'Tutor Test Results', path: '/admin/tutor/results' }
      ]
    },
    { id: 'test-sessions', label: 'Test Session Monitoring', icon: <FiBarChart />, path: '/admin/test-sessions' },
    { id: 'user-results', label: 'User Result Management', icon: <FiUsers />, path: '/admin/user-results' },
    { id: 'student-progress', label: 'Student Progress', icon: <FiTrendingUp />, path: '/admin/student-progress' },
    { id: 'student-analysis', label: 'Student Analysis', icon: <FiActivity />, path: '/admin/student-analysis' },
    { id: 'users', label: 'User Management', icon: <FiUsers />, path: '/admin/users' },
    { id: 'communication', label: 'Communication', icon: <FiMessageSquare />, path: '/admin/communication' },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart />, path: '/admin/analytics' },
    { id: 'comparison', label: 'Comparison Table', icon: <FiFileText />, path: '/admin/comparison' },
    { id: 'payments', label: 'Payments', icon: <FiDollarSign />, path: '/admin/payments' },
    { id: 'settings', label: 'Settings', icon: <FiSettings />, path: '/admin/settings' }
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === 'Tutor') {
      return item.id === 'tutor-tests'
    }
    return true
  })

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const toggleSubmenu = (id) => {
    setOpenSubmenu(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) return null
  if (!user || (user.role !== 'Admin' && user.role !== 'Tutor')) return null

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
          {filteredMenuItems.map((item) => (
            <div key={item.id}>
              {item.submenu ? (
                <>
                  <button 
                    onClick={() => toggleSubmenu(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 text-left transition-colors ${
                      pathname.startsWith('/admin/tutor') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    {openSubmenu[item.id] ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {openSubmenu[item.id] && (
                    <div className="ml-8 space-y-1 mb-2">
                      {item.submenu.map(sub => (
                        <Link 
                          key={sub.id} 
                          href={sub.path}
                          className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                            pathname === sub.path ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link href={item.path} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-left transition-colors ${pathname === item.path ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}> 
                  {item.icon}
                  {item.label}
                </Link>
              )}
            </div>
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
