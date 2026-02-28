'use client'
import { useMemo, useEffect } from 'react'
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
    seo: {
      dsat: {
        title: 'SAT Boot Camp | Summer SAT Prep Course',
        description: 'Join our SAT bootcamp online with intensive summer SAT prep courses, expert-led classes, and focused strategies to build confidence and test-day readiness.',
      },
      psat: {
        title: 'PSAT Online Bootcamp | Summer PSAT Prep',
        description: 'Discover PSAT online bootcamp and summer prep programs with expert-led classes, personalized guidance, and strategies to boost your PSAT performance.',
      },
    },
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
    seo: {
      dsat: {
        title: 'SAT Live Online Classes | SAT Prep',
        description: 'Enroll in live online SAT courses with expert instructors, interactive sessions, real-time doubt solving, and structured SAT exam preparation.',
      },
      psat: {
        title: 'PSAT Live Online Courses | PSAT Prep',
        description: 'Improve your PSAT skills with live online courses and prep classes offering real-time lessons, personalized guidance, and strategies to excel on test day.',
      },
    },
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
    seo: {
      dsat: {
        title: 'SAT Tutoring Online | One-on-One SAT Prep',
        description: 'Get personalized one-on-one SAT tutoring with expert SAT tutors, customized study plans, and proven strategies designed to maximize your score.',
      },
      psat: {
        title: 'PSAT Tutoring Online | Expert PSAT Tutors & Sessions',
        description: 'Our PSAT tutoring online offers personalized sessions, expert guidance, and tailored strategies to strengthen skills and boost exam performance.',
      },
    },
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
    seo: {
      dsat: {
        title: 'SAT Reading & Writing Prep | Practice Questions',
        description: 'Prepare for the SAT reading and writing test with practice questions, reading passages, writing prompts, and structured test prep strategies.',
      },
      psat: {
        title: 'PSAT Reading & Writing Prep| Sample Questions & Tests',
        description: 'Explore PSAT reading and writing with targeted practice tests, sample questions, and exercises to build confidence and improve performance.',
      },
    },
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
    seo: {
      dsat: {
        title: 'Free SAT Diagnostic Test Online | Detailed Analysis',
        description: 'Identify your strengths and weaknesses with a free SAT diagnostic test online, gain performance insights, and plan a personalized SAT prep strategy.',
      },
      psat: {
        title: 'Free PSAT Skills Assessment | Diagnostic Test Online',
        description: 'Discover your PSAT skill gaps with an online diagnostic test, analyze results in detail, and plan a personalized study approach for higher scores.',
      },
    },
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
    seo: {
      dsat: {
        title: 'Free SAT Practice Test Online | Digital SAT Tests',
        description: 'Start your free SAT practice test online with realistic exams, full-length tests, targeted practice questions, and detailed answer explanations.',
      },
      psat: {
        title: 'Free PSAT Online Practice Test | PSAT Test',
        description: 'Experience PSAT prep online with free full-length practice tests, interactive questions, and exercises designed to sharpen skills and boost readiness.',
      },
    },
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
    seo: {
      dsat: {
        title: 'Free SAT Mock Test Online | Real Exam Simulation',
        description: 'Try our free SAT mock test online featuring real exam simulation, full-length digital exams, smart analytics, and detailed performance reports.',
      },
      psat: {
        title: 'Free PSAT Mock Test | Interactive Online Test',
        description: 'Test your PSAT skills with a free interactive online mock test, featuring realistic questions and exercises to sharpen accuracy and confidence.',
      },
    },
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
    seo: {
      dsat: {
        title: 'SAT Math Prep | Practice Questions & Review',
        description: 'Explore SAT math with practice questions, detailed answers, structured review, and online math training designed to strengthen core concepts.',
      },
      psat: {
        title: 'PSAT Math Prep | Practice Questions & Test Review',
        description: 'Prepare for the PSAT math with focused practice questions, detailed topic reviews, and full-length exercises to strengthen problem-solving skills.',
      },
    },
    overview:
      'Focused prep for the Math section, including algebra, advanced math, problem solving, and data analysis using exam-style questions.',
    keyPoints: [
      'Comprehensive coverage of all math domains',
      'Calculator and no-calculator strategies',
      'Step-by-step solutions for every practice problem',
    ],
  },
  'study-guide': {
    titleSuffix: 'Study-Guide',
    highlightTag: 'Smart Study Plan',
    heroImage: '/hero-2.png',
    overview:
      'A structured study guide that outlines what to study, when to study, and how to track progress for consistent improvement.',
    keyPoints: [
      'Week-by-week breakdown of topics and practice',
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
    
    // Get exam-specific SEO data
    const seoData = base.seo?.[normalizedExam] || {}

    return {
      examKey: normalizedExam,
      examLabel,
      title: fullTitle,
      highlightTag: base.highlightTag,
      overview: base.overview,
      keyPoints: base.keyPoints,
      heroImage: base.heroImage || '/hero-3.png',
      seoTitle: seoData.title,
      seoDescription: seoData.description,
    }
  }, [exam, slug])

  // Update page metadata dynamically
  useEffect(() => {
    if (program) {
      // Update title
      document.title = program.seoTitle || `${program.title} | DSATGURU`
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.name = 'description'
        document.head.appendChild(metaDescription)
      }
      metaDescription.content = program.seoDescription || program.overview
    }
  }, [program])

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
          <div className="w-full space-y-6 text-white text-center md:text-left md:w-2/3">
            <div className="relative inline-block uppercase tracking-wider text-xs px-4 py-3 border-2 border-white/80 rounded-full overflow-hidden bg-white/10">
              <span className="relative z-10 text-white">{program.highlightTag}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold whitespace-pre-line leading-tight">
              {program.title}
            </h1>
            <p className="mt-4 text-gray-200 text-md md:text-lg">
              {program.overview}
            </p>
            <ul className="mt-6 space-y-2 text-gray-300 text-sm">
              {program.keyPoints?.map((item, index) => (
                <li key={index} className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-blue-300">✔</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-blue-800 mb-8">
              {program.title} Overview
            </h2>
            <p className="text-gray-700 mb-8">
              {program.title} is designed to give you a clear, step-by-step path from where you are
              today to your target score. You will know exactly what to study, how to practise, and how
              to measure your improvement over time for this specific program.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-3 gap-6"
        >
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
            <div
              key={idx}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-700 rounded-full mb-4 mx-auto md:mx-0">
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
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full">
              <FaPercent size={28} className="text-blue-700" />
            </div>
            <h5 className="text-2xl font-bold mb-2">Score Improvement for {program.title}</h5>
          </div>
          <p className="text-sm mt-2">
            This plan is structured so you always know what you are working toward in {program.title},
            from your first lesson to your final practice.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-2 gap-8"
        >
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                <FaClock size={24} />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <p className="text-gray-800 text-sm font-medium">
                  Smart pacing designed around busy student schedules and the exact demands of {program.title}.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Flexible yet structured
                </p>
              </div>
            </div>
            <div className="w-full h-64 overflow-hidden">
              <img
                src={program.heroImage}
                alt="Student focused on exam preparation"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-700 rounded-full flex-shrink-0">
                <FaBookOpen size={24} />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <p className="text-gray-800 text-sm font-medium">
                  Know exactly what to revise or practise after each class or test in {program.title}.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Clear next steps
                </p>
              </div>
            </div>
            <div className="w-full h-64 overflow-hidden">
              <img
                src={program.heroImage}
                alt="Student Testimonial"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-8 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-blue-700 text-center">
              Designed for Ambitious {program.examLabel} Students in {program.title}
            </h3>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed text-center">
              Students who commit to {program.title} report feeling more confident, more prepared, and
              more in control of their scores on test day.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h3
            className="text-2xl md:text-3xl font-bold text-blue-800"
          >
            Ready to Plan Your {program.title}?
          </h3>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Take the next step with {program.title}, or explore other DSAT and PSAT options from the header.
            If you need guidance, our team is happy to help you build the right plan for your goals.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
