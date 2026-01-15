'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiTrash2, FiEye, FiX } from 'react-icons/fi'

export default function FlaggedQuestionsPage() {
  const router = useRouter()
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFlag, setSelectedFlag] = useState(null)

  useEffect(() => {
    fetchFlagged()
  }, [])

  const fetchFlagged = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/flagged-questions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFlagged(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteFlag = async (id) => {
    if (!confirm('Delete this inquiry?')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/flagged-questions?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchFlagged()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🚩 Flagged Questions</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {flagged.map((item) => (
              <tr key={item._id}>
                <td className="px-6 py-4">{item.userId?.name}</td>
                <td className="px-6 py-4">{item.testName}</td>
                <td className="px-6 py-4">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{item.subject}</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-1">{item.difficulty}</span>
                </td>
                <td className="px-6 py-4 text-sm">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedFlag(item)} className="text-blue-600 hover:text-blue-800">
                      <FiEye />
                    </button>
                    <button onClick={() => deleteFlag(item._id)} className="text-red-600 hover:text-red-800">
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Question Details</h2>
              <button onClick={() => setSelectedFlag(null)}><FiX size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Student: {selectedFlag.userId?.name} ({selectedFlag.userId?.email})</p>
                <p className="text-sm text-gray-600">Test: {selectedFlag.testName}</p>
                <p className="text-sm text-gray-600">Date: {new Date(selectedFlag.createdAt).toLocaleString()}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Student Note:</h3>
                <p className="bg-yellow-50 p-3 rounded">{selectedFlag.studentNote}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Question:</h3>
                <p className="mb-4">{selectedFlag.questionId?.question || selectedFlag.questionId?.content}</p>
                
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isCorrect = selectedFlag.questionId?.correctAnswer === opt
                    return (
                      <div key={opt} className={`p-3 rounded ${isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
                        <span className="font-semibold">{opt}.</span> {selectedFlag.questionId?.[`option${opt}`]}
                        {isCorrect && <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedFlag.questionId?.shortExplanation && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Explanation:</h3>
                  <p className="bg-blue-50 p-3 rounded">{selectedFlag.questionId.shortExplanation}</p>
                </div>
              )}

              <button
                onClick={() => deleteFlag(selectedFlag._id)}
                className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
              >
                Delete Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
