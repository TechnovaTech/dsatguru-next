'use client'
import { useState, useEffect } from 'react'
import { FiX, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi'

export default function ReassignTestModal({ session, questions, onClose, onReassign }) {
  const [selectedOption, setSelectedOption] = useState('wrong') // 'all' or 'wrong'
  const [reassigning, setReassigning] = useState(false)

  const correctCount = questions.filter(q => q.isCorrect).length
  const incorrectCount = questions.filter(q => !q.isCorrect && q.userAnswer).length
  const totalQuestions = questions.length

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleReassign = async () => {
    setReassigning(true)
    try {
      await onReassign(selectedOption)
    } finally {
      setReassigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FiRefreshCw className="text-indigo-600" />
                Reassign Test
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Create a new test assignment for the student
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-white rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
              <div className="text-xs text-slate-500 mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
              <div className="text-xs text-emerald-700 mt-1">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
              <div className="text-xs text-red-700 mt-1">Incorrect</div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Questions to Reassign
            </label>

            <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selectedOption === 'all'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="reassignOption"
                value="all"
                checked={selectedOption === 'all'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="mt-1 w-4 h-4 text-indigo-600"
              />
              <div className="ml-3">
                <div className="font-semibold text-slate-900">All Questions</div>
                <div className="text-sm text-slate-500 mt-1">
                  Reassign all {totalQuestions} questions from this test
                </div>
              </div>
            </label>

            <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selectedOption === 'wrong'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="reassignOption"
                value="wrong"
                checked={selectedOption === 'wrong'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="mt-1 w-4 h-4 text-indigo-600"
              />
              <div className="ml-3">
                <div className="font-semibold text-slate-900">Only Wrong Questions</div>
                <div className="text-sm text-slate-500 mt-1">
                  Reassign only the {incorrectCount} incorrect questions
                </div>
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> The student will receive a new test assignment. The current test will be marked as "Reassigned" and locked.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={reassigning}
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reassigning ? (
              <>
                <FiRefreshCw className="animate-spin" />
                Reassigning...
              </>
            ) : (
              <>
                <FiRefreshCw />
                Reassign Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
