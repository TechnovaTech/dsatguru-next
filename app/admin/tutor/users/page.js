'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiUser, FiMail, FiPhone, FiCalendar } from 'react-icons/fi'

export default function TutorAndStudents() {
  const [activeTab, setActiveTab] = useState('tutors')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const role = activeTab === 'tutors' ? 'Tutor' : 'Student'
      const res = await fetch(`/api/admin/users?role=${role}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        setError('Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tutor and Students</h1>
          <p className="text-gray-600">View and manage tutors and students</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tutors')}
                className={`${
                  activeTab === 'tutors'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <FiUser /> Tutors
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <FiUser /> Students
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === 'tutors' ? 'Tutors' : 'Students'} ({filteredUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No {activeTab === 'tutors' ? 'tutors' : 'students'} found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiUser className="text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiMail className="text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiPhone className="text-gray-400" />
                          {user.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.role === 'Tutor' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCalendar className="text-gray-400" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
