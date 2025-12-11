'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function QuestionBanksPage() {
  const [questionBanks, setQuestionBanks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestionBanks()
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
        {questionBanks.map((bank) => (
          <div key={bank.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{bank.title}</h3>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {bank.subject}
              </span>
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
            <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Start Practice
            </button>
          </div>
        ))}
      </div>

      {questionBanks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No question banks available yet.</p>
        </div>
      )}
    </div>
  )
}