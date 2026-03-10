'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiClock, FiX, FiArrowLeft, FiCheckCircle, FiXCircle } from 'react-icons/fi'

export default function TutorResults() {
  const { user } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Math')
  
  // View result modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingResult, setViewingResult] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    if (user && user.role !== 'Tutor') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setError('Failed to load results')
      }
    } catch (err) {
      setError('Failed to load results')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewResult = (result) => {
    setViewingResult(result)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < viewingResult.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const renderWithImages = (text) => {
    if (!text) return null
    const stringText = String(text)
    const regex = /(!\[.*?\]\(.*?\))/g
    const parts = stringText.split(regex)
    
    return parts.map((part, index) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/)
      if (match) {
        return <img key={index} src={match[2]} alt={match[1]} className="max-w-full h-auto my-2 rounded border" />
      }
      return <span key={index}>{part}</span>
    })
  }

  const filteredResults = results.filter(result => {
    if (result.test?.subject !== activeTab) return false
    if (searchTerm && !result.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !result.test?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Results</h1>
          <p className="text-gray-600">View student test results</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Subject Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('Math')}
                className={`${
                  activeTab === 'Math'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Math Results
              </button>
              <button
                onClick={() => setActiveTab('Reading and Writing')}
                className={`${
                  activeTab === 'Reading and Writing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Reading & Writing Results
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or test title..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab} Results ({filteredResults.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading results...</td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No results found</td>
                  </tr>
                ) : (
                  filteredResults.map((result) => (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {result.student?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{result.test?.title || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-semibold text-blue-600">
                          {result.score || 0} / {result.totalQuestions || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewResult(result)}
                          className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                        >
                          <FiEye className="mr-1" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Result Modal */}
        {showViewModal && viewingResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingResult.test?.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Student: {viewingResult.student?.name} | Score: {viewingResult.score}/{viewingResult.totalQuestions}
                  </p>
                  <p className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {viewingResult.questions?.length || 0}
                  </p>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {viewingResult.questions && viewingResult.questions.length > 0 ? (
                  (() => {
                    const q = viewingResult.questions[currentQuestionIndex]
                    if (!q) return null
                    
                    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                    const isCorrect = q.userAnswer === q.correctAnswer
                    
                    return (
                      <div className="max-w-4xl mx-auto">
                        <div className="border rounded-lg p-6 bg-gray-50">
                          <div className="flex items-center gap-3 flex-wrap mb-4">
                            <span className="text-lg font-bold text-gray-900">Question {currentQuestionIndex + 1}</span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {q.subject}
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                              q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {q.difficulty}
                            </span>
                            {isCorrect ? (
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                <FiCheckCircle /> Correct
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                <FiXCircle /> Incorrect
                              </span>
                            )}
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                            <div className="text-gray-900 bg-white p-3 rounded-lg border">
                              {renderWithImages(q.content || q.question)}
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((letter, i) => (
                                <div key={letter} className={`p-3 border rounded-lg ${
                                  q.correctAnswer === letter ? 'bg-green-50 border-green-500' :
                                  q.userAnswer === letter ? 'bg-red-50 border-red-500' :
                                  'bg-white border-gray-200'
                                }`}>
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium">{letter}.</span>
                                    <div className="flex-1">{renderWithImages(options[i] || '')}</div>
                                    {q.correctAnswer === letter && <FiCheckCircle className="text-green-600" />}
                                    {q.userAnswer === letter && q.userAnswer !== q.correctAnswer && <FiXCircle className="text-red-600" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4 grid grid-cols-2 gap-4">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <span className="text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</span>
                            </div>
                            <div className={`p-3 border rounded-lg ${
                              isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}>
                              <span className={`text-sm font-medium ${
                                isCorrect ? 'text-green-800' : 'text-red-800'
                              }`}>
                                Student Answer: {q.userAnswer || 'Not answered'}
                              </span>
                            </div>
                          </div>

                          {q.shortExplanation && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Short Explanation</label>
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {renderWithImages(q.shortExplanation)}
                                </div>
                              </div>
                            </div>
                          )}

                          {q.longExplanation && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Long Explanation</label>
                              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {renderWithImages(q.longExplanation)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">No questions found</div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <FiArrowLeft /> Previous
                </button>
                
                <div className="text-sm text-gray-600">
                  {currentQuestionIndex + 1} / {viewingResult.questions?.length || 0}
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === (viewingResult.questions?.length || 0) - 1}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
