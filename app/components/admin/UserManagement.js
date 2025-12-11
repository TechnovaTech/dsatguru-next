'use client'
import { useState, useEffect } from 'react'
import { FiEdit, FiToggleLeft, FiToggleRight, FiFilter } from 'react-icons/fi'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

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

  const filteredUsers = users.filter(user => {
    if (filter && user.role !== filter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Users</option>
            <option value="Student">Students</option>
            <option value="Tutor">Tutors</option>
            <option value="Admin">Admins</option>
          </select>
        </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id || user.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'Tutor' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleToggleStatus(user._id || user.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {user.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
