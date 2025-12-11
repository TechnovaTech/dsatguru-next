'use client'
import './globals.css'
import { AuthProvider } from './components/AuthContext'
import { CourseProvider } from './components/CourseContext'
import PublicLayout from './components/PublicLayout'
import DashboardLayout from './components/DashboardLayout'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const isAuth = pathname === '/login' || pathname === '/register'
  const isAdmin = pathname?.startsWith('/admin')

  return (
    <html lang="en">
      <body className="font-[Poppins]">
        <AuthProvider>
          <CourseProvider>
            {isAdmin ? (
              children
            ) : isDashboard ? (
              <DashboardLayout>{children}</DashboardLayout>
            ) : (
              <PublicLayout>{children}</PublicLayout>
            )}
          </CourseProvider>
        </AuthProvider>
      </body>
    </html>
  )
}