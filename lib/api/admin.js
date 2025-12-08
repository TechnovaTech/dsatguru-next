import api from './index'

export const getDashboardStats = async () => {
  const res = await api.get('/admin/dashboard')
  return res.data.data
}
