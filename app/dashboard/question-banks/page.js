'use client'
import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'

export default function QuestionBanksPage() {
  const [questionBanks, setQuestionBanks] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchQuestionBanks()
    fetchEnrollments()
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      const courseId = urlParams.get('courseId')
      if (courseId) {
        enrollAfterPayment(courseId)
      }
    }
  }, [])

  const fetchQuestionBanks = async () => {
    try {
      const response = await axios.get('/api/questions?question-banks=true')
      setQuestionBanks(response.data.data || [])
    } catch (error) {
      console.error('Error fetching question banks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const res = await axios.get('/api/enrollment')
      const list = res.data?.data || res.data?.enrollments || []
      setEnrollments(list)
    } catch (error) {
      setEnrollments([])
    }
  }

  const enrolledIds = useMemo(() => {
    const enrollmentMap = new Map()
    enrollments.forEach(e => {
      const id = (e.courseId?._id || e.courseId || e.id)?.toString()
      if (id) {
        enrollmentMap.set(id, {
          hasAccess: true,
          accessType: e.accessType || 'stripe',
          type: e.type || 'course'
        })
      }
    })
    return enrollmentMap
  }, [enrollments])

  const handlePurchase = (bankId) => {
    if (!user) {
      router.push(`/login?returnTo=/enrollment/${bankId}`)
      return
    }
    router.push(`/enrollment/${bankId}`)
  }

  const enrollAfterPayment = async (courseId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/enroll', { courseId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchEnrollments()
      window.history.replaceState({}, '', '/dashboard/question-banks')
    } catch (error) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Banks</h1>
        <p className="text-gray-600">Practice with our comprehensive question collections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionBanks.map((bank) => {
          const enrollment = enrolledIds.get(String(bank.id))
          const isEnrolled = enrollment?.hasAccess || false
          const accessType = enrollment?.accessType
          
          return (
            <div key={bank.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{bank.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {bank.subject}
                  </span>
                  {isEnrolled && (
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      accessType === 'admin' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {accessType === 'admin' ? 'Admin Access' : 'Paid Access'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">{bank.description}</p>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{bank.totalQuestions}</span> Questions
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{bank.activeQuestions}</span> Active
                </div>
              </div>
              {isEnrolled ? (
                <button
                  onClick={() => router.push(`/dashboard/practice/create?bankId=${bank.id}`)}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Start Practice
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(bank.id)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Purchase Access
                </button>
              )}
            </div>
          )
        })}
      </div>

      {questionBanks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No question banks available yet.</p>
        </div>
      )}
    </div>
  )
}
