import './globals.css'
import { AuthProvider } from './components/AuthContext'
import { CourseProvider } from './components/CourseContext'
import AppShell from './components/AppShell'

const BASE_URL = 'https://www.dsatguru.com'

export const metadata = {
  title: 'DSATGURU | Digital SAT & PSAT Prep Platform',
  description:
    'DSATGURU helps students boost their Digital SAT and PSAT scores with live classes, mock tests, question banks, and smart study plans.',
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: '/logo (2).png',
    shortcut: '/logo (2).png',
    apple: '/logo (2).png',
  },
}

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
