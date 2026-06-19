'use client'
import { motion } from 'framer-motion'
import { FiCheck } from 'react-icons/fi'
import {
  MdAssessment,
  MdTimeline,
  MdLightbulbOutline,
  MdBarChart,
} from 'react-icons/md'

const personalizedCards = [
  {
    icon: <MdAssessment size={26} />,
    step: '01',
    gradient: 'from-indigo-600 to-indigo-700',
    title: 'Diagnostic Assessment',
    description:
      'Begin with our adaptive diagnostic test that precisely identifies your starting level. This 90-minute assessment analyzes your current abilities across all test sections and generates a detailed skill breakdown.',
    points: [
      'Identifies your exact starting point',
      'Highlights strengths and weaknesses',
      'Establishes your baseline score',
      'Takes just 90 minutes to complete',
    ],
  },
  {
    icon: <MdTimeline size={26} />,
    step: '02',
    gradient: 'from-blue-600 to-blue-700',
    title: 'Personalized Study Plan',
    description:
      'Based on your diagnostic results, we create a customized study plan that focuses on your specific needs. Your plan includes recommended daily activities with time estimates to keep you on track.',
    points: [
      'Tailored to your learning style',
      'Prioritizes your weakest areas first',
      'Adjusts as you improve',
      'Includes estimated completion times',
    ],
  },
  {
    icon: <MdLightbulbOutline size={26} />,
    step: '03',
    gradient: 'from-sky-500 to-cyan-600',
    title: 'Adaptive Learning',
    description:
      'Our system continuously adapts to your progress. As you master concepts, the difficulty increases. If you struggle with certain topics, the system provides additional support and simplified explanations.',
    points: [
      'Questions match your current ability',
      'Gradually increases in difficulty',
      'Provides extra help when needed',
      'Ensures optimal challenge level',
    ],
  },
  {
    icon: <MdBarChart size={26} />,
    step: '04',
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Performance Analytics',
    description:
      'Track your improvement with detailed performance analytics. See your progress over time, identify remaining weak areas, and receive projected scores based on your current performance.',
    points: [
      'Visual progress tracking',
      'Time management insights',
      'Score prediction updates',
      'Topic mastery indicators',
    ],
  },
]

export default function PersonalizedLearningSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pb-24 pt-14 text-slate-800 sm:px-6 lg:px-16">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          How It Works
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          Your Digital SAT Journey, <span className="dg-gradient-text">Your Way</span>
        </h3>
        <p className="mt-4 text-base text-slate-600 md:text-lg">
          Experience a truly personalized sat exam preparation program that evolves with you to maximize your score
          improvement
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-2">
        {personalizedCards.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.12 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl"
          >
            <span className="pointer-events-none absolute -right-2 -top-6 text-[6rem] font-black text-slate-50 transition-colors group-hover:text-slate-100">
              {item.step}
            </span>
            <div className="relative">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}>
                {item.icon}
              </div>
              <h4 className="mt-5 text-lg font-bold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              <ul className="mt-4 space-y-2">
                {item.points.map((point, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-white`}>
                      <FiCheck size={10} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
