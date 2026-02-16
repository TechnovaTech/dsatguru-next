'use client'
import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaChalkboardTeacher, FaCertificate, FaBookOpen, FaPercent, FaClock } from 'react-icons/fa'

const examLabels = {
  dsat: 'Digital SAT',
  psat: 'PSAT',
}

const slugConfig = {
  'live-bootcamp-course': {
    titleSuffix: 'Live Bootcamp Course',
    highlightTag: 'Intensive Bootcamp',
    heroImage: '/hero-1.png',
    overview:
      'A fast-paced, high-impact bootcamp designed to rapidly boost your score with focused, live instruction and targeted practice.',
    keyPoints: [
      'Short-term intensive program for quick score improvement',
      'Live classes with structured daily or weekly schedule',
      'Ideal for students preparing close to test dates',
    ],
  },
  'live-prep-course': {
    titleSuffix: 'Live Prep Course',
    highlightTag: 'Comprehensive Prep',
    heroImage: '/hero-2.png',
    overview:
      'A complete preparation program that builds strong fundamentals, test-taking strategies, and confidence through live interactive sessions.',
    keyPoints: [
      'Step-by-step syllabus covering all exam domains',
      'Regular live classes with doubt-clearing support',
      'Perfect for students who want a complete guided prep',
    ],
  },
  'individual-tutoring': {
    titleSuffix: 'Individual Tutoring',
    highlightTag: '1:1 Personalized Support',
    heroImage: '/hero-3.png',
    overview:
      'Personalized tutoring focused on your unique strengths, weaknesses, and goals, with flexible scheduling and tailored lesson plans.',
    keyPoints: [
      'One-on-one coaching with expert instructors',
      'Fully customized pacing and focus areas',
      'Ideal for students needing personalized attention',
    ],
  },
  'reading-and-writing-section': {
    titleSuffix: 'Reading and Writing Section',
    highlightTag: 'Verbal Mastery',
    heroImage: '/feature.jpg',
    overview:
      'Specialized training for Reading and Writing that focuses on comprehension, grammar, vocabulary in context, and evidence-based reasoning.',
    keyPoints: [
      'Strategies for complex passages and question types',
      'Targeted grammar and usage review',
      'Timed drills that reflect the digital exam format',
    ],
  },
  'diagnostic-test': {
    titleSuffix: 'Diagnostic Test',
    highlightTag: 'Start Smart',
    heroImage: '/hero-2.png',
    overview:
      'A realistic diagnostic test that maps your current performance, identifies gaps, and recommends a clear preparation roadmap.',
    keyPoints: [
      'Adaptive-style diagnostic aligned with official exam patterns',
      'Detailed score breakdown across key skill areas',
      'Personalized study plan recommendations based on your performance',
    ],
  },
  'practice-test': {
    titleSuffix: 'Practice Test',
    highlightTag: 'Sharpen Skills',
    heroImage: '/hero-3.png',
    overview:
      'Full-length practice tests that replicate the timing, interface, and difficulty of the real exam to build endurance and accuracy.',
    keyPoints: [
      'Timed assessments with realistic question distribution',
      'Performance analytics across sections and question types',
      'Builds familiarity and reduces test-day anxiety',
    ],
  },
  'mock-test': {
    titleSuffix: 'Mock Test',
    highlightTag: 'Exam Day Simulation',
    heroImage: '/hero-1.png',
    overview:
      'High-fidelity mock tests that simulate the actual testing experience so you know exactly what to expect on test day.',
    keyPoints: [
      'Realistic test-day environment and timing',
      'Score projections to estimate your potential official score',
      'Detailed review to refine last-mile improvements',
    ],
  },
  'math-section': {
    titleSuffix: 'Math Section',
    highlightTag: 'Math Confidence',
    heroImage: '/feature.jpg',
    overview:
      'Focused prep for the Math section, including algebra, advanced math, problem solving, and data analysis using exam-style questions.',
    keyPoints: [
      'Concept-wise breakdown with targeted practice',
      'Step-by-step solutions and strategy tips',
      'Covers calculator and no-calculator style problems',
    ],
  },
  'study-guide': {
    titleSuffix: 'Study-Guide',
    highlightTag: 'Smart Study Plan',
    heroImage: '/hero-2.png',
    overview:
      'A structured study guide that outlines what to study, when to study, and how to track progress for consistent improvement.',
    keyPoints: [
      'Weekly and daily study schedules',
      'Checklists for each content area and skill',
      'Designed to integrate with our live courses and tests',
    ],
  },
}

