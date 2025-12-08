import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../context/AuthContext'
import { CourseProvider } from '../context/CourseContext'
import PublicLayout from '../layouts/PublicLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import AdminLayout from '../layouts/AdminLayout'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const isAdmin = router.pathname.startsWith('/admin')
  const isDashboard = router.pathname.startsWith('/dashboard')
  const Layout = isAdmin ? AdminLayout : (isDashboard ? DashboardLayout : PublicLayout)
  return (
    <AuthProvider>
      <CourseProvider>
        <Layout>
          <Component {...pageProps} />
          <Toaster position="top-right" reverseOrder={false} />
        </Layout>
      </CourseProvider>
    </AuthProvider>
  )
}
