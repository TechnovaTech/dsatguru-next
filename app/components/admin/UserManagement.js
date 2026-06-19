'use client'
import { useState, useEffect } from 'react'
import {
  FiEdit, FiToggleLeft, FiToggleRight, FiPlus, FiTrash2, FiEye, FiEyeOff,
  FiSearch, FiX, FiUsers, FiUserCheck, FiShield,
} from 'react-icons/fi'
import { useToast, useConfirm } from '../ui/UIProvider'

const ROLE_STYLES = {
  Admin: { badge: 'bg-rose-50 text-rose-700', avatar: 'bg-rose-500' },
  TutorAdmin: { badge: 'bg-violet-50 text-violet-700', avatar: 'bg-violet-500' },
  Tutor: { badge: 'bg-blue-50 text-blue-700', avatar: 'bg-blue-500' },
  Student: { badge: 'bg-emerald-50 text-emerald-700', avatar: 'bg-emerald-500' },
}

const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export default function UserManagement() {
  const toast = useToast()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Student' })
  const [showPassword, setShowPassword] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Reset to first page whenever the result set changes
  useEffect(() => { setPage(1) }, [filter, search, pageSize])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch('/api/admin/users', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'Student' })
    setShowPassword(false)
  }

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  const handleToggleStatus = async (id) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const user = users.find(u => u._id === id || u.id === id)
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isActive: !(user?.isActive) })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => (u._id === updated._id || u.id === updated._id) ? updated : u))
      }
    } catch {}
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingUser ? `/api/admin/users/${editingUser._id || editingUser.id}` : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const savedUser = await res.json()
        if (editingUser) {
          setUsers(prev => prev.map(u => (u._id === savedUser._id || u.id === savedUser._id) ? savedUser : u))
          toast.success('User updated successfully!')
        } else {
          setUsers(prev => [...prev, savedUser])
          toast.success('User created successfully!')
        }
        closeModal()
      } else {
        const error = await res.json()
        toast.error(error.error || `Failed to ${editingUser ? 'update' : 'create'} user`)
      }
    } catch (error) {
      toast.error(`Failed to ${editingUser ? 'update' : 'create'} user`)
    }
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'Student' })
    setShowPassword(false)
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: '', role: user.role })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleDeleteUser = async (id) => {
    if (!(await confirm({ message: 'Are you sure you want to delete this user?', tone: 'danger', confirmText: 'Delete' }))) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(prev => prev.filter(u => (u._id || u.id) !== id))
        toast.success('User deleted successfully!')
      } else {
        toast.error('Failed to delete user')
      }
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const matchesRole = (user) => {
    if (!filter) return true
    if (filter === 'TutorGroup') return user.role === 'Tutor' || user.role === 'TutorAdmin'
    return user.role === filter
  }

  const filteredUsers = users.filter(user => {
    if (!matchesRole(user)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(`${user.name || ''} ${user.email || ''}`.toLowerCase().includes(q))) return false
    }
    return true
  })

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * pageSize
  const paginatedUsers = filteredUsers.slice(startIdx, startIdx + pageSize)

  const stats = [
    { label: 'Total Users', value: users.length, icon: <FiUsers />, grad: 'from-indigo-500 to-indigo-600', filterValue: '' },
    { label: 'Students', value: users.filter(u => u.role === 'Student').length, icon: <FiUsers />, grad: 'from-emerald-500 to-teal-600', filterValue: 'Student' },
    { label: 'Tutors', value: users.filter(u => u.role === 'Tutor' || u.role === 'TutorAdmin').length, icon: <FiUserCheck />, grad: 'from-blue-500 to-blue-600', filterValue: 'TutorGroup' },
    { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, icon: <FiShield />, grad: 'from-rose-500 to-pink-600', filterValue: 'Admin' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
            User <span className="dg-gradient-text">Management</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage students, tutors and admins.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5"
        >
          <FiPlus /> Add User
        </button>
      </div>

      {/* Stat cards — click to filter */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => {
          const active = filter === s.filterValue
          return (
            <button
              key={i}
              type="button"
              onClick={() => setFilter(s.filterValue)}
              className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${active ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-100'}`}
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.grad} opacity-10 blur-xl`} />
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
                {s.icon}
              </div>
              <div className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" /> : s.value}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                {s.label}
                {active && <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">FILTERED</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-indigo-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">User</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Joined</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan="5" className="px-5 py-4"><div className="h-10 animate-pulse rounded-lg bg-slate-50" /></td></tr>
                ))
              ) : paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
                const rs = ROLE_STYLES[user.role] || ROLE_STYLES.Student
                return (
                  <tr key={user._id || user.id} className="text-sm transition-colors hover:bg-indigo-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${rs.avatar}`}>
                          {initials(user.name)}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${rs.badge}`}>{user.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggleStatus(user._id || user.id)} title={user.isActive ? 'Deactivate' : 'Activate'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100">
                          {user.isActive ? <FiToggleRight size={18} className="text-emerald-500" /> : <FiToggleLeft size={18} />}
                        </button>
                        <button onClick={() => openEditModal(user)} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                          <FiEdit size={15} />
                        </button>
                        <button onClick={() => handleDeleteUser(user._id || user.id)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
                    <p className="text-sm font-medium text-slate-500">No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredUsers.length > 0 && (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-400"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              {startIdx + 1}–{Math.min(startIdx + pageSize, filteredUsers.length)} of {filteredUsers.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeModal}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100"><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password {editingUser && <span className="text-xs font-normal text-slate-400">(Leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-indigo-400"
                      required={!editingUser}
                      placeholder={editingUser ? 'Unchanged' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      tabIndex="-1"
                    >
                      {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400"
                  >
                    <option value="Student">Student</option>
                    <option value="Tutor">Tutor</option>
                    <option value="TutorAdmin">Tutor Admin</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
