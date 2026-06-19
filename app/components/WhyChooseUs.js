'use client'
import { motion } from 'framer-motion'
import { FiCheck } from 'react-icons/fi'
import {
  MdScore,
  MdViewInAr,
  MdVerified,
  MdLiveTv,
  MdQuiz,
  MdOutlineSchool,
  MdPerson,
  MdLibraryBooks,
  MdBuild,
  MdTimeline,
  MdArrowForward,
  MdPsychology,
} from 'react-icons/md'
import ComparisonSection from './ComparisonSection'

const points = [
  'Comprehensive research-backed content specifically tailored for the Digital SAT',
  'Guaranteed score improvement backed by our confidence in our teaching methods',
  'Simple, efficient, affordable program that empowers students with resources to succeed',
  'Multiple learning options including live online courses, practice tests, and individual tutoring',
]

const highlightCards = [
  {
    icon: <MdScore size={26} />,
    gradient: 'from-indigo-600 to-indigo-700',
    title: 'Score Guarantee',
    description: "We guarantee a 200+ point boost if you're below 1220 or a score above 1420+ for first-time test takers*.",
  },
  {
    icon: <MdViewInAr size={26} />,
    gradient: 'from-blue-600 to-blue-700',
    title: 'Realistic Adaptive Tests',
    description: 'Our questions mimic the DSAT/PSAT format, giving you test-day confidence.',
  },
  {
    icon: <MdVerified size={26} />,
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Focused Topic Coverage',
    description: "We tailor our prep to exactly what's needed on the Digital SAT—nothing more, nothing less.",
  },
  {
    icon: <MdLiveTv size={26} />,
    gradient: 'from-slate-600 to-slate-700',
    title: 'Experienced Teachers',
    description: 'Learn from instructors who know the Digital SAT inside out.',
  },
]

const featuresTop = [
  { icon: <MdLibraryBooks size={24} />, title: '4000+', subtitle: 'Practice Questions' },
  { icon: <MdQuiz size={24} />, title: '25+', subtitle: 'Adaptive Tests' },
  { icon: <MdLiveTv size={24} />, title: 'Live Prep', subtitle: 'Bootcamp & Intense' },
  { icon: <MdPerson size={24} />, title: 'One-on-One', subtitle: 'Tutoring' },
  { icon: <MdScore size={24} />, title: 'Guaranteed', subtitle: 'Score Boost' },
]

const featuresBottom = [
  {
    icon: <MdOutlineSchool size={30} />,
    gradient: 'from-indigo-600 to-indigo-700',
    title: 'Comprehensive SAT Material',
    description: 'Detailed lessons and practice content that reflect the actual DSAT structure for optimal preparation.',
  },
  {
    icon: <MdBuild size={30} />,
    gradient: 'from-blue-600 to-blue-700',
    title: 'Custom Quiz Builder',
    description: 'Build your own quizzes based on topics and difficulty to strengthen understanding and retention.',
  },
  {
    icon: <MdTimeline size={30} />,
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Track Progress Effectively',
    description: 'Visual dashboards and performance trends help guide your next study steps and goals.',
  },
  {
    icon: <MdPsychology size={30} />,
    gradient: 'from-slate-600 to-slate-700',
    title: 'AI-Powered Recommendations',
    description: 'Smart suggestions based on performance patterns help you close gaps and maximize your test readiness.',
  },
]

export default function WhyChooseUs({ landingPlanRef }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-24 text-slate-800 sm:px-6 lg:px-16">
      <div className="mx-auto grid max-w-7xl items-start gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {highlightCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              viewport={{ once: true, amount: 0.3 }}
              whileHover={{ y: -6 }}
              className="dg-glass-card dg-sheen rounded-2xl p-6 text-left transition-shadow hover:shadow-xl"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                {card.icon}
              </div>
              <h4 className="mb-1 text-base font-bold text-slate-900">{card.title}</h4>
              <p className="text-sm leading-relaxed text-slate-600">{card.description}</p>
            </motion.div>
          ))}
        </div>

        <div>
          <motion.span
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600"
          >
            Why Choose Us
          </motion.span>
          <motion.h3
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl"
          >
            Why Choose <span className="dg-gradient-text">DSATGURU?</span>
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-4 text-base text-slate-600 md:text-lg"
          >
            SAT prep typically covers limited topics in Math and English. DSATGURU has researched the Digital SAT
            extensively and created a comprehensive preparation system that helps you perform better than your best.
          </motion.p>
          <ul className="mt-6 space-y-3">
            {points.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-3 text-sm text-slate-700"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                  <FiCheck size={11} />
                </span>
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            onClick={() => landingPlanRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="dg-shine relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
          >
            Start Your DSAT Prep Journey <MdArrowForward />
          </motion.button>
        </div>
      </div>

      <div className="mt-20">
        <ComparisonSection />
      </div>

      <div className="mx-auto mb-12 mt-24 max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          The Toolkit
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          Features that <span className="dg-gradient-text">make the difference</span>
        </h3>
        <p className="mt-4 text-sm text-slate-600 md:text-base">
          Our comprehensive toolkit is designed to optimize your study time and maximize your results through structured
          SAT prep strategies and data-driven performance insights.
        </p>
      </div>

      {/* Top Feature Summary */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-4 text-center sm:grid-cols-3 md:grid-cols-5">
        {featuresTop.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-4 py-6 shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow">
              {f.icon}
            </div>
            <h5 className="text-sm font-bold text-slate-800">{f.title}</h5>
            <p className="text-xs text-slate-500">{f.subtitle}</p>
          </motion.div>
        ))}
      </div>

      {/* Bottom Feature Cards */}
      <div className="mx-auto mt-16 grid max-w-6xl gap-5 px-4 sm:grid-cols-2">
        {featuresBottom.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.12 }}
            viewport={{ once: true }}
            className="flex items-center gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}>
              {item.icon}
            </div>
            <div className="text-left">
              <h5 className="mb-1 text-base font-bold text-slate-900">{item.title}</h5>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA banner */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative mx-auto mt-20 max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 px-8 py-14 text-center text-white shadow-2xl"
      >
        <div className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-blue-300/20 blur-2xl" />
        <h4 className="relative text-2xl font-extrabold md:text-3xl">Experience our power learning tool</h4>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 md:text-base">
          If you&apos;re looking for the best online sat prep resources without overspending, DSATGuru stands out from the
          rest.
        </p>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          onClick={() => landingPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-indigo-600 shadow-lg transition-shadow hover:shadow-xl"
        >
          Let&apos;s Start <MdArrowForward className="text-lg" />
        </motion.button>
        <p className="mx-auto mt-6 max-w-md text-xs text-white/80">
          *Score improvement guarantee applies to students who complete the recommended program requirements.
        </p>
      </motion.div>
    </section>
  )
}
