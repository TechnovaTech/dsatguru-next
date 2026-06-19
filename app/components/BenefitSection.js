'use client'
import { motion } from 'framer-motion'
import { FaRocket, FaSmile, FaUniversity } from 'react-icons/fa'

const benefits = [
  {
    icon: <FaUniversity size={26} className="text-white" />,
    title: 'Key to Maximize College Prospects',
    description:
      'Our proven methods and expert guidance ensure measurable improvement on your DSAT/PSAT score to boost your college application prospects and scholarships.',
    color: 'from-indigo-600 to-indigo-700',
  },
  {
    icon: <FaSmile size={26} className="text-white" />,
    title: 'Reduce Test-Related Anxiety',
    description:
      'Our realistic practice tests and comprehensive preparation tools help students feel confident and prepared, reducing test anxiety on the actual exam day.',
    color: 'from-blue-600 to-blue-700',
  },
  {
    icon: <FaRocket size={26} className="text-white" />,
    title: 'Get the Confidence You Need',
    description:
      "With over 4,000 practice questions and 25+ adaptive tests, our program ensures you'll walk into test day with the confidence to perform at your very best.",
    color: 'from-teal-600 to-teal-700',
  },
]

export default function BenefitsSection() {
  return (
    <section className="relative w-full overflow-hidden px-6 py-24 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm">
          Why It Matters
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          Benefits of <span className="dg-gradient-text">Affordable SAT Exam Preparation</span>
        </h3>
        <p className="mx-auto mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
          We offer a budget-friendly SAT study course designed to help students achieve higher scores without
          compromising on quality, structure, or expert guidance.
        </p>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              whileHover={{ y: -8 }}
              className="dg-glass-card dg-hover-glow relative rounded-3xl px-7 pb-9 pt-14 text-center"
            >
              <div className="absolute -top-9 left-1/2 -translate-x-1/2">
                <div
                  className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.color} shadow-lg ring-4 ring-white`}
                >
                  {benefit.icon}
                </div>
              </div>
              <h4 className="text-lg font-bold leading-snug text-slate-900">{benefit.title}</h4>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
