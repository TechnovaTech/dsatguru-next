'use client'
import { useState } from 'react'
import { FiX, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi'

export default function ReassignTestModal({ session, questions, onClose, onReassign }) {
  const [selectedOption, setSelectedOption] = useState('wrong') // 'all' or 'wrong'
  const [reassigning, setReassigning] = useState(false)

  const correctCount = questions.filter(q => q.isCorrect).length
  const incorrectCount = questions.filter(q => !q.isCorrect && q.userAnswer).length
  const totalQuestions = questions.length

  const handleReassign = async () => {
    setReassigning(true)
    try {
      await onReassign(selectedOption)
    } finally {
      setReassigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiRefreshCw className="text-purple-600" />
                Reassign Test
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a new test assignment for the student
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-green-700 mt-1">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
              <div className="text-xs text-red-700 mt-1">Incorrect</div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Questions to Reassign
            </label>
            
            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'all' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="reassignOption"
                value="all"
                checked={selectedOption === 'all'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="mt-1 w-4 h-4 text-purple-600"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-900">All Questions</div>
                <div className="text-sm text-gray-600 mt-1">
                  Reassign all {totalQuestions} questions from this test
                </div>
              </div>
            </label>

            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'wrong' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="reassignOption"
                value="wrong"
                checked={selectedOption === 'wrong'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="mt-1 w-4 h-4 text-purple-600"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-900">Only Wrong Questions</div>
                <div className="text-sm text-gray-600 mt-1">
                  Reassign only the {incorrectCount} incorrect questions
                </div>
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The student will receive a new test assignment. The current test will be marked as "Reassigned" and locked.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={reassigning}
            className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
