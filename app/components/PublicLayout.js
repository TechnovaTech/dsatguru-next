'use client'
import { usePathname } from 'next/navigation'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import Header from './Header'
import Footer from './Footer'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-playfair',
  display: 'swap',
})

export default function PublicLayout({ children }) {
  const pathname = usePathname() || '/'
  // Home hero sits *behind* the floating nav; every other page needs top room.
  const isHome = pathname === '/'

  return (
    <div className={`${jakarta.variable} ${playfair.variable} dg bg-white text-slate-900 antialiased`}>
      <Header />
      <main className={`overflow-x-clip ${isHome ? '' : 'pt-28'}`}>{children}</main>
      <Footer />
    </div>
  )
}
