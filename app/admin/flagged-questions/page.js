'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiTrash2, FiEye, FiX, FiFlag } from 'react-icons/fi'
import { useConfirm } from '../../components/ui/UIProvider'
// Maps an answer (letter, "B) 240"-style key, or option text — any casing) to its option letter.
import { resolveAnswerLetter } from '../../../lib/scoring/satScale'

export default function FlaggedQuestionsPage() {
  const confirm = useConfirm()
  const router = useRouter()
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFlag, setSelectedFlag] = useState(null)

  useEffect(() => {
    fetchFlagged()
  }, [])

  const fetchFlagged = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/flagged-questions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFlagged(data)
      } else {
        throw new Error('Failed to load flagged questions')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load flagged questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteFlag = async (id) => {
    if (!(await confirm({ message: 'Delete this inquiry?', tone: 'danger', confirmText: 'Delete' }))) return
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

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedFlag) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedFlag(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedFlag])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiFlag size={18} /></span>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Flagged Questions</h1>
          <p className="mt-1 text-sm text-slate-500">Student-reported question inquiries.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={fetchFlagged}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flagged.map((item) => (
                <tr key={item._id} className="text-sm transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.userId?.name || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{item.testName || item.testId?.title || '—'}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const subject = item.subject || item.questionId?.subject
                      const difficulty = item.difficulty || item.questionId?.difficulty
                      if (!subject && !difficulty) return <span className="text-slate-400">—</span>
                      return (
                        <>
                          {subject && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{subject}</span>}
                          {difficulty && <span className="ml-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{difficulty}</span>}
                        </>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedFlag(item)} aria-label="View question details" className="text-indigo-600 transition-colors hover:text-indigo-800">
                        <FiEye />
                      </button>
                      <button onClick={() => deleteFlag(item._id)} aria-label="Delete inquiry" className="text-red-600 transition-colors hover:text-red-800">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {flagged.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
              <FiFlag size={26} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">No flagged questions</h3>
            <p className="mt-1 text-sm text-slate-400">Student-reported question inquiries will appear here.</p>
          </div>
        )}
      </div>

      {selectedFlag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedFlag(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Question Details</h2>
              <button onClick={() => setSelectedFlag(null)} aria-label="Close dialog" className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <FiX size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Student: {selectedFlag.userId?.name} ({selectedFlag.userId?.email})</p>
                <p className="text-sm text-slate-500">Test: {selectedFlag.testName || selectedFlag.testId?.title || '—'}</p>
                <p className="text-sm text-slate-500">Date: {selectedFlag.createdAt ? new Date(selectedFlag.createdAt).toLocaleString() : '—'}</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 font-semibold text-slate-900">Student Note:</h3>
                <p className="rounded-lg bg-amber-50 p-3 text-slate-700">{selectedFlag.studentNote}</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 font-semibold text-slate-900">Question:</h3>
                <p className="mb-4 text-slate-700">{selectedFlag.questionId?.question || selectedFlag.questionId?.content}</p>

                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isCorrect = resolveAnswerLetter(selectedFlag.questionId?.correctAnswer, selectedFlag.questionId) === opt
                    return (
                      <div key={opt} className={`rounded-lg p-3 ${isCorrect ? 'border-2 border-emerald-500 bg-emerald-50' : 'bg-slate-50'}`}>
                        <span className="font-semibold text-slate-900">{opt}.</span> <span className="text-slate-700">{selectedFlag.questionId?.[`option${opt}`]}</span>
                        {isCorrect && <span className="ml-2 font-semibold text-emerald-600">✓ Correct</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedFlag.questionId?.shortExplanation && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="mb-2 font-semibold text-slate-900">Explanation:</h3>
                  <p className="rounded-lg bg-indigo-50 p-3 text-slate-700">{selectedFlag.questionId.shortExplanation}</p>
                </div>
              )}

              <button
                onClick={() => deleteFlag(selectedFlag._id)}
                className="w-full rounded-lg bg-red-600 py-2 font-medium text-white transition-colors hover:bg-red-700"
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
