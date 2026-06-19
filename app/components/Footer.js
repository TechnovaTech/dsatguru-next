'use client'
import { useCourses } from './CourseContext'
import { FaPhone, FaMessage } from 'react-icons/fa6'
import { FaWhatsapp, FaMapMarkerAlt } from 'react-icons/fa'
import { FiArrowUpRight, FiArrowRight } from 'react-icons/fi'
import Image from 'next/image'

const MAPS_URL = 'https://maps.app.goo.gl/1u9TRFga5tZzcW276'

export default function Footer() {
  const { courses } = useCourses()

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const navigate = (path) => {
    scrollToTop()
    window.location.href = path
  }

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-300">
      {/* Glow accents */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 pt-14 sm:px-10 lg:px-16">
        {/* ===== CTA band ===== */}
        <div className="relative mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 px-8 py-10 shadow-2xl shadow-indigo-900/40 sm:px-12">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <div>
              <h3 className="text-2xl font-extrabold text-white md:text-3xl">Ready to score higher?</h3>
              <p className="mt-2 text-sm text-white/90 md:text-base">
                Start with a free demo test or talk to an advisor — your dream score is closer than you think.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <a href="/demo-test" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-indigo-600 shadow-lg transition-transform hover:-translate-y-0.5">
                Try Free Demo <FiArrowRight />
              </a>
              <a href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
                Talk to an Advisor
              </a>
            </div>
          </div>
        </div>

        {/* ===== Main grid ===== */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Image src="/logo-dsg-white.png" alt="DSG — Score Higher, Dream Bigger" width={242} height={176} className="h-14 w-auto object-contain" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">
              Empowering students with cutting-edge test preparation tools and strategies for academic success.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="https://wa.me/13292398577" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-all hover:-translate-y-1 hover:bg-emerald-500 hover:text-white">
                <FaWhatsapp size={18} />
              </a>
              <a href="tel:+13292398577" aria-label="Call" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-all hover:-translate-y-1 hover:bg-indigo-500 hover:text-white">
                <FaPhone size={16} />
              </a>
              <a href="mailto:info@dsatguru.com" aria-label="Email" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-all hover:-translate-y-1 hover:bg-blue-600 hover:text-white">
                <FaMessage size={15} />
              </a>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" aria-label="Location" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-all hover:-translate-y-1 hover:bg-rose-500 hover:text-white">
                <FaMapMarkerAlt size={16} />
              </a>
            </div>
          </div>

          {/* Courses */}
          <div className="lg:col-span-3">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Courses</h5>
            <ul className="space-y-2.5 text-sm">
              {courses.map(
                (course, i) =>
                  courses.length - 1 !== i && (
                    <li key={i}>
                      <button onClick={() => navigate(`/enrollment/${course.courseId || course.id}`)} className="group flex items-center gap-1.5 text-left text-slate-400 transition-colors hover:text-white">
                        {course.title}
                        <FiArrowUpRight className="opacity-0 transition-opacity group-hover:opacity-100" size={13} />
                      </button>
                    </li>
                  )
              )}
            </ul>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Quick Links</h5>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => navigate('/about')} className="text-slate-400 transition-colors hover:text-white">About Us</button></li>
              <li><button onClick={() => navigate('/blog')} className="text-slate-400 transition-colors hover:text-white">Blog</button></li>
              <li className="cursor-pointer text-slate-400 transition-colors hover:text-white">Our Guarantee</li>
              <li className="cursor-pointer text-slate-400 transition-colors hover:text-white">Privacy Policy</li>
              <li className="cursor-pointer text-slate-400 transition-colors hover:text-white">Terms of Service</li>
            </ul>
          </div>

          {/* Get in touch */}
          <div className="lg:col-span-3">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Get in Touch</h5>
            <div className="space-y-3">
              <a href="tel:+13292398577" className="flex items-center gap-3 text-sm text-slate-400 transition-colors hover:text-white">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5"><FaPhone size={13} /></span>
                1-329-239-8577
              </a>
              <a href="mailto:info@dsatguru.com" className="flex items-center gap-3 text-sm text-slate-400 transition-colors hover:text-white">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5"><FaMessage size={13} /></span>
                info@dsatguru.com
              </a>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 text-sm text-slate-400 transition-colors hover:text-white">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5"><FaMapMarkerAlt size={14} /></span>
                <span>
                  Visit our office
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    Get Directions <FiArrowUpRight size={12} />
                  </span>
                </span>
              </a>
            </div>

            {/* Directions button (links to exact business location) */}
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
            >
              <FaMapMarkerAlt size={13} /> Find Us on Google Maps
            </a>
          </div>
        </div>

        {/* Divider + bottom */}
        <div className="my-8 h-px bg-white/10" />
        <div className="flex flex-col items-center justify-between gap-3 pb-8 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 DSATGURU. All rights reserved.</p>
          <p className="flex flex-wrap items-center justify-center gap-3">
            <span className="cursor-pointer transition-colors hover:text-white">Terms of Service</span>
            <span className="text-slate-700">•</span>
            <span className="cursor-pointer transition-colors hover:text-white">Refund Policy</span>
            <span className="text-slate-700">•</span>
            <span className="cursor-pointer transition-colors hover:text-white">Privacy Policy</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
