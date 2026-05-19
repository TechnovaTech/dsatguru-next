'use client'
import { useState } from 'react'
import { FiX, FiChevronLeft, FiChevronRight, FiEdit2, FiSave, FiCheckCircle } from 'react-icons/fi'
import { renderContent } from './LatexRenderer'

export default function QuestionPreviewModal({ questions, onClose, onQuestionsUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editedQuestions, setEditedQuestions] = useState(questions)
  const [editMode, setEditMode] = useState({})

  const currentQuestion = editedQuestions[currentIndex]

  const handleNext = () => {
    if (currentIndex < editedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setEditMode({})
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setEditMode({})
    }
  }

  const handleEdit = (field, value) => {
    const updated = [...editedQuestions]
    updated[currentIndex] = {
      ...updated[currentIndex],
      [field]: value
    }
    setEditedQuestions(updated)
  }

  const handleOptionEdit = (optionKey, value) => {
    const updated = [...editedQuestions]
    updated[currentIndex] = {
      ...updated[currentIndex],
      options: {
        ...updated[currentIndex].options,
        [optionKey]: value
      }
    }
    setEditedQuestions(updated)
  }

  const toggleEditMode = (field) => {
    setEditMode(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSaveAndClose = () => {
    onQuestionsUpdate(editedQuestions)
    onClose()
  }

  const ImagePreviews = ({ text }) => {
    if (!text) return null
    const urls = []
    const re = /!\[.*?\]\((.*?)\)/g
    let m
    while ((m = re.exec(text)) !== null) urls.push(m[1])
    if (!urls.length) return null
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url, i) => (
          <div key={i} className="relative group border rounded overflow-hidden bg-gray-50">
            <img src={url} alt={`img-${i}`} className="h-20 w-auto max-w-[160px] object-contain" onError={e => { e.target.style.border = '2px solid red' }} />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{url.split('/').pop()}</div>
          </div>
        ))}
      </div>
    )
  }

  // renderContent imported from LatexRenderer

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Question Preview</h3>
              <p className="text-sm text-gray-600 mt-1">
                Question {currentIndex + 1} of {editedQuestions.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Question Metadata */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Question ID</span>
              <p className="text-sm font-medium text-gray-900 mt-1 font-mono">
                {currentQuestion.questionId || currentQuestion._id?.toString().slice(-8) || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Difficulty</span>
              <p className={`text-sm font-bold mt-1 ${
                currentQuestion.difficulty === 'Easy' ? 'text-green-600' :
                currentQuestion.difficulty === 'Medium' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {currentQuestion.difficulty}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Topic</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {(() => {
                  // Try skill field first
                  if (currentQuestion.skill) return currentQuestion.skill
                  
                  // Try tags field
                  if (currentQuestion.tags) {
                    try {
                      const parsedTags = typeof currentQuestion.tags === 'string' 
                        ? JSON.parse(currentQuestion.tags) 
                        : currentQuestion.tags
                      if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                        return parsedTags.join(', ')
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                  
                  return 'N/A'
                })()}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Subject</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{currentQuestion.domain || currentQuestion.subject}</p>
            </div>
          </div>

          {/* Question Paragraph (if exists) */}
          {currentQuestion.questionParagraph && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-blue-700 uppercase">Context Paragraph</span>
                <button
                  onClick={() => toggleEditMode('questionParagraph')}
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                >
                  <FiEdit2 className="w-3 h-3" /> Edit
                </button>
              </div>
              {editMode.questionParagraph ? (
                <div><textarea
                  value={currentQuestion.questionParagraph}
                  onChange={(e) => handleEdit('questionParagraph', e.target.value)}
                  className="w-full p-3 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                /><ImagePreviews text={currentQuestion.questionParagraph} /></div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renderContent(currentQuestion.questionParagraph)}
                </div>
              )}
            </div>
          )}

          {/* Question Content */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-gray-700">Question</span>
              <button
                onClick={() => toggleEditMode('content')}
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
              >
                <FiEdit2 className="w-3 h-3" /> Edit
              </button>
            </div>
            {editMode.content ? (
              <div><textarea
                value={currentQuestion.content}
                onChange={(e) => handleEdit('content', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
              /><ImagePreviews text={currentQuestion.content} /></div>
            ) : (
              <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm whitespace-pre-wrap">
                {renderContent(currentQuestion.content)}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options?.A || currentQuestion.options?.B || currentQuestion.options?.C || currentQuestion.options?.D ? (
              // MULTIPLE CHOICE - Show all options
              <>
                <span className="text-sm font-semibold text-gray-700">Answer Options</span>
                {['A', 'B', 'C', 'D'].map((optionKey) => {
                  const isCorrect = currentQuestion.correctAnswer === optionKey
                  const optionText = currentQuestion.options[optionKey] || ''
                  if (!optionText) return null
                  
                  return (
                    <div key={optionKey} className={`p-3 border-2 rounded-lg ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>
                            {optionKey}.
                          </span>
                          {isCorrect && (
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                              Correct Answer
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleEditMode(`option${optionKey}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        >
                          <FiEdit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      {editMode[`option${optionKey}`] ? (
                        <div><textarea
                          value={currentQuestion.options[optionKey] || ''}
                          onChange={(e) => handleOptionEdit(optionKey, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          rows="2"
                        /><ImagePreviews text={currentQuestion.options[optionKey]} /></div>
                      ) : (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {renderContent(currentQuestion.options[optionKey] || '')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              // FILL-IN-THE-BLANK - Show correct answer only
              <>
                <span className="text-sm font-semibold text-gray-700">Correct Answer (Fill-in-the-Blank)</span>
                <div className="p-4 border-2 rounded-lg border-green-500 bg-green-50">
                  <div className="flex items-center gap-3 mb-2">
                    <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      Students will type their answer
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {currentQuestion.correctAnswer}
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    This is a fill-in-the-blank question. Students will see a text input field instead of multiple choice options.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Explanations */}
          {(currentQuestion.shortExplanation || currentQuestion.longExplanation || currentQuestion.explanation) && (
            <div className="space-y-4">
              {currentQuestion.shortExplanation && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-yellow-700 uppercase">Short Explanation</span>
                    <button
                      onClick={() => toggleEditMode('shortExplanation')}
                      className="text-yellow-600 hover:text-yellow-800 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.shortExplanation ? (
                    <div><textarea
                      value={currentQuestion.shortExplanation}
                      onChange={(e) => handleEdit('shortExplanation', e.target.value)}
                      className="w-full p-3 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none min-h-[80px]"
                    /><ImagePreviews text={currentQuestion.shortExplanation} /></div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.shortExplanation)}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.longExplanation && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Long Explanation</span>
                    <button
                      onClick={() => toggleEditMode('longExplanation')}
                      className="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.longExplanation ? (
                    <div><textarea
                      value={currentQuestion.longExplanation}
                      onChange={(e) => handleEdit('longExplanation', e.target.value)}
                      className="w-full p-3 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[120px]"
                    /><ImagePreviews text={currentQuestion.longExplanation} /></div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.longExplanation)}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.explanation && !currentQuestion.shortExplanation && !currentQuestion.longExplanation && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-gray-700 uppercase">Explanation</span>
                    <button
                      onClick={() => toggleEditMode('explanation')}
                      className="text-gray-600 hover:text-gray-800 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.explanation ? (
                    <div><textarea
                      value={currentQuestion.explanation}
                      onChange={(e) => handleEdit('explanation', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none min-h-[100px]"
                    /><ImagePreviews text={currentQuestion.explanation} /></div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.explanation)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiChevronLeft /> Previous
          </button>

          <div className="text-sm text-gray-600 font-medium">
            {currentIndex + 1} / {editedQuestions.length}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleNext}
              disabled={currentIndex === editedQuestions.length - 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <FiChevronRight />
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FiSave /> Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
