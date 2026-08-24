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
      <PageHeader title="Profile" subtitle="Your IGCSC account." />
      <div className="max-w-2xl">
        <Card>
          <div className="flex items-center gap-4 border-b border-slate-100 p-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-xl font-black text-white">{initials}</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user.name || 'Administrator'}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { icon: FiUser, label: 'Name', value: user.name || '—' },
              { icon: FiMail, label: 'Email', value: user.email },
              { icon: FiShield, label: 'Role', value: roleLabel },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-6 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><row.icon size={16} /></span>
                <span className="w-24 text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</span>
                <span className="text-sm font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
