'use client'

// WhatsApp and call buttons for the redesigned public pages. Bottom-right on
// phones (the copy is full-width there and a left pin covers the CTAs),
// bottom-left from sm up. Square, in the site's style; the label
// slides out on hover. The dashboard keeps its own FloatingContactButtons.
import { FaWhatsapp } from 'react-icons/fa'
import { LuPhone } from 'react-icons/lu'

export default function FloatingContact() {
  const item = 'group flex h-12 items-center shadow-[0_16px_32px_-14px_#000000b3] transition-transform hover:-translate-y-0.5'
  const label = 'max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold transition-all duration-300 group-hover:max-w-[220px] group-hover:pr-4'
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-2.5 sm:bottom-6 sm:left-5 sm:right-auto">
      <a href="https://wa.me/13292398577" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className={`${item} bg-[#25D366] text-[#0b2a17]`}>
        <span className="grid size-12 shrink-0 place-items-center">
          <FaWhatsapp className="size-6" />
        </span>
        <span className={label}>Chat on WhatsApp</span>
      </a>
      <a href="tel:+13292398577" aria-label="Call +1 329-239-8577" className={`${item} bg-cta text-on-cta`}>
        <span className="grid size-12 shrink-0 place-items-center">
          <LuPhone className="size-5" />
        </span>
        <span className={label}>+1 329-239-8577</span>
      </a>
    </div>
  )
}
