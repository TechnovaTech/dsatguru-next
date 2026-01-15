'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiTrash2, FiX } from 'react-icons/fi'

export default function MarkedQuestionsPage() {
  const router = useRouter()
  const [markedQuestions, setMarkedQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchMarkedQuestions()
  }, [])

  const fetchMarkedQuestions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/marked-questions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Marked questions data:', data)
        if (data.length > 0) {
          console.log('First question:', data[0])
          console.log('Question ID object:', data[0].questionId)
        }
        setMarkedQuestions(data)
      }
    } catch (error) {
      console.error('Error fetching marked questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const unmarkQuestion = async (questionId) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/marked-questions?questionId=${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setMarkedQuestions(prev => prev.filter(q => q.questionId._id !== questionId))
      setShowModal(false)
    } catch (error) {
      console.error('Error unmarking question:', error)
    }
  }

  const openModal = (question) => {
    console.log('Opening modal with question:', question)
    console.log('Question ID data:', question.questionId)
    console.log('Correct Answer:', question.questionId?.correctAnswer)
    console.log('Options:', {
      A: question.questionId?.optionA,
      B: question.questionId?.optionB,
      C: question.questionId?.optionC,
      D: question.questionId?.optionD
    })
    setSelectedQuestion(question)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const rwQuestions = markedQuestions.filter(q => {
    const subject = q.questionId?.subject || q.subject
    return subject === 'Reading and Writing' || subject === 'Reading & Writing'
  })
  const mathQuestions = markedQuestions.filter(q => {
    const subject = q.questionId?.subject || q.subject
    return subject === 'Math'
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft /> Back to Tests
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🔖 Marked Questions</h1>
          <div className="w-32"></div>
        </div>

        {markedQuestions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No marked questions yet</p>
            <button
              onClick={() => router.push('/dashboard/tests')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Tests
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Reading & Writing Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">📖 Reading & Writing</h2>
              <p className="text-gray-600 mb-4">{rwQuestions.length} questions marked</p>
              
              {rwQuestions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No R&W questions marked</p>
              ) : (
                <div className="space-y-3">
                  {rwQuestions.map((item, idx) => {
                    const q = item.questionId
                    if (!q) return null
                    return (
                      <div key={item._id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold">
                                Q{idx + 1}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                item.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                item.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.difficulty}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(item.testDate).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {q?.question || q?.content}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => openModal(item)}
                          className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Math Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-green-600 mb-4">🔢 Math</h2>
              <p className="text-gray-600 mb-4">{mathQuestions.length} questions marked</p>
              
              {mathQuestions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No Math questions marked</p>
              ) : (
                <div className="space-y-3">
                  {mathQuestions.map((item, idx) => {
                    const q = item.questionId
                    if (!q) return null
                    return (
                      <div key={item._id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">
                                Q{idx + 1}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                item.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                item.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.difficulty}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(item.testDate).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {q?.question || q?.content}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => openModal(item)}
                          className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Question Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Question Info */}
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded">
                  {selectedQuestion.subject}
                </span>
                <span className={`text-sm px-3 py-1 rounded ${
                  selectedQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  selectedQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedQuestion.difficulty}
                </span>
                <span className="text-sm text-gray-500">
                  Marked on {new Date(selectedQuestion.testDate).toLocaleDateString()}
                </span>
              </div>

              {/* Passage */}
              {selectedQuestion.questionId?.questionParagraph && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                    {selectedQuestion.questionId.questionParagraph}
                  </p>
                </div>
              )}

              {/* Question */}
              <div className="mb-4">
                <p className="text-lg font-medium text-gray-900">
                  {selectedQuestion.questionId?.question || selectedQuestion.questionId?.content}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const q = selectedQuestion.questionId
                  if (!q) return null
                  const isCorrect = q.correctAnswer === option
                  
                  // Get option text - check both direct fields and options JSON
                  let optionText = q[`option${option}`]
                  if (!optionText && q.options) {
                    try {
                      const optionsArray = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                      const optionIndex = option.charCodeAt(0) - 65 // A=0, B=1, C=2, D=3
                      optionText = optionsArray[optionIndex]
                    } catch (e) {
                      console.error('Error parsing options:', e)
                    }
                  }
                  
                  if (!optionText) return null
                  return (
                    <div
                      key={option}
                      className={`border-2 rounded-lg p-4 ${
                        isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                          isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-gray-400 text-gray-700'
                        }`}>
                          {option}
                        </div>
                        <div className="flex-1 pt-1">
                          <span className="text-gray-900">{optionText}</span>
                          {isCorrect && (
                            <span className="ml-2 text-green-600 text-sm font-semibold">✓ Correct Answer</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation */}
              <div className="border-2 rounded-lg p-4 bg-blue-50 border-blue-300 mb-4">
                <p className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
                  <span className="text-xl">💡</span>
                  Explanation
                </p>
                {selectedQuestion.questionId?.shortExplanation && (
                  <div className="mb-3">
                    <p className="font-medium text-sm mb-1 text-blue-800">Quick Explanation:</p>
                    <p className="text-blue-800">{selectedQuestion.questionId.shortExplanation}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm mb-1 text-blue-800">Detailed Explanation:</p>
                  <p className="text-blue-800">
                    {selectedQuestion.questionId?.longExplanation || selectedQuestion.questionId?.explanation || 'No detailed explanation available'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => unmarkQuestion(selectedQuestion.questionId._id)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
                >
                  <FiTrash2 /> Unmark Question
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
