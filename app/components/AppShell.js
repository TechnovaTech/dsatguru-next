'use client'

import { usePathname } from 'next/navigation'
import PublicLayout from './PublicLayout'

export default function AppShell({ children }) {
  const pathname = usePathname() || '/'
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')
  const isTutor = pathname.startsWith('/tutor')
  // Demo test take/rules pages are fullscreen — no header/footer
  const isDemoTestFullscreen = pathname.startsWith('/demo-test/take') ||
    pathname.startsWith('/demo-test/rules')

  if (isAdmin || isDashboard || isTutor || isDemoTestFullscreen) {
    return children
  }

  return <PublicLayout>{children}</PublicLayout>
}

