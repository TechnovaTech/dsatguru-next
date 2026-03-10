'use client'

import { usePathname } from 'next/navigation'
import PublicLayout from './PublicLayout'

export default function AppShell({ children }) {
  const pathname = usePathname() || '/'
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')
  const isTutor = pathname.startsWith('/tutor')

  if (isAdmin || isDashboard || isTutor) {
    return children
  }

  return <PublicLayout>{children}</PublicLayout>
}

