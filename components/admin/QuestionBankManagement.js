'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function QuestionBankManagement() {
  const [questions, setQuestions] = useState([])
  const [newQuestion, setNewQuestion] = useState({
    content: '',
    subject: 'Math',
    difficulty: 'Medium',
    type: 'MultipleChoice',
    correctAnswer: 'A',
    options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D'])
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/questions')
      setQuestions(response.data.questions || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuestion = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/questions', newQuestion)
      setNewQuestion({
        content: '',
        subject: 'Math',
        difficulty: 'Medium',
        type: 'MultipleChoice',
        correctAnswer: 'A',
        options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D'])
      })
      fetchQuestions()
      alert('Question created successfully')
    } catch (error) {
      alert('Failed to create question')
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank Management</h1>
        <p className="mt-2 text-sm text-gray-600">Create and manage SAT/PSAT questions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Question Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Question</h2>
          <form onSubmit={handleCreateQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Question Content</label>
              <textarea
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  value={newQuestion.subject}
                  onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                >
                  <option value="Math">Math</option>
                  <option value="English">English</option>
                  <option value="Reading">Reading</option>
                  <option value="Writing">Writing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                <select
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
              <select
                value={newQuestion.correctAnswer}
                onChange={(e) => setNewQuestion({...newQuestion, correctAnswer: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Question
            </button>
          </form>
        </div>

        {/* Questions List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">All Questions ({questions.length})</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {questions.map((question) => (
              <div key={question._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-900">{question.content}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {question.subject}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {question.difficulty}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Answer: {question.correctAnswer}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}