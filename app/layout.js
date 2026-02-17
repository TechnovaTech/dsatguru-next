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
        <title>DSATGURU | Digital SAT & PSAT Prep Platform</title>
        <meta
          name="description"
          content="DSATGURU helps students boost their Digital SAT and PSAT scores with live classes, mock tests, question banks, and smart study plans."
        />
        <link rel="icon" href="/logo (2).png" sizes="32x32" />
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
