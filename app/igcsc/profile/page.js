'use client'
import { useEffect, useState } from 'react'
import { FiMail, FiShield, FiUser } from 'react-icons/fi'
import { igcscUser } from '../_components/auth'
import { PageHeader, Card } from '../_components/ui'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  useEffect(() => { setUser(igcscUser()) }, [])
  if (!user) return null

  const initials = (user.name || user.email || 'A').trim().slice(0, 2).toUpperCase()
  const roleLabel = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''

  return (
    <div>
      <PageHeader eyebrow="Account · Profile" title="Profile" subtitle="Your IGCSC account." />
      <div className="max-w-2xl">
        <Card>
          <div className="flex items-center gap-4 border-b border-line p-6">
            <span className="flex h-16 w-16 items-center justify-center bg-cta font-display text-2xl text-on-cta">{initials}</span>
            <div>
              <h2 className="display text-[22px] text-ink">{user.name || 'Administrator'}</h2>
              <p className="font-code text-[12px] text-muted">{user.email}</p>
            </div>
          </div>
          <div className="divide-y divide-line">
            {[
              { icon: FiUser, label: 'Name', value: user.name || '—' },
              { icon: FiMail, label: 'Email', value: user.email },
              { icon: FiShield, label: 'Role', value: roleLabel },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-6 py-4">
                <span className="flex h-9 w-9 items-center justify-center bg-brand-50 text-brand"><row.icon size={16} /></span>
                <span className="w-24 font-code text-[11px] uppercase tracking-[0.12em] text-muted">{row.label}</span>
                <span className="text-sm font-medium text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
