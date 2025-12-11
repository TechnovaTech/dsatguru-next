'use client'
import { useEffect, useState } from 'react'
import { FiSearch, FiEye, FiArrowLeft, FiPlus } from 'react-icons/fi'

export default function QuestionBankManagement() {
  const [questionBanks, setQuestionBanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [currentView, setCurrentView] = useState('banks')
  const [selectedBank, setSelectedBank] = useState(null)

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/questions?question-banks=true')
        const json = await res.json()
        const data = json.data || []
        setQuestionBanks(data)
      } finally {
        setLoading(false)
      }
    }
    fetchBanks()
  }, [])

  const filteredBanks = questionBanks.filter(b => (b.title || '').toLowerCase().includes(search.toLowerCase()))

  if (currentView === 'questions' && selectedBank) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button className="inline-flex items-center text-blue-600 hover:text-blue-800" onClick={() => { setCurrentView('banks'); setSelectedBank(null) }}>
              <FiArrowLeft className="mr-2" />
              <span>Back to Question Banks</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedBank.title}</h1>
            <p className="text-gray-600">Manage questions for this question bank</p>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">Total Questions: {selectedBank.totalQuestions} · Active: {selectedBank.activeQuestions} · Draft: {selectedBank.draftQuestions}</div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <FiPlus size={16} />
              <span>Add New Question</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-gray-500">No questions found in this question bank.</p>
                <p className="text-sm text-gray-400 mt-2">Questions uploaded through SAT Question Upload will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Bank Management</h1>
          <div className="text-gray-600 text-sm">{loading ? 'Loading question banks...' : `${questionBanks.length} Question Banks`}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search question banks..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Question Banks ({filteredBanks.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Draft</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBanks.map(bank => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.totalQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.activeQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.draftQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{bank.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bank.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" onClick={() => { setSelectedBank(bank); setCurrentView('questions') }}>
                        <FiEye className="mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBanks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">{loading ? 'Loading...' : 'No question banks found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
