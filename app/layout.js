import './globals.css'
import { AuthProvider } from './components/AuthContext'
import { CourseProvider } from './components/CourseContext'
import AppShell from './components/AppShell'

const BASE_URL = 'https://www.dsatguru.com'

export default function RootLayout({ children }) {
  const canonicalUrl = BASE_URL

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="google-site-verification"
          content="REPLACE_WITH_GOOGLE-VERIFICATION-CODE"
        />
      </head>
      <body className="font-[Poppins]">
        <AuthProvider>
          <CourseProvider>
            <AppShell>{children}</AppShell>
          </CourseProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
