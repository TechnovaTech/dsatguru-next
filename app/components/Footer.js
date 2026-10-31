'use client'
import Link from 'next/link'
import { FaWhatsapp } from 'react-icons/fa'
import { LuMail, LuMapPin, LuPhone } from 'react-icons/lu'
import { useCourses } from './CourseContext'
import { Button, Container, Logo } from './site/ui'

const MAPS_URL = 'https://maps.app.goo.gl/1u9TRFga5tZzcW276'

export default function Footer() {
  const { courses } = useCourses()

  const columns = [
    {
      title: 'Courses',
      // As before: every course except the last one in the list (individual tutoring).
      links: courses.filter((_, i) => i !== courses.length - 1).map((c) => ({ label: c.title, href: `/enrollment/${c.courseId || c.id}` })),
    },
    {
      title: 'Quick Links',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Our Guarantee' },
        { label: 'Privacy Policy' },
        { label: 'Terms of Service' },
      ],
    },
    {
      title: 'Get in Touch',
      links: [
        { label: '1-329-239-8577', href: 'tel:+13292398577', icon: LuPhone },
        { label: 'info@dsatguru.com', href: 'mailto:info@dsatguru.com', icon: LuMail },
        { label: 'Visit our office', href: MAPS_URL, icon: LuMapPin, external: true },
        { label: 'Chat on WhatsApp', href: 'https://wa.me/13292398577', icon: FaWhatsapp, external: true },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-line bg-page">
      <Container className="py-16">
        {/* Ready to score higher? */}
        <div className="flex flex-col justify-between gap-8 border-b border-line pb-12 md:flex-row md:items-end">
          <div>
            <h2 className="display text-[clamp(2rem,3.4vw,2.8rem)] leading-tight">
              Ready to <em className="accent">score higher?</em>
            </h2>
            <p className="mt-3 max-w-[480px] text-[16px] text-muted">
              Start with a free demo test or talk to an advisor. Your dream score is closer than you think.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/demo-test" variant="brand" arrow>
              Try free demo
            </Button>
            <Button href="/contact" variant="outline">
              Talk to an advisor
            </Button>
          </div>
        </div>

        <div className="grid gap-10 pt-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-[320px] text-[14.5px] leading-relaxed text-muted">
              Empowering students with cutting-edge test preparation tools and strategies for academic success.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-code text-[12px] uppercase tracking-[0.14em] text-muted">{col.title}</h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => {
                  const Icon = l.icon
                  const cls = `group inline-flex min-h-6 items-center py-0.5 text-[14.5px] text-ink-2 transition-colors hover:text-brand ${Icon ? 'gap-2' : ''}`
                  const inner = (
                    <>
                      {Icon ? <Icon className="size-4 text-brand" /> : <span className="h-px w-0 bg-brand transition-all duration-300 group-hover:mr-1.5 group-hover:w-3" />}
                      {l.label}
                    </>
                  )
                  return (
                    <li key={l.label}>
                      {!l.href ? (
                        <span className="text-[14.5px] text-ink-2">{l.label}</span>
                      ) : /^(https?:|tel:|mailto:)/.test(l.href) ? (
                        <a href={l.href} className={cls} {...(l.external && { target: '_blank', rel: 'noopener noreferrer' })}>
                          {inner}
                        </a>
                      ) : (
                        <Link href={l.href} className={cls}>
                          {inner}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col justify-between gap-3 py-6 text-[13px] text-muted sm:flex-row sm:items-center">
          <p>© 2026 DSATGURU. All rights reserved.</p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <span>Terms of Service</span>
            <span>Refund Policy</span>
            <span>Privacy Policy</span>
          </p>
        </Container>
      </div>
    </footer>
  )
}
