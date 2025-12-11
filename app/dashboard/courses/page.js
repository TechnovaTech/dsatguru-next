'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import axios from 'axios'

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/enrollment')
      ])
      setCourses(coursesRes.data.courses || [])
      setEnrolledCourses(enrollmentsRes.data.enrollments || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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
            {enrolledCourses.map((enrollment) => (
              <div key={enrollment._id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Course</h3>
                <p className="text-gray-600 mb-4">Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                <div className="flex space-x-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
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
              <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Enroll Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}