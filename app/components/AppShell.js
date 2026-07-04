'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import PublicLayout from './PublicLayout'
import MaintenancePage from './MaintenancePage'
import { useAuth } from './AuthContext'
import { STAFF_ROLES } from '../../lib/constants/roles'

// Auth pages stay reachable during maintenance so an admin can still log in to turn it off.
const AUTH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password']

export default function AppShell({ children }) {
  const pathname = usePathname() || '/'
  const { user, loading: authLoading } = useAuth()
  const [maint, setMaint] = useState(null)
  const [maintLoaded, setMaintLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/settings/public', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) { setMaint(d); setMaintLoaded(true) } })
      .catch(() => { if (active) setMaintLoaded(true) })
    return () => { active = false }
  }, [])

  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')
  const isTutor = pathname.startsWith('/tutor')
  // Demo test take/rules pages are fullscreen — no header/footer
  const isDemoTestFullscreen = pathname.startsWith('/demo-test/take') ||
    pathname.startsWith('/demo-test/rules')
  // Post-purchase thank-you page is a clean fullscreen moment (no marketing nav/footer).
  const isThankYou = pathname.startsWith('/thank-you')

  // Maintenance is active only while ON and (no timer OR the timer hasn't elapsed).
  const maintenanceActive = !!maint?.maintenanceMode &&
    (!maint.maintenanceEndsAt || new Date(maint.maintenanceEndsAt).getTime() > Date.now())
  const isStaff = STAFF_ROLES.includes(user?.role)
  const isAuthPath = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  // Non-staff visitors get the maintenance page across the whole site; staff bypass.
  if (maintLoaded && !authLoading && maintenanceActive && !isStaff && !isAuthPath) {
    return <MaintenancePage siteName={maint.siteName} endsAt={maint.maintenanceEndsAt} />
  }

  const inner = (isAdmin || isDashboard || isTutor || isDemoTestFullscreen || isThankYou)
    ? children
    : <PublicLayout>{children}</PublicLayout>

  // Staff see a banner so they know maintenance is live (visitors are being blocked).
  if (maintenanceActive && isStaff) {
    return (
      <>
        <div className="bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white">
          🔧 Maintenance mode is ON — only staff can access the site; visitors see the maintenance page. Turn it off in Settings.
        </div>
        {inner}
      </>
    )
  }

  return inner
}
