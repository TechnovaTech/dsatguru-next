'use client'
import { motion } from 'framer-motion'
import { MdFormatQuote } from 'react-icons/md'

const testimonials = [
  {
    initials: "JD",
    name: "Jamie D.",
    quote: "The pilot program for this website's adaptive practice tests were incredibly helpful. They really mirrored the actual DSAT format and helped me feel confident on test day. I improved by 270 points!",
    score: "Score improved: 1210 → 1480",
  },
  {
    initials: "MR",
    name: "Michael R.",
    quote: "I was a part of pilot live prep course. My instructor Mr. G made complex topics easy to understand, and the practice tests were exactly like the real DSAT. The drills after each class made the difference.",
    score: "Score improved: 1180 → 1500",
  },
  {
    initials: "AT",
    name: "Aisha T.",
    quote: "I took the bootcamp session (initial free program) right before my test. It refreshed all the key concepts and strategies. My score jumped 260 points from my DSAT! The instructors were amazing.",
    score: "Score improved: 1280 → 1540",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="w-full bg-gradient-to-br from-indigo-50 via-white to-blue-100 py-20 px-4 sm:px-6 lg:px-16 font-[Poppins] text-gray-800">
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h3 className="text-blue-600 text-3xl font-bold uppercase mb-2">TESTIMONIALS (PILOT PROGRAM)</h3>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Success Stories from Our Students</h2>
      </div>
      <div className="grid gap-10 md:grid-cols-3 max-w-6xl mx-auto">
        {testimonials.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
            viewport={{ once: true }}
            className="bg-white border border-gray-200 rounded-xl shadow p-6 text-left flex flex-col gap-4 relative"
          >
            <MdFormatQuote className="absolute top-4 right-4 text-blue-200 text-3xl" />
            <p className="text-sm text-gray-700 leading-relaxed italic">"{t.quote}"</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{t.name}</p>
                <p className="text-xs text-gray-500">{t.score}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}