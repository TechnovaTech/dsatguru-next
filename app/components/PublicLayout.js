'use client'
import Header from './Header'
import Footer from './Footer'

export default function PublicLayout({ children }) {
  return (
    <div className="font-[Poppins]">
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  )
}