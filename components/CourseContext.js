'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const CourseContext = createContext()

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CourseContext.Provider value={{ courses, setCourses, loading, fetchCourses }}>
      {children}
    </CourseContext.Provider>
  )
}

export const useCourses = () => {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error('useCourses must be used within CourseProvider')
  }
  return context
}