export default function ProgramPage() {
  const params = useParams()
  const router = useRouter()

  const { exam, slug } = params

  const program = useMemo(() => {
    const normalizedExam = typeof exam === 'string' ? exam.toLowerCase() : ''
    const examLabel = examLabels[normalizedExam]
    const base = slugConfig[slug]
    if (!examLabel || !base) return null

    const fullTitle = `${examLabel} ${base.titleSuffix}`

    return {
      examKey: normalizedExam,
      examLabel,
      title: fullTitle,
      highlightTag: base.highlightTag,
      overview: base.overview,
      keyPoints: base.keyPoints,
      heroImage: base.heroImage || '/hero-3.png',
    }
  }, [exam, slug])

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Program Not Found</h1>
          <p className="text-gray-600 mb-6">
            The program you are looking for does not exist or has been moved. Please explore our other
            DSAT/PSAT options.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="w-full bg-gradient-to-b from-blue-50 to-white font-[Poppins]">
      <div className="relative w-full min-h-[70vh] overflow-hidden bg-gray-900">
        <div className="absolute inset-0 flex md:justify-end justify-center">
          <img
            src={program.heroImage}
            alt={`${program.examLabel} background`}
            className="w-full md:w-1/2 h-full object-cover opacity-30 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-blue-700/20 to-blue-500/20" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex items-center justify-center md:justify-start px-6 min-h-[70vh]">
          <div className="w-full md:w-1/2 space-y-6 text-white text-center md:text-left">
            <div className="relative inline-block uppercase tracking-wider text-xs px-4 py-3 border-2 border-white/80 rounded-full overflow-hidden bg-white/10">
              <span className="relative z-10 text-white">
                {program.highlightTag} · {program.examLabel}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold whitespace-pre-line leading-tight">
              {program.title}
            </h1>
            <p className="mt-4 text-gray-200 text-md md:text-lg">
              {program.overview}
            </p>
            <ul className="mt-6 space-y-2 text-gray-200 text-sm">
              {program.keyPoints.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 justify-center md:justify-start"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center md:justify-start gap-3">
              <button
                onClick={() => router.push('/register')}
                className="px-6 py-3 rounded-md bg-white text-blue-700 cursor-pointer hover:bg-blue-50 transition text-sm font-semibold shadow-lg"
              >
                Get Started
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="px-6 py-3 rounded-md border border-white/70 text-white cursor-pointer hover:bg-white/10 transition text-sm font-semibold"
              >
                Talk to an Advisor
              </button>
            </div>
            <p className="text-gray-300 mt-2 text-xs md:text-sm">
              Not sure if this is the right option? Our team can guide you based on your target score and
              test date.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-20 px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="bg-white p-10 rounded-3xl shadow-xl md:col-span-2 scroll-mt-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-100 opacity-0 transition-opacity duration-1000" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-blue-800 mb-8">
                {program.title} Overview
              </h2>
              <p className="text-gray-700 mb-8">
                {program.title} is designed to give you a clear, step-by-step path from where you are
                today to your target score. You will know exactly what to study, how to practise, and how
                to measure your improvement over time for this specific program.
              </p>
              <ul className="space-y-5 text-gray-700">
                <li className="flex gap-3 items-start">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">
                    1
                  </span>
                  <span>
                    Learn with structured lessons that break down complex topics into easy-to-understand
                    concepts.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">
                    2
                  </span>
                  <span>
                    Practice with realistic questions and tests that mirror the official digital exam
                    experience.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">
                    3
                  </span>
                  <span>
                    Get guidance on strategy, timing, and mindset so you can perform at your best on test
                    day.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-8 h-full">
            {[
              {
                icon: <FaChalkboardTeacher size={32} />,
                title: 'Expert-Led Sessions',
                desc: `Learn from instructors who specialise in ${program.examLabel} preparation and understand the demands of ${program.title}.`,
              },
              {
                icon: <FaCertificate size={32} />,
                title: 'Score-Focused Approach',
                desc: `${program.title} focuses on the skills and strategies that move your score, not just theory.`,
              },
              {
                icon: <FaBookOpen size={32} />,
                title: 'Structured Resources',
                desc: `Guided practice, strategy notes, and review material designed to support the full ${program.title} journey.`,
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="flex gap-4 bg-gradient-to-br h-full items-center from-blue-100 via-blue-50 to-white/30 p-6 rounded-2xl shadow hover:shadow-lg transition"
              >
                <div className="text-blue-600 self-start mt-0 md:mt-4">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-blue-800">
                    {item.title}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20 px-6 md:px-12">
        <div className="grid md:grid-cols-5 gap-10 md:gap-12">
          <div className="flex flex-col gap-8 md:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="flex flex-col bg-gradient-to-br from-blue-700/70 to-blue-500/90 text-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition h-full"
              >
                <div className="flex flex-col items-center text-center flex-1 justify-center">
                  <div className="w-16 h-16 mb-4 rounded-full bg-white flex items-center justify-center">
                    <FaPercent size={28} className="text-blue-700" />
                  </div>
                  <h5 className="text-2xl font-bold mb-2">Score Improvement for {program.title}</h5>
                  <p className="text-sm mt-2">
                    This plan is structured so you always know what you are working toward in {program.title},
                    from your first lesson to your final practice.
                  </p>
                </div>
              </motion.div>

              <div className="flex flex-col justify-between h-full gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col flex-1 bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-gray-800">
                      Time-Efficient Learning Path
                    </h5>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FaClock size={20} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <p className="text-gray-800 text-sm font-medium">
                      Smart pacing designed around busy student schedules and the exact demands of {program.title}.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Focus on the highest-impact topics and question types for this specific program.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col flex-1 bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-gray-800">
                      Clear Next Steps After Every Session
                    </h5>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FaBookOpen size={20} className="text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <p className="text-gray-800 text-sm font-medium">
                      Know exactly what to revise or practise after each class or test in {program.title}.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Guided homework, review, and revision steps matched to this program keep you on track.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden md:col-span-2 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="w-full h-64 overflow-hidden">
                <img
                  src={program.heroImage}
                  alt="Student focused on exam preparation"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <div className="p-8 flex flex-col gap-4">
                <h3 className="text-xl font-bold text-blue-700 text-center">
                  Designed for Ambitious {program.examLabel} Students in {program.title}
                </h3>
                <p className="text-gray-700 text-sm md:text-base leading-relaxed text-center">
                  Students who commit to {program.title} report feeling more confident, more prepared, and
                  more in control of their scores on test day.
                </p>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-blue-600 font-semibold text-center">
                    Join a community of motivated test takers who are serious about results.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-20 bg-gradient-to-r from-blue-100 via-blue-50 to-white rounded-2xl shadow-md p-10 text-center">
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-2xl md:text-3xl font-bold text-blue-800"
          >
            Ready to Plan Your {program.title}?
          </motion.h3>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Take the next step with {program.title}, or explore other DSAT and PSAT options from the header.
            If you need guidance, our team is happy to help you build the right plan for your goals.
          </p>
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => router.push('/register')}
              className="cursor-pointer px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-blue-900 font-semibold transition"
            >
              Create Your Account
            </button>
            <button
              onClick={() => router.push('/contact')}
              className="cursor-pointer px-8 py-3 border border-blue-600 text-blue-700 rounded-full hover:bg-blue-50 font-semibold transition"
            >
              Speak with an Expert
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
