'use client'
import { motion } from 'framer-motion'
import { MdFormatQuote } from 'react-icons/md'
import { FaStar } from 'react-icons/fa'

const testimonials = [
  {
    initials: 'JD',
    name: 'Jamie D.',
    quote:
      "The pilot program for this website's adaptive practice tests were incredibly helpful. They really mirrored the actual DSAT format and helped me feel confident on test day. I improved by 270 points!",
    score: 'Score improved: 1210 → 1480',
    gradient: 'from-indigo-600 to-indigo-700',
  },
  {
    initials: 'MR',
    name: 'Michael R.',
    quote:
      'I was a part of pilot live prep course. My instructor Mr. G made complex topics easy to understand, and the practice tests were exactly like the real DSAT. The drills after each class made the difference.',
    score: 'Score improved: 1180 → 1500',
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    initials: 'AT',
    name: 'Aisha T.',
    quote:
      'I took the bootcamp session (initial free program) right before my test. It refreshed all the key concepts and strategies. My score jumped 260 points from my DSAT! The instructors were amazing.',
    score: 'Score improved: 1280 → 1540',
    gradient: 'from-emerald-500 to-teal-600',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-24 text-slate-800 sm:px-6 lg:px-16">
      <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="mx-auto mb-14 max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm">
          Testimonials (Pilot Program)
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          Success Stories from <span className="dg-gradient-text">Our Students</span>
        </h3>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {testimonials.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.15 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
            className="dg-glass-card dg-hover-glow relative flex flex-col gap-4 rounded-3xl p-7 text-left"
          >
            <div className={`absolute -top-5 left-7 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white shadow-lg`}>
              <MdFormatQuote size={22} />
            </div>
            <div className="mt-4 flex gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} size={14} />
              ))}
            </div>
            <p className="text-sm italic leading-relaxed text-slate-700">&quot;{t.quote}&quot;</p>
            <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} font-bold text-white`}>
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs font-semibold text-emerald-600">{t.score}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
