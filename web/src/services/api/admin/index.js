import api from '../index'

export const getDashboardStats = async () => {
  const res = await api.get('/admin/dashboard')
  return res.data.data
}

export const getUsers = async (role = null) => {
  const res = await api.get('/admin/users', { params: role ? { role } : {} })
  return res.data.data
}

export const toggleUserStatus = async (id) => {
  await api.put(`/admin/users/${id}/toggle`)
  return true
}
