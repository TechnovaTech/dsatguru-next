'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiUsers } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

const ROLE_TONE = { Student: 'blue', Tutor: 'violet', Admin: 'indigo', TutorAdmin: 'indigo' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')

  useEffect(() => {
    (async () => {
      try {
        setUsers(await apiGet('/api/admin/users'))
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return users.filter((u) => {
      if (role !== 'All' && u.role !== role) return false
      if (!needle) return true
      return `${u.name} ${u.email}`.toLowerCase().includes(needle)
    })
  }, [users, q, role])

  const counts = useMemo(() => {
    const c = { All: users.length, Student: 0, Tutor: 0, Admin: 0, TutorAdmin: 0 }
    users.forEach((u) => { c[u.role] = (c[u.role] || 0) + 1 })
    return c
  }, [users])

  if (loading) return <Loading label="Loading users…" />

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} accounts across students, tutors and staff.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {['All', 'Student', 'Tutor', 'Admin', 'TutorAdmin'].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${role === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {r === 'TutorAdmin' ? 'Tutor Admin' : r} <span className="opacity-70">({counts[r] || 0})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <Table
          columns={[
            { label: '#' }, { label: 'Name' }, { label: 'Role' },
            { label: 'Target Date' }, { label: 'Tutor(s)' }, { label: 'Status', align: 'right' },
          ]}
          empty={filtered.length === 0 && <EmptyState icon={FiUsers} title="No users match" hint="Try a different search or role filter." />}
        >
          {filtered.map((u, i) => (
            <tr key={u._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 text-slate-400">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">{u.name}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </td>
              <td className="px-4 py-3"><Badge tone={ROLE_TONE[u.role] || 'slate'}>{u.role}</Badge></td>
              <td className="px-4 py-3 text-slate-600">{u.targetExamDate ? new Date(u.targetExamDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {(u.assignedTutorDetails || []).map((t) => t.name).join(', ') || '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {u.isActive === false
                  ? <Badge tone="red">Inactive</Badge>
                  : <Badge tone="green">Active</Badge>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
