import './globals.css'
import Script from 'next/script'
import { AuthProvider } from './components/AuthContext'
import { CourseProvider } from './components/CourseContext'
import AppShell from './components/AppShell'

const BASE_URL = 'https://www.dsatguru.com'

export const metadata = {
  title: 'DSATGURU | Digital SAT & PSAT Prep Platform',
  description:
    'DSATGURU helps students boost their Digital SAT and PSAT scores with live classes, mock tests, question banks, and smart study plans.',
  metadataBase: new URL(BASE_URL),
  verification: {
    google: 'oiH_6dKW-lPMKtoR8WH7sQDkqZ-_3Oe6uy7BxLZdhWA',
  },
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
          content="oiH_6dKW-lPMKtoR8WH7sQDkqZ-_3Oe6uy7BxLZdhWA"
        />
      </head>
      <body className="font-[Poppins]">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2S6R8YEWQM"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2S6R8YEWQM');
          `}
        </Script>
        <AuthProvider>
          <CourseProvider>
            <AppShell>{children}</AppShell>
          </CourseProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
