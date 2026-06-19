'use client'

import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'

const PHONE_DISPLAY = '+1 329-239-8577'
const PHONE_RAW = '+13292398577'

/**
 * Modern floating contact FABs (bottom-left).
 * Circular icon buttons that expand on hover to reveal a label.
 */
export default function FloatingContactButtons() {
  return (
    <div className="fixed bottom-6 left-5 z-50 flex flex-col gap-3">
      {/* WhatsApp */}
      <a
        href="https://wa.me/13292398577"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex h-14 items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/50"
      >
        <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-white/40" />
          <FaWhatsapp size={26} className="relative" />
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[200px] group-hover:pr-5">
          Chat on WhatsApp
        </span>
      </a>

      {/* Call — opens the phone dialer directly */}
      <a
        href={`tel:${PHONE_RAW}`}
        aria-label={`Call ${PHONE_DISPLAY}`}
        className="group flex h-14 items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/50"
      >
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center">
          <FaPhoneAlt size={20} />
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[220px] group-hover:pr-5">
          {PHONE_DISPLAY}
        </span>
      </a>
    </div>
  )
}
