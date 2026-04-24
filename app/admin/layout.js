'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FiGrid, FiHelpCircle, FiCalendar, FiUsers, FiMessageSquare, FiBarChart, FiDollarSign, FiSettings, FiLogOut, FiBookOpen, FiTarget, FiClipboard, FiTrendingUp, FiUpload, FiDatabase, FiFileText, FiCheckSquare, FiChevronDown, FiChevronRight, FiActivity, FiEdit, FiList, FiAward, FiMonitor, FiAlertCircle, FiZap } from 'react-icons/fi'

export default function AdminLayout({ children }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [openSubmenu, setOpenSubmenu] = useState({})

  useEffect(() => {
    if (!loading) {
      if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) {
        router.push('/login')
      } else if (user.role === 'TutorAdmin') {
        setOpenSubmenu(prev => ({ ...prev, 'tutor-tests': true }))
      }
    }
  }, [user, loading, router, pathname])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/admin/dashboard' },
    { id: 'master-dashboard', label: 'Master Dashboard', icon: <FiAward />, path: '/admin/master-dashboard' },
    { id: 'students-observation', label: 'Students Observation', icon: <FiAlertCircle />, path: '/admin/students-observation' },
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
        { id: 'tutor-question-bank', label: 'Tutor Question Bank', path: '/admin/tutor/question-bank', icon: <FiDatabase /> },
        { id: 'tutor-create-test', label: 'Tutor Test Creation', path: '/admin/tutor/create-test', icon: <FiEdit /> },
        { id: 'tutor-test-sheets', label: 'Tutor Test Sheets', path: '/admin/tutor/tests', icon: <FiFileText /> },
        { id: 'tutor-users', label: 'Tutor and Students', path: '/admin/tutor/users', icon: <FiUsers /> },
        { id: 'tutor-results', label: 'Tutor Test Results', path: '/admin/tutor/results', icon: <FiAward /> }
      ]
    },
    { 
      id: 'admin-tests', 
      label: 'Admin Tests', 
      icon: <FiList />, 
      path: '#',
      submenu: [
        { id: 'admin-question-bank', label: 'Question Bank', path: '/admin/admin-tests/question-bank', icon: <FiDatabase /> },
        { id: 'admin-create-test', label: 'Create Test', path: '/admin/admin-tests/create-test', icon: <FiEdit /> },
        { id: 'admin-test-sheets', label: 'Test Sheets', path: '/admin/admin-tests/test-sheets', icon: <FiFileText /> },
        { id: 'admin-results', label: 'Result Analysis', path: '/admin/admin-tests/results', icon: <FiAward /> }
      ]
    },
    { id: 'demo-test', label: 'Demo Test', icon: <FiZap />, path: '/admin/demo-test' },
    { id: 'test-sessions', label: 'Test Session Monitoring', icon: <FiBarChart />, path: '/admin/test-sessions' },
    { id: 'user-results', label: 'User Result Management', icon: <FiUsers />, path: '/admin/user-results' },
    { id: 'student-progress', label: 'Student Progress', icon: <FiTrendingUp />, path: '/admin/student-progress' },
    { id: 'student-analysis', label: 'Student Analysis', icon: <FiActivity />, path: '/admin/student-analysis' },
    { id: 'users', label: 'User Management', icon: <FiUsers />, path: '/admin/users' },
    { id: 'communication', label: 'Communication', icon: <FiMessageSquare />, path: '/admin/communication' },
    { id: 'messages', label: 'Messages', icon: <FiMessageSquare />, path: '/admin/messages' },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart />, path: '/admin/analytics' },
    { id: 'comparison', label: 'Comparison Table', icon: <FiFileText />, path: '/admin/comparison' },
    { id: 'payments', label: 'Payments', icon: <FiDollarSign />, path: '/admin/payments' },
    { id: 'settings', label: 'Settings', icon: <FiSettings />, path: '/admin/settings' }
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === 'TutorAdmin') {
      // TutorAdmin can only access Tutor Tests modules
      return item.id === 'tutor-tests'
    }
    // Admin has full access
    return true
  })

  // Convert submenu to main menu items for TutorAdmin
  const getMenuItems = () => {
    if (user?.role === 'TutorAdmin') {
      // Show all Tutor Tests submenus as main menu items
      const tutorTestsItem = menuItems.find(item => item.id === 'tutor-tests')
      if (tutorTestsItem && tutorTestsItem.submenu) {
        return tutorTestsItem.submenu.map(sub => ({
          id: sub.id,
          label: sub.label,
          icon: sub.icon || <FiCheckSquare />,
          path: sub.path
        }))
      }
      return []
    }
    
    // Admin sees normal menu with submenus
    return filteredMenuItems
  }

  const displayMenuItems = getMenuItems()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const toggleSubmenu = (id) => {
    setOpenSubmenu(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) return null
  if (!user || !['Admin', 'TutorAdmin'].includes(user.role)) return null

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 h-screen bg-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b">
          <a href="https://dsatguru.com" className="block">
            <h1 className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
              DSATGURU {user?.role === 'TutorAdmin' ? 'Tutor Admin' : user?.role}
            </h1>
          </a>
          <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
              user?.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'TutorAdmin' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {user?.role === 'TutorAdmin' ? 'Tutor Admin' : user?.role}
            </span>
          </div>
        </div>
        <nav className="p-4">
          {displayMenuItems.map((item) => (
            <div key={item.id}>
              {item.submenu && user?.role === 'Admin' ? (
                <>
                  <button 
                    onClick={() => toggleSubmenu(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 text-left transition-colors ${
                      (item.id === 'tutor-tests' && pathname.startsWith('/admin/tutor')) || (item.id === 'admin-tests' && pathname.startsWith('/admin/admin-tests')) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
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
