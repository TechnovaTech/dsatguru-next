import './globals.css'
import Script from 'next/script'
import { AuthProvider } from './components/AuthContext'
import { CourseProvider } from './components/CourseContext'
import { UIProvider } from './components/ui/UIProvider'
import AppShell from './components/AppShell'

const BASE_URL = 'https://www.dsatguru.com'

export const metadata = {
  title: 'Best SAT Preparation Online | Digital SAT Exam Prep',
  description:
    'Get comprehensive SAT exam preparation with online SAT classes, top-rated SAT review courses, and powerful study tools designed to boost your score.',
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
        {/* Meta (Facebook) Pixel — loaded on every page for Meta Ads tracking (PageView).
            Conversion events (Lead / Purchase) are fired on /thank-you. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1925897978125977');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1925897978125977&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <AuthProvider>
          <CourseProvider>
            <UIProvider>
              <AppShell>{children}</AppShell>
            </UIProvider>
          </CourseProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
