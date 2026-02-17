'use client'

import { usePathname } from 'next/navigation'
import PublicLayout from './PublicLayout'

export default function AppShell({ children }) {
  const pathname = usePathname() || '/'
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin || isDashboard) {
    return children
  }

  return <PublicLayout>{children}</PublicLayout>
}

