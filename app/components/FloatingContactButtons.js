'use client'

import { useEffect, useState } from 'react'

export default function FloatingContactButtons() {
  const [edgeActive, setEdgeActive] = useState(false)
  const [scrollActive, setScrollActive] = useState(false)

  useEffect(() => {
    const handleMouseMove = (event) => {
      setEdgeActive(event.clientX < 40)
    }

    const handleScroll = () => {
      setScrollActive(window.scrollY > 200)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const isVisible = edgeActive || scrollActive

  const baseClasses =
    'fixed left-0 z-50 transform transition-transform duration-300 [writing-mode:vertical-rl] [text-orientation:mixed] text-sm font-semibold rounded-r-md shadow'

  const visibleClass = isVisible ? 'translate-x-0' : '-translate-x-full'

  return (
    <>
      <a
        href="https://wa.me/13292398577"
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${visibleClass} top-[30%] bg-green-600 text-white px-3 py-2 hover:bg-green-700`}
      >
        Chat on WhatsApp
      </a>
      <a
        href="tel:+13292398577"
        className={`${baseClasses} ${visibleClass} top-[55%] bg-red-600 text-white px-3 py-2 hover:bg-red-700`}
      >
        Call +1 329-239-8577
      </a>
    </>
  )
}

