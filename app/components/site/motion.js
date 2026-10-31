'use client'

// Scroll-in motion for the public-site redesign, built on framer-motion (already a dependency).
// PublicLayout wraps the site in <MotionConfig reducedMotion="user">, so visitors who ask for less motion get none.
import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]

export function Reveal({ as = 'div', children, className, delay = 0, y = 18, ...rest }) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease, delay }}
      {...rest}
    >
      {children}
    </M>
  )
}

export function Stagger({ as = 'div', children, className, stagger = 0.07, ...rest }) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </M>
  )
}

export function StaggerItem({ as = 'div', children, className, ...rest }) {
  const M = motion[as]
  return (
    <M
      className={className}
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
      {...rest}
    >
      {children}
    </M>
  )
}

// Heading whose words rise in one after another; the last `accent` words are set in italic.
export function WordReveal({ as = 'h1', text, accent = 0, className, delay = 0, inView = false }) {
  const M = motion[as]
  const words = String(text).split(' ')
  const from = words.length - accent
  const show = { opacity: 1, y: 0 }
  return (
    <M
      className={`display ${className || ''}`}
      initial="hidden"
      {...(inView ? { whileInView: 'show', viewport: { once: true, amount: 0.4 } } : { animate: 'show' })}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={`inline-block ${i >= from ? 'accent' : ''}`}
            variants={{ hidden: { opacity: 0, y: '0.6em' }, show: { ...show, transition: { duration: 0.7, ease } } }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </M>
  )
}

// A number that counts up the first time it scrolls into view. Non-numeric values (e.g. "24/7") are shown as is.
export function CountUp({ value, className }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const m = String(value).match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/)
  const target = m ? Number(m[2].replace(/,/g, '')) : null
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0
  const [shown, setShown] = useState(m ? 0 : null)
  useEffect(() => {
    if (!seen || target == null) return
    const c = animate(0, target, { duration: 1.4, ease, onUpdate: (v) => setShown(v) })
    return () => c.stop()
  }, [seen, target])
  if (!m) return <span className={className}>{value}</span>
  const n = shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <span ref={ref} className={className}>
      {m[1]}
      {n}
      {m[3]}
    </span>
  )
}
