'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function CoursesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState([])
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const coursesRes = await axios.get('/api/courses')
      const enrollmentsRes = await axios.get('/api/enrollment', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const enrollments = enrollmentsRes.data.enrollments || enrollmentsRes.data.data || []
      
      const allCourses = coursesRes.data.courses || coursesRes.data.data || []
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
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (course) => {
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
        alert('Payment setup failed')
      }
    } else {
      enrollFree(course)
    }
  }

  const enrollFree = async (course) => {
    try {
      const token = localStorage.getItem('token')
      const decoded = JSON.parse(atob(token.split('.')[1]))
      
      const enrollments = JSON.parse(localStorage.getItem(`enrollments_${decoded.userId}`) || '[]')
      const newEnrollment = {
        _id: Date.now().toString(),
        courseId: course.id,
        userId: decoded.userId,
        enrolledAt: new Date().toISOString()
      }
      enrollments.push(newEnrollment)
      localStorage.setItem(`enrollments_${decoded.userId}`, JSON.stringify(enrollments))
      
      await axios.post('/api/enroll', { courseId: course.id }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      alert('Enrolled successfully!')
      fetchData()
    } catch (error) {
      alert('Enrollment failed')
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      const courseId = urlParams.get('courseId')
      if (courseId) {
        enrollAfterPayment(courseId)
      }
    }
  }, [])

  const enrollAfterPayment = async (courseId) => {
    try {
      const token = localStorage.getItem('token')
      const decoded = JSON.parse(atob(token.split('.')[1]))
      
      const enrollments = JSON.parse(localStorage.getItem(`enrollments_${decoded.userId}`) || '[]')
      const newEnrollment = {
        _id: Date.now().toString(),
        courseId,
        userId: decoded.userId,
        enrolledAt: new Date().toISOString()
      }
      enrollments.push(newEnrollment)
      localStorage.setItem(`enrollments_${decoded.userId}`, JSON.stringify(enrollments))
      
      await axios.post('/api/enroll', { courseId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      alert('Payment successful! You are now enrolled.')
      fetchData()
      window.history.replaceState({}, '', '/dashboard/courses')
    } catch (error) {
      alert('Enrollment failed after payment')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
        <p className="text-gray-600">Manage your enrolled courses and explore new ones</p>
      </div>

      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Enrolled Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                <p className="text-gray-600 mb-2">{course.description}</p>
              <p className="text-sm text-gray-500 mb-4">Enrolled on {new Date(course.enrolledAt).toLocaleDateString()}</p>
              <div className="flex space-x-2">
                  <button onClick={() => router.push(`/dashboard/courses/${course.id}`)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Continue Learning
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  ${course.discountedPrice || course.price}
                </span>
                {course.discountedPrice && (
                  <span className="text-gray-500 line-through">${course.price}</span>
                )}
              </div>
              <button 
                onClick={() => handleEnroll(course)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Enroll Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
