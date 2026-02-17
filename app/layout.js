"use client"
import "./globals.css"
import { AuthProvider } from "./components/AuthContext"
import { CourseProvider } from "./components/CourseContext"
import PublicLayout from "./components/PublicLayout"
import { usePathname } from "next/navigation"

const BASE_URL = "https://www.dsatguru.com"

export default function RootLayout({ children }) {
  const pathname = usePathname() || "/"
  const isDashboard = pathname?.startsWith("/dashboard")
  const isAuth = pathname === "/login" || pathname === "/register"
  const isAdmin = pathname?.startsWith("/admin")

  const canonicalUrl = `${BASE_URL}${pathname}`

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="google-site-verification"
          content="REPLACE_WITH_GOOGLE_VERIFICATION_CODE"
        />
      </head>
      <body className="font-[Poppins]">
        <AuthProvider>
          <CourseProvider>
            {isAdmin ? (
              children
            ) : isDashboard ? (
              children
            ) : (
              <PublicLayout>{children}</PublicLayout>
            )}
          </CourseProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
