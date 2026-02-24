'use client'
import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCourses } from './CourseContext'
import { useRouter } from 'next/navigation'

const bgColors = [
  "bg-blue-100",
  "bg-teal-100",
  "bg-rose-100",
  "bg-indigo-100",
  "bg-amber-100",
]
const borderColors = [
  "border-blue-300",
  "border-teal-300",
  "border-rose-300",
  "border-indigo-300",
  "border-amber-300",
]
const buttonColors = [
  "bg-blue-700 hover:bg-blue-800",
  "bg-teal-700 hover:bg-teal-800",
  "bg-rose-700 hover:bg-rose-800",
  "bg-indigo-700 hover:bg-indigo-800",
  "bg-amber-700 hover:bg-amber-800",
]
const textColors = [
  "text-blue-700",
  "text-teal-700",
  "text-rose-700",
  "text-indigo-700",
  "text-amber-700",
]

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 1,
      ease: "easeOut",
    },
  }),
}

const ProgramCard = ({ data, index, headerHeight, isEnrolled }) => {
  const router = useRouter()
  const bgColor = bgColors[index % bgColors.length]
  const borderColor = borderColors[index % borderColors.length]
  const buttonColor = buttonColors[index % buttonColors.length]
  const textColor = textColors[index % textColors.length]
  
  const discountPercentage = useMemo(() => {
    if (data.originalPrice && data.discountedPrice) {
      const discount = ((Number(data.originalPrice) - Number(data.discountedPrice)) / Number(data.originalPrice)) * 100
      return Math.round(discount)
    }
    return null
  }, [data.originalPrice, data.discountedPrice])

  const IconComponent = data.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      variants={fadeInUp}
      custom={index}
      whileHover={{ scale: 1.03 }}
      className="w-full h-full"
    >
      <div className={`h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-500 border-2 ${borderColor} rounded-2xl overflow-hidden bg-white`}>
        <div style={{ minHeight: headerHeight }} className={`flex flex-col items-center justify-start ${bgColor} bg-opacity-50 p-6`}>
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-md">
            {IconComponent ? <IconComponent size={36} className={textColor} /> : <span className={`text-2xl font-bold ${textColor}`}>📚</span>}
          </div>
          <h4 className="text-lg font-bold text-gray-800 uppercase mt-4 text-center">
            {data.title}
          </h4>
          <p className="text-sm font-semibold text-gray-700 text-center">
            {data.subtitle}
          </p>
          {data.batch && (
            <div className="mt-2">
              <span className="inline-block text-sm bg-white text-gray-700 font-medium py-1 px-5 rounded-full whitespace-pre-line shadow-md text-center">
                {Array.isArray(data.batch) ? data.batch.join("\n") : data.batch}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center p-4">
          {discountPercentage && (
            <div className={`mb-2 inline-block ${bgColor} text-gray-900 px-3 py-1 text-xs font-semibold rounded-full`}>
              {discountPercentage}% OFF
            </div>
          )}
          {data.originalPrice ? (
            <>
              <p className="text-sm line-through text-gray-500">
                ${data.originalPrice}
              </p>
              <p className="text-2xl font-extrabold text-blue-600">
                ${data.discountedPrice}
              </p>
              <p className="text-xs text-gray-700">{data.priceNote}</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 italic my-10">Contact for Pricing</p>
          )}
        </div>

        <div className="flex-1 p-6">
          <ul className="space-y-2 text-sm text-gray-700 text-left">
            {data.included?.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs flex-shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6">
          {data?.slug !== 'individual-tutoring' && (
            <button
              onClick={() => {
                const id = data.courseId || data.id || data._id
                if (isEnrolled) {
                  router.push(`/dashboard/courses/${id}`)
                } else {
                  router.push(`/enrollment/${id}`)
                }
              }}
              className={`w-full py-3 rounded-md font-semibold text-sm text-white transition ${buttonColor} hover:opacity-70 cursor-pointer`}
            >
              {isEnrolled ? 'Access Course' : (data.slug ? 'Enroll Now' : 'Coming Soon...')}
            </button>
          )}
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
      // Fetch enrolled courses if user is logged in
      setEnrolledIds([])
    }
  }, [courses.length])

  const maxBatchLength = useMemo(() => {
    let max = 1
    courses.forEach((course) => {
      const batchArray = Array.isArray(course.batch) ? course.batch : [course.batch]
      if (batchArray.length > max) max = batchArray.length
    })
    return max
  }, [courses])

  const headerHeight = `${220 + maxBatchLength * 20}px`

  return (
    <section className="w-full bg-white py-20 px-4 sm:px-6 lg:px-8" ref={landingPlanRef}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto text-center"
      >
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
          Choose Your Path to Success
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-gray-500 mb-10">
          Select the sat preparation course that best fits your needs and learning style. All options are designed to maximize your score improvement.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6"
      >
        {courses.map((course, i) => (
          <ProgramCard
            key={i}
            data={course}
            index={i}
            headerHeight={headerHeight}
            isEnrolled={enrolledIds.includes(course.id) || enrolledIds.includes(course.courseId) || enrolledIds.includes(course._id)}
          />
        ))}
      </motion.div>

      <p className="text-sm text-gray-700 mt-10 text-center">
        Score increase guarantee applies to students who complete all course
        requirements and practice tests.
        <br />
        Concept videos provide comprehensive review of core DSAT/PSAT topics.
      </p>
    </section>
  )
}
