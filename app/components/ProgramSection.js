'use client'
import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCourses } from './CourseContext'
import { useRouter } from 'next/navigation'
import { FiCheck, FiArrowRight, FiPhone } from 'react-icons/fi'

const accents = [
  { grad: 'from-indigo-600 to-indigo-800', soft: 'bg-indigo-50', text: 'text-indigo-600' },
  { grad: 'from-blue-600 to-blue-800', soft: 'bg-blue-50', text: 'text-blue-600' },
  { grad: 'from-teal-600 to-teal-800', soft: 'bg-teal-50', text: 'text-teal-600' },
  { grad: 'from-violet-600 to-violet-800', soft: 'bg-violet-50', text: 'text-violet-600' },
  { grad: 'from-sky-600 to-sky-800', soft: 'bg-sky-50', text: 'text-sky-600' },
]

const ProgramCard = ({ data, index, isEnrolled, featured }) => {
  const router = useRouter()
  const a = accents[index % accents.length]

  const discountPercentage = useMemo(() => {
    if (data.originalPrice && data.discountedPrice) {
      return Math.round(((Number(data.originalPrice) - Number(data.discountedPrice)) / Number(data.originalPrice)) * 100)
    }
    return null
  }, [data.originalPrice, data.discountedPrice])

  const IconComponent = data.icon
  const isTutoring = data?.slug === 'individual-tutoring' || !data.originalPrice
  const enroll = () => {
    const id = data.courseId || data.id || data._id
    router.push(isEnrolled ? `/dashboard/courses/${id}` : `/enrollment/${id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 1, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.08 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -10 }}
      className={`relative h-full w-full ${featured ? 'lg:-my-3' : ''}`}
    >
      {/* glow ring for featured */}
      {featured && (
        <div className="dg-animate-gradient absolute -inset-[2px] rounded-[2rem] bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 opacity-70 blur-[5px]" />
      )}

      <div className="dg-hover-glow group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-lg duration-500">
        {/* ===== gradient header ===== */}
        <div className={`relative bg-gradient-to-br ${a.grad} px-6 pb-14 pt-8 text-center text-white`}>
          <div className="dg-blob pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute inset-0 dg-grid-bg opacity-[0.12]" />

          {discountPercentage ? (
            <span className="absolute -right-10 top-5 rotate-45 bg-amber-400 px-10 py-1 text-[11px] font-extrabold text-slate-900 shadow">
              {discountPercentage}% OFF
            </span>
          ) : null}
          {featured ? (
            <span className="relative mb-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-900 shadow">
              ★ Most Popular
            </span>
          ) : null}

          <h4 className="relative text-lg font-extrabold uppercase leading-tight">{data.title}</h4>
          <p className="relative mt-1 text-sm font-medium text-white/85">{data.subtitle}</p>
          {data.batch && (
            <span className="relative mt-3 inline-block whitespace-pre-line rounded-full bg-white/15 px-4 py-1 text-xs font-bold ring-1 ring-white/25">
              {Array.isArray(data.batch) ? data.batch.join('\n') : data.batch}
            </span>
          )}
        </div>

        {/* ===== body ===== */}
        <div className="relative flex flex-1 flex-col px-6 pb-6">
          {/* floating icon overlapping the seam */}
          <div className="mx-auto -mt-9 mb-3 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-white shadow-xl ring-4 ring-white">
            <span className={`flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} text-white transition-transform duration-300 group-hover:scale-110`}>
              {IconComponent ? <IconComponent size={28} /> : <span className="text-2xl font-bold">📚</span>}
            </span>
          </div>

          {/* price */}
          <div className="mb-4 text-center">
            {isTutoring ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Call us</div>
                <div className="text-xl font-extrabold text-slate-900">1-329-239-8577</div>
              </>
            ) : (
              <div className="flex items-end justify-center gap-2">
                <span className="pb-1.5 text-sm text-slate-400 line-through">${data.originalPrice}</span>
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">${data.discountedPrice}</span>
              </div>
            )}
          </div>

          <div className="mb-5 h-px bg-slate-100" />

          {/* features */}
          <ul className="flex-1 space-y-3 text-left text-sm text-slate-700">
            {data.included?.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${a.soft} ${a.text}`}>
                  <FiCheck size={12} />
                </span>
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="pt-6">
            {isTutoring ? (
              <button
                onClick={() => router.push('/contact')}
                className={`dg-shine group/btn relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r ${a.grad} py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5`}
              >
                Contact Us <FiPhone size={15} />
              </button>
            ) : (
              <button
                onClick={enroll}
                className={`dg-shine group/btn relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r ${a.grad} py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5`}
              >
                {isEnrolled ? 'Access Course' : 'Enroll Now'} <FiArrowRight className="transition-transform group-hover/btn:translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ProgramSection({ landingPlanRef }) {
  const { courses } = useCourses()
  const [enrolledIds, setEnrolledIds] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setEnrolledIds([])
    }
  }, [courses.length])

  return (
    <section id="programs" ref={landingPlanRef} className="relative w-full overflow-hidden bg-white px-4 pb-14 pt-14 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative mx-auto mb-14 max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          Our Programs
        </span>
        <h2 className="mt-5 text-4xl font-extrabold text-slate-900 md:text-5xl">
          Choose Your <span className="dg-gradient-text">Path to Success</span>
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          Select the sat preparation course that best fits your needs and learning style. All options are designed to
          maximize your score improvement.
        </p>
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-stretch gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {courses.map((course, i) => (
          <ProgramCard
            key={i}
            data={course}
            index={i}
            featured={i === 1}
            isEnrolled={
              enrolledIds.includes(course.id) ||
              enrolledIds.includes(course.courseId) ||
              enrolledIds.includes(course._id)
            }
          />
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-slate-500">
        Score increase guarantee applies to students who complete all course requirements and practice tests.
        <br />
        Concept videos provide comprehensive review of core DSAT/PSAT topics.
      </p>
    </section>
  )
}
