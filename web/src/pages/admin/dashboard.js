import dynamic from 'next/dynamic'
const AdminDashboard = dynamic(() => import('student/pages/Admin/Dashboard'), { ssr: false })

export default function Page() {
  return <AdminDashboard />
}
