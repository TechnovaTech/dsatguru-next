'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCheckCircle, FaClock, FaUsers, FaPlay, FaChalkboardTeacher, FaCertificate, FaBookOpen, FaPercent } from 'react-icons/fa'
import { useCourses } from '../../components/CourseContext'
import { useAuth } from '../../components/AuthContext'

import axios from 'axios'

export default function EnrollmentPage() {
  const { courseId } = useParams()
  const router = useRouter()
  const { courses, loading: coursesLoading, refreshCourses } = useCourses()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)


  useEffect(() => {
    if (courses.length > 0) {
      const foundCourse = courses.find(c => c.courseId === courseId || c.id === courseId)
      console.log('Found course for enrollment:', foundCourse)
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
      router.push(`/login?returnTo=/enrollment/${courseId}`)
      return
    }

    if (course.discountedPrice > 0 || course.originalPrice > 0) {
      try {
        setEnrollLoading(true)
        const token = localStorage.getItem('token')
        const response = await axios.post('/api/create-payment-intent', {
          courseId: course.id,
          amount: course.discountedPrice || course.originalPrice,
          courseTitle: course.title
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        window.location.href = response.data.url
      } catch (error) {
        alert('Payment setup failed')
        setEnrollLoading(false)
      }
    } else {
      // Free course enrollment
      try {
        setEnrollLoading(true)
        const response = await axios.post('/api/enrollment', {
          courseId,
          scheduleId
        })
        
        if (response.data.success) {
          alert('Enrollment successful!')
          router.push('/dashboard/courses')
        }
      } catch (error) {
        console.error('Enrollment error:', error)
        alert('Failed to enroll. Please try again.')
      } finally {
        setEnrollLoading(false)
      }
    }
  }



  const handleScheduleSelection = () => {
    if (!user) {
      router.push(`/login?returnTo=/enrollment/${courseId}`)
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

  if (coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Course Not Found</h2>
          <p className="text-gray-600 mb-6">The course you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="w-full bg-gradient-to-b from-blue-50 to-white">
      {/* Contact Banners */}
      <a
        href="https://wa.me/13292398577"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-0 top-[30%] bg-green-600 text-white px-3 py-2 rounded-r-md shadow z-50 hover:bg-green-700 [writing-mode:vertical-rl] [text-orientation:mixed] text-sm font-semibold"
      >
        Chat on WhatsApp
      </a>
      <a
        href="tel:+13292398577"
        className="absolute left-0 top-[50%] bg-red-600 text-white px-3 py-2 rounded-r-md shadow z-50 hover:bg-red-700 [writing-mode:vertical-rl] [text-orientation:mixed] text-sm font-semibold"
      >
        Call +1 329-239-8577
      </a>
      
      {/* Hero Section */}
      <div className="relative w-full min-h-[70vh] overflow-hidden bg-gray-900">
        <div className="absolute inset-0 flex md:justify-end justify-center">
          <img
            src={course.bannerImageUrl || '/hero-3.png'}
            alt="Background"
            className="w-full md:w-1/2 h-full object-cover opacity-30 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-blue-700/10 md:via-blue-700/10 to-blue-500/10"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex items-center justify-center md:justify-start px-6 min-h-[70vh]">
          <div className="w-full md:w-1/2 space-y-6 text-white text-center md:text-left">
            <div className="relative inline-block uppercase tracking-wider text-xs px-4 py-3 border-2 border-white/80 rounded-full overflow-hidden bg-white/10">
              <span className="relative z-10 text-white">
                Let&apos;s Score Higher!
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold whitespace-pre-line leading-tight">
              {course.title}
            </h1>
            <p className="mt-4 text-gray-300 text-md md:text-lg whitespace-pre-line">
              {course.subtitle}
            </p>
            <ul className="mt-6 space-y-2 text-gray-300 text-sm">
              {course.included?.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 justify-center md:justify-start"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold">{idx + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center md:justify-start">
              <button
                onClick={handleScheduleSelection}
                disabled={enrollLoading}
                className="px-6 py-3 rounded-md bg-transparent border-2 border-blue-300 cursor-pointer hover:bg-white/10 transition text-white text-sm font-semibold shadow-lg"
              >
                {enrollLoading ? 'Processing...' : 'Enroll Now'}
              </button>
            </div>
            <p className="text-gray-400 mt-2 text-sm">
              {course.enrollmentNote}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="max-w-7xl mx-auto py-20 px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Left Overview */}
          <div id="course-overview" className="bg-white p-10 rounded-3xl shadow-xl md:col-span-2 scroll-mt-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-100 opacity-0 transition-opacity duration-1000" id="overview-highlight"></div>
            <div className="relative z-10">
            <h2 className="text-3xl font-bold text-blue-800 mb-8">
              Course Overview
            </h2>
            <p className="text-gray-700 mb-8">{course.description}</p>
            <ul className="space-y-5 text-gray-700">
              {course.included?.map((item, idx) => (
                <li key={idx} className="flex gap-3 items-start">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">{idx + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            </div>
          </div>

          {/* Right Cards */}
          <div className="flex flex-col gap-8 h-full">
            {[
              {
                icon: <FaChalkboardTeacher size={32} />,
                title: 'Expert Instructors',
                desc: 'Learn from experienced educators with proven track records of helping students achieve exceptional DSAT/PSAT scores.',
              },
              {
                icon: <FaCertificate size={32} />,
                title: 'Score Guarantee',
                desc: 'We\'re confident in our methods. Complete all course requirements and we guarantee a significant score improvement.',
              },
              {
                icon: <FaBookOpen size={32} />,
                title: 'Comprehensive Materials',
                desc: 'Access to extensive practice materials, realistic practice tests, and detailed explanations for all questions.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="flex gap-4 bg-gradient-to-br h-full items-center from-blue-100 via-blue-50 to-white/30 p-6 rounded-2xl shadow hover:shadow-lg transition"
              >
                <div className="text-blue-600 self-start mt-0 md:mt-4">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-blue-800">
                    {item.title}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pb-20 px-6 md:px-12">
        <div className="grid md:grid-cols-5 gap-10 md:gap-12">
          {/* Left Info Boxes */}
          <div className="flex flex-col gap-8 md:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Offer Card */}
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
                  <h5 className="text-2xl font-bold mb-2">Special Offer</h5>
                  <p className="text-sm line-through">
                    ${course.originalPrice}
                  </p>
                  <p className="text-3xl font-extrabold mt-1">
                    ${course.discountedPrice}
                  </p>
                  <p className="text-xs mt-1">{course.priceNote}</p>
                </div>

                <button
                  onClick={handleScheduleSelection}
                  disabled={enrollLoading}
                  className="cursor-pointer mt-6 bg-white text-blue-700 font-bold px-6 py-3 rounded-full text-sm hover:bg-blue-100 transition w-full"
                >
                  {enrollLoading ? 'Processing...' : 'Enroll Now'}
                </button>
              </motion.div>

              {/* Right Two Cards */}
              <div className="flex flex-col justify-between h-full gap-4">
                {/* Class Duration Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col flex-1 bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-gray-800">
                      Class Duration
                    </h5>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FaClock size={20} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <p className="text-gray-800 text-base text-sm font-medium">
                      Multiple Sessions
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Comprehensive course with regular classes
                    </p>
                  </div>
                </motion.div>

                {/* Class Format Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col flex-1 bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-gray-800">
                      Class Format
                    </h5>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FaChalkboardTeacher
                        size={20}
                        className="text-green-600"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <p className="text-gray-800 text-base text-sm font-medium">
                      Live Online Classes
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Interactive sessions with expert instructors
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Course Schedules (List) */}
            {course.courseSchedules?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition"
              >
                <h5 className="text-lg font-bold text-gray-800 mb-6">
                  Upcoming Schedules
                </h5>
                <ul className="space-y-4">
                  {course.courseSchedules.map((schedule, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">✔</span>
                      <div>
                        <p className="font-semibold text-gray-700">
                          {schedule.batchTag}
                        </p>
                        <ul className="ml-4 list-disc text-sm text-gray-600 mt-1 space-y-1">
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

          {/* Right Testimonial Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden md:col-span-2 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Image Top */}
              <div className="w-full h-64 overflow-hidden">
                <img
                  src={course.bannerImageUrl || '/hero-3.png'}
                  alt="Student Testimonial"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Testimonial Content */}
              <div className="p-8 flex flex-col gap-4">
                <h3 className="text-xl font-bold text-blue-700 text-center">
                  What Students Say
                </h3>
                <p className="text-gray-700 text-sm md:text-base leading-relaxed text-center">
                  &quot;Our students have seen significant improvements in their scores after taking this course.&quot;
                </p>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-blue-600 font-semibold text-center">
                    DSAT/PSAT Student
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Motivational CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-blue-100 via-blue-50 to-white rounded-2xl shadow-md p-10 text-center">
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-2xl md:text-3xl font-bold text-blue-800"
          >
            Ready to Boost Your Score?
          </motion.h3>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Enroll in our DSAT/PSAT Programs and get expert training, real
            practice tests, and a clear strategy to success. Join today and see
            the difference!
          </p>
          <button
            onClick={handleScheduleSelection}
            disabled={enrollLoading}
            className="cursor-pointer mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-blue-900 font-semibold transition"
          >
            {enrollLoading ? 'Processing...' : 'Enroll Now'}
          </button>
        </div>
      </div>



      {/* Schedule Selection Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Select Schedule</h3>
            <div className="space-y-3 mb-6">
              {course.courseSchedules?.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => setSelectedSchedule(schedule.id)}
                  className={`w-full p-3 rounded-lg border text-left transition ${
                    selectedSchedule === schedule.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">{schedule.day}</div>
                  <div className="text-sm text-gray-600">{schedule.time}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
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
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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