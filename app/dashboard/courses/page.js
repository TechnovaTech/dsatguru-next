'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import {
  FiBookOpen,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiTag,
  FiPlayCircle,
  FiSearch,
} from 'react-icons/fi'

export default function CoursesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState([])
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollMsg, setEnrollMsg] = useState(null) // { type: 'success' | 'error', text }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const coursesRes = await axios.get('/api/courses')
      const enrollmentsRes = await axios.get('/api/enrollment', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const enrollments = enrollmentsRes.data.enrollments || enrollmentsRes.data.data || []

      const allCourses = (coursesRes.data.courses || coursesRes.data.data || []).filter(c => c.type === 'course')
      const enrolledCourseIds = enrollments.map(e => (e.courseId?._id || e.courseId))

      const enrolledCoursesWithData = allCourses.filter(course =>
        enrolledCourseIds.includes(course.id)
      ).map(course => ({
        ...course,
        enrolledAt: enrollments.find(e => (e.courseId?._id || e.courseId) === course.id)?.enrolledAt
      }))

      const availableCourses = allCourses.filter(course =>
        !enrolledCourseIds.includes(course.id)
      )

      setCourses(availableCourses)
      setEnrolledCourses(enrolledCoursesWithData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError("Couldn't load courses.")
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (course) => {
    setEnrollMsg(null)
    if (course.discountedPrice > 0 || course.price > 0) {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.post('/api/create-payment-intent', {
          courseId: course.id,
          amount: course.discountedPrice || course.price,
          courseTitle: course.title
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })

        window.location.href = response.data.url
      } catch (error) {
        setEnrollMsg({ type: 'error', text: 'Payment setup failed. Please try again.' })
      }
    } else {
      enrollFree(course)
    }
  }

  const enrollFree = async (course) => {
    try {
      const token = localStorage.getItem('token')

      const response = await axios.post('/api/enroll', { courseId: course.id }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success || (response.status >= 200 && response.status < 300)) {
        setEnrollMsg({ type: 'success', text: 'Enrolled successfully!' })
      }
      fetchData()
    } catch (error) {
      setEnrollMsg({ type: 'error', text: 'Enrollment failed. Please try again.' })
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      const courseId = urlParams.get('courseId')
      const sessionId = urlParams.get('session_id')
      if (courseId) {
        enrollAfterPayment(courseId, sessionId)
      }
    }
  }, [])

  const enrollAfterPayment = async (courseId, sessionId) => {
    try {
      const token = localStorage.getItem('token')

      await axios.post('/api/enroll', { courseId, sessionId }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setEnrollMsg({ type: 'success', text: 'Payment successful! You are now enrolled.' })
      fetchData()
      window.history.replaceState({}, '', '/dashboard/courses')
    } catch (error) {
      setEnrollMsg({ type: 'error', text: 'Enrollment failed after payment. Please contact support.' })
    }
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-5 w-5" />
            </span>
            My Live Courses
          </h1>
          <p className="mt-1 text-sm text-slate-500">These are the courses you enroll in &mdash; each one unlocks its live classes and lessons. Manage your courses and explore new ones here.</p>
        </div>

        {/* Error alert */}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
              {error} Please try again.
            </span>
            <button
              onClick={fetchData}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Enroll feedback */}
        {enrollMsg && (
          <div
            role="alert"
            className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
              enrollMsg.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {enrollMsg.type === 'success'
                ? <FiCheckCircle className="h-4 w-4 flex-shrink-0" />
                : <FiAlertCircle className="h-4 w-4 flex-shrink-0" />}
              {enrollMsg.text}
            </span>
            <button
              onClick={() => setEnrollMsg(null)}
              aria-label="Dismiss"
              className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-black/5"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <FiCheckCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{enrolledCourses.length}</p>
              <p className="text-sm text-slate-500">Enrolled Courses</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white">
              <FiBookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{courses.length}</p>
              <p className="text-sm text-slate-500">Available Courses</p>
            </div>
          </div>
        </div>

        {/* Enrolled courses */}
        {enrolledCourses.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Enrolled Courses</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {course.bannerImageUrl ? (
                    <img
                      src={course.bannerImageUrl}
                      alt={course.title || 'Course banner'}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
                      <FiBookOpen className="h-10 w-10 text-indigo-300" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">{course.title || '—'}</h3>
                      <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Enrolled
                      </span>
                    </div>
                    <p className="mb-4 line-clamp-3 text-sm text-slate-500">{course.description || '—'}</p>
                    <p className="mb-4 mt-auto flex items-center gap-1.5 text-xs text-slate-400">
                      <FiCalendar className="h-3.5 w-3.5" />
                      Enrolled on {formatDate(course.enrolledAt)}
                    </p>
                    <button
                      onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiPlayCircle className="h-4 w-4" />
                      Continue Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available courses */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Available Live Courses</h2>
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FiSearch className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold text-slate-900">No courses available</h3>
              <p className="mt-1 text-sm text-slate-500">
                {enrolledCourses.length > 0
                  ? "You're enrolled in all available courses. Check back soon for more."
                  : 'There are no live courses to enroll in right now. Check back soon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const hasDiscount = course.discountedPrice != null && course.discountedPrice !== '' && Number(course.discountedPrice) > 0
                const finalPrice = hasDiscount ? course.discountedPrice : course.price
                const isFree = !Number(finalPrice)
                return (
                  <div
                    key={course.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {course.bannerImageUrl ? (
                      <img
                        src={course.bannerImageUrl}
                        alt={course.title || 'Course banner'}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
                        <FiBookOpen className="h-10 w-10 text-indigo-300" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="mb-2 text-base font-bold text-slate-900">{course.title || '—'}</h3>
                      <p className="mb-4 line-clamp-3 text-sm text-slate-500">{course.description || '—'}</p>

                      <div className="mb-4 mt-auto flex items-end justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          {isFree ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                              Free
                            </span>
                          ) : (
                            <>
                              <span className="text-2xl font-extrabold text-indigo-600">${finalPrice}</span>
                              {hasDiscount && (
                                <span className="text-sm text-slate-400 line-through">${course.price}</span>
                              )}
                            </>
                          )}
                        </div>
                        {hasDiscount && course.discountPercentage ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <FiTag className="h-3 w-3" />
                            {course.discountPercentage}% off
                          </span>
                        ) : null}
                      </div>

                      {course.createdAt && (
                        <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
                          <FiCalendar className="h-3.5 w-3.5" />
                          Added {formatDate(course.createdAt)}
                        </p>
                      )}

                      <button
                        onClick={() => handleEnroll(course)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        Enroll Now
                        <FiArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
