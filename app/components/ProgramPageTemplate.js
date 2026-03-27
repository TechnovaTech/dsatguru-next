'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaChalkboardTeacher, FaCertificate, FaBookOpen, FaPercent, FaClock } from 'react-icons/fa'

export default function ProgramPageTemplate({ program }) {
  useEffect(() => {
    document.title = program.seoTitle || `${program.title} | DSATGURU`
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.name = 'description'
      document.head.appendChild(metaDescription)
    }
    metaDescription.content = program.seoDescription || program.overview
  }, [program])

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
          <h3 className="text-2xl md:text-3xl font-bold text-blue-800">
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
