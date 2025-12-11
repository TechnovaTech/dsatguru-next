'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import {
  FaBookOpen,
  FaChalkboardTeacher,
  FaChartLine,
  FaGraduationCap,
  FaRocket,
} from 'react-icons/fa'
import { MdPerson } from 'react-icons/md'

const CourseContext = createContext()

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  
  const buildIndividualTutoring = () => ({
    icon: MdPerson,
    title: 'INDIVIDUAL TUTORING',
    subtitle: 'Personalized Support',
    batch: ['CALL US\n1-919-578-7724'],
    included: [
      'Personalized learning plan',
      'One-on-one sessions',
      'Targeted practice',
      'Flexible scheduling',
      'Continuous feedback',
      'Test strategies',
      'Confidence building',
      'DSAT/PSAT, AP Math, AP Science, AP English',
      'All other Math, Science and English'
    ],
    slug: 'individual-tutoring',
  })

  const refreshCourses = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/courses')
      
      const icons = [
        FaBookOpen,
        FaGraduationCap,
        FaChartLine,
        FaRocket,
        FaChalkboardTeacher,
      ]

      const apiCourses = Array.isArray(res.data)
        ? res.data
        : (res.data?.courses || res.data?.data || [])

      const formatted = apiCourses.map((course, index) => ({
        id: course._id || course.id,
        courseId: course._id || course.id,
        slug: course.title?.toLowerCase().replace(/\s+/g, '-') || 'course',
        title: course.title,
        subtitle: course.description?.substring(0, 50) + '...' || 'Course Description',
        description: course.description,
        type: course.type,
        bannerImageUrl: course.bannerImageUrl,
        batch: course.schedules?.map((s) => `${s.day} ${s.time}`) || ['Schedule TBD'],
        originalPrice: course.price,
        discountedPrice: course.discountedPrice !== null ? course.discountedPrice : course.price,
        discountPercentage: course.discountPercentage,
        priceNote: '',
        included: course.highlights?.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)).map(h => h.text) || [],
        courseHighlights: course.highlights?.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)).map(h => ({
          id: h.id,
          text: h.text,
          type: 'included',
          sequenceOrder: h.sequenceOrder
        })) || [],
        courseSchedules: course.schedules?.map(s => ({
          id: s.id,
          day: s.day,
          time: s.time,
          batchTag: `${s.day} ${s.time}`,
          labels: [`${s.day} ${s.time}`]
        })) || [],
        enrollmentNote: '',
        icon: icons[index % icons.length],
      }))

      setCourses([
        ...formatted,
        buildIndividualTutoring(),
      ])
    } catch (err) {
      console.error(err)
      setCourses([buildIndividualTutoring()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!courses.length) {
      refreshCourses()
    }
  }, [courses.length])

  return (
    <CourseContext.Provider value={{ courses, loading, refreshCourses }}>
      {children}
    </CourseContext.Provider>
  )
}

export const useCourses = () => useContext(CourseContext)
