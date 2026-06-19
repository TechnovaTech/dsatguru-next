'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'

const stats = [
  { number: '4,000+', label: 'Practice Questions', color: 'from-indigo-600 to-indigo-700' },
  { number: '10+', label: 'Years Experience', color: 'from-blue-600 to-blue-700' },
  { number: '99%+', label: 'Success Rate', color: 'from-emerald-500 to-teal-500' },
]

export default function IntroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-16">
      <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 lg:flex-row">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="flex w-full justify-center lg:w-1/2"
        >
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-indigo-400/25 via-blue-400/20 to-sky-400/25 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-2xl">
              <Image
                src="/70f38349-b4a8-4414-b6d0-d1f119675428.png"
                alt="10+ Years Experience - DSATGURU"
                width={1402}
                height={1122}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/2"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            Smarter SAT Prep
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
            Get Closer to Your Dream College with{' '}
            <span className="dg-gradient-text">Smarter SAT Preparation</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            An innovative SAT preparation platform, empowering students with personalized SAT exam prep, advanced study
            tools, and proven strategies. We offer structured courses, live and online classes, adaptive practice tests,
            and over 4,000 realistic questions to strengthen your weak areas and maximize your score.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            With over 10 years of experience, we focus on what truly matters — helping students make the most of their
            limited time and achieve their highest college-bound potential.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className="group rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`bg-gradient-to-r ${stat.color} bg-clip-text text-2xl font-extrabold text-transparent`}>
                  {stat.number}
                </div>
                <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
