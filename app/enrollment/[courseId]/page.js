'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  FaChalkboardTeacher, FaCertificate, FaBookOpen, FaClock, FaRegCalendarCheck, FaQuoteLeft,
} from 'react-icons/fa'
import { FiCheck, FiArrowRight, FiStar } from 'react-icons/fi'
import { useCourses } from '../../components/CourseContext'
import { useAuth } from '../../components/AuthContext'
import FloatingContactButtons from '../../components/FloatingContactButtons'
import { useToast } from '../../components/ui/UIProvider'
import axios from 'axios'

export default function EnrollmentPage() {
  const toast = useToast()
  const { courseId } = useParams()
  const router = useRouter()
  const { courses, loading: coursesLoading, refreshCourses } = useCourses()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const resumedRef = useRef(false)

  // Remember the intent to enroll, then send the guest to sign in / sign up.
  // After auth they return here (via returnTo) and checkout resumes automatically.
  const goLogin = () => {
    try { sessionStorage.setItem('dg_pending_enroll', String(courseId)) } catch {}
    router.push(`/login?returnTo=/enrollment/${courseId}`)
  }

  useEffect(() => {
    if (courses.length > 0) {
      const foundCourse = courses.find((c) => c.courseId === courseId || c.id === courseId)
      setCourse(foundCourse)
    }
  }, [courseId, courses])

  useEffect(() => {
    refreshCourses()
  }, [courseId])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleEnroll = async (scheduleId = null) => {
    if (!user) {
      goLogin()
      return
    }
    if (course.discountedPrice > 0 || course.originalPrice > 0) {
      try {
        setEnrollLoading(true)
        const token = localStorage.getItem('token')
        const response = await axios.post(
          '/api/create-payment-intent',
          { courseId: course.id, amount: course.discountedPrice || course.originalPrice, courseTitle: course.title, scheduleId },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        window.location.href = response.data.url
      } catch (error) {
        toast.error('Payment setup failed')
        setEnrollLoading(false)
      }
    } else {
      try {
        setEnrollLoading(true)
        const response = await axios.post('/api/enrollment', { courseId, scheduleId })
        if (response.data.success) {
          toast.success('Enrollment successful!')
          router.push('/dashboard/courses')
        }
      } catch (error) {
        console.error('Enrollment error:', error)
        toast.error('Failed to enroll. Please try again.')
      } finally {
        setEnrollLoading(false)
      }
    }
  }

  const handleScheduleSelection = () => {
    if (!user) {
      goLogin()
      return
    }
    if (course.courseSchedules?.length === 1) {
      handleEnroll(course.courseSchedules[0].id)
    } else if (course.courseSchedules?.length > 1) {
      setShowScheduleModal(true)
    } else {
      handleEnroll(null)
    }
  }

  // Resume checkout automatically when the user comes back authenticated after
  // being sent to sign in mid-enroll. (They still actively pay on Stripe.)
  useEffect(() => {
    if (resumedRef.current || !user || !course) return
    let pending = null
    try { pending = sessionStorage.getItem('dg_pending_enroll') } catch {}
    if (pending && pending === String(courseId)) {
      resumedRef.current = true
      try { sessionStorage.removeItem('dg_pending_enroll') } catch {}
      handleScheduleSelection()
    }
  }, [user, course])

  if (coursesLoading) {
    return (
      <div className="dg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4 text-slate-500">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="dg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Course Not Found</h2>
          <p className="mb-6 text-slate-500">The course you&apos;re looking for doesn&apos;t exist.</p>
          <button onClick={() => router.push('/')} className="rounded-full bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const hasPrice = course.originalPrice > 0 || course.discountedPrice > 0
  const benefits = [
    { icon: <FaChalkboardTeacher size={24} />, title: 'Expert Instructors', desc: 'Learn from experienced educators with proven track records of helping students achieve exceptional DSAT/PSAT scores.', grad: 'from-indigo-600 to-indigo-700' },
    { icon: <FaCertificate size={24} />, title: 'Score Guarantee', desc: "We're confident in our methods. Complete all course requirements and we guarantee a significant score improvement.", grad: 'from-blue-600 to-blue-700' },
    { icon: <FaBookOpen size={24} />, title: 'Comprehensive Materials', desc: 'Access to extensive practice materials, realistic practice tests, and detailed explanations for all questions.', grad: 'from-teal-600 to-teal-700' },
  ]

  return (
    <section className="dg w-full bg-white text-slate-900">
      <FloatingContactButtons />

      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-36 lg:grid-cols-2 lg:gap-10">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur">
              <FiStar /> Let&apos;s Score Higher!
            </span>
            <h1 className="mt-5 whitespace-pre-line text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 whitespace-pre-line text-lg font-medium text-slate-500">{course.subtitle}</p>
            )}

            <ul className="mt-7 grid gap-2.5">
              {course.included?.slice(0, 4).map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <FiCheck size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              {hasPrice && (
                <div className="flex items-end gap-2">
                  {course.originalPrice ? <span className="pb-1 text-sm text-slate-400 line-through">${course.originalPrice}</span> : null}
                  <span className="text-4xl font-extrabold text-slate-900">${course.discountedPrice || course.originalPrice}</span>
                </div>
              )}
              <button
                onClick={handleScheduleSelection}
                disabled={enrollLoading}
                className="dg-shine group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-60"
              >
                {enrollLoading ? 'Processing...' : 'Enroll Now'}
                <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            {course.enrollmentNote && <p className="mt-3 text-sm text-slate-500">{course.enrollmentNote}</p>}
          </div>

          {/* Right — created branded graphic */}
          <motion.div
            initial={{ opacity: 1, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-tr from-indigo-400/25 to-blue-400/25 blur-2xl" />
            <Image
              src="/course-hero-art.png"
              alt={`${course.title} — score growth with DSATGURU`}
              width={900}
              height={980}
              priority
              className="relative w-full rounded-[2rem] shadow-2xl shadow-indigo-900/20"
            />
          </motion.div>
        </div>
      </div>

      {/* ===== OVERVIEW + BENEFITS ===== */}
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-3 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg lg:col-span-2"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            Course Overview
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900 md:text-3xl">
            What you&apos;ll <span className="dg-gradient-text">master</span>
          </h2>
          {course.description && <p className="mt-4 leading-relaxed text-slate-600">{course.description}</p>}
          <ul className="mt-6 grid gap-3.5 sm:grid-cols-2">
            {course.included?.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                  <FiCheck size={11} />
                </span>
                <span className="text-sm text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="flex flex-col gap-5">
          {benefits.map((b, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${b.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
                {b.icon}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{b.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ===== PRICING + INFO + SCHEDULES ===== */}
      <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-5 lg:px-12">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Offer card */}
            {hasPrice && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 p-8 text-white shadow-xl"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold">%</div>
                  <h5 className="text-xl font-bold">Special Offer</h5>
                  {course.originalPrice ? <p className="mt-2 text-sm text-white/80 line-through">${course.originalPrice}</p> : null}
                  <p className="text-4xl font-extrabold">${course.discountedPrice || course.originalPrice}</p>
                  {course.priceNote && <p className="mt-1 text-xs text-white/80">{course.priceNote}</p>}
                </div>
                <button
                  onClick={handleScheduleSelection}
                  disabled={enrollLoading}
                  className="relative mt-6 w-full rounded-full bg-white py-3 text-sm font-bold text-indigo-600 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {enrollLoading ? 'Processing...' : 'Enroll Now'}
                </button>
              </motion.div>
            )}

            {/* Duration + Format */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-bold text-slate-800">Class Duration</h5>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><FaClock size={18} /></span>
                </div>
                <p className="text-sm font-medium text-slate-800">Multiple Sessions</p>
                <p className="mt-1 text-xs text-slate-500">Comprehensive course with regular classes</p>
              </div>
              <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-bold text-slate-800">Class Format</h5>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><FaChalkboardTeacher size={18} /></span>
                </div>
                <p className="text-sm font-medium text-slate-800">Live Online Classes</p>
                <p className="mt-1 text-xs text-slate-500">Interactive sessions with expert instructors</p>
              </div>
            </div>
          </div>

          {/* Schedules */}
          {course.courseSchedules?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white"><FaRegCalendarCheck size={18} /></span>
                <h5 className="text-lg font-bold text-slate-800">Upcoming Schedules</h5>
              </div>
              <ul className="space-y-4">
                {course.courseSchedules.map((schedule, idx) => (
                  <li key={idx} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><FiCheck size={11} /></span>
                    <div>
                      <p className="font-semibold text-slate-800">{schedule.batchTag}</p>
                      <ul className="ml-1 mt-1 space-y-1 text-sm text-slate-500">
                        {schedule.labels?.map((label, lidx) => (
                          <li key={lidx}>{label.replace(/[()]/g, '')}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Testimonial / trust card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 p-8 text-white shadow-2xl lg:col-span-2"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="relative">
            <FaQuoteLeft className="text-indigo-300" size={28} />
            <p className="mt-5 text-lg font-medium leading-relaxed">
              &quot;Our students consistently see significant score improvements after completing this course — with expert
              guidance every step of the way.&quot;
            </p>
            <div className="mt-5 flex gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => <FiStar key={i} fill="currentColor" />)}
            </div>
            <p className="mt-3 text-sm font-semibold text-indigo-200">DSAT/PSAT Students</p>
          </div>
          <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
            {[['4,000+', 'Questions'], ['99%', 'Success'], ['+260', 'Avg Gain']].map(([n, l]) => (
              <div key={l}>
                <div className="text-xl font-extrabold">{n}</div>
                <div className="text-[11px] text-indigo-200">{l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ===== CTA ===== */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 px-8 py-14 text-center text-white shadow-2xl"
        >
          <div className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-blue-300/20 blur-2xl" />
          <h3 className="relative text-2xl font-extrabold md:text-3xl">Ready to Boost Your Score?</h3>
          <p className="relative mx-auto mt-3 max-w-2xl text-sm text-white/90 md:text-base">
            Enroll in our DSAT/PSAT programs and get expert training, real practice tests, and a clear strategy to
            success. Join today and see the difference!
          </p>
          <button
            onClick={handleScheduleSelection}
            disabled={enrollLoading}
            className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-indigo-600 shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {enrollLoading ? 'Processing...' : 'Enroll Now'} <FiArrowRight />
          </button>
        </motion.div>
      </div>

      {/* Schedule Selection Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Select Schedule</h3>
            <div className="mb-6 space-y-3">
              {course.courseSchedules?.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => setSelectedSchedule(schedule.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedSchedule === schedule.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-800">{schedule.batchTag}</div>
                  {schedule.labels?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-500">
                      {schedule.labels.map((label, lidx) => (
                        <li key={lidx}>{label.replace(/[()]/g, '')}</li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowScheduleModal(false)} className="flex-1 rounded-full border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedSchedule) {
                    setShowScheduleModal(false)
                    handleEnroll(selectedSchedule)
                  }
                }}
                disabled={!selectedSchedule}
                className="flex-1 rounded-full bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
