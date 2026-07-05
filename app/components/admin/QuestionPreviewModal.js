'use client'
import { useState, useEffect } from 'react'
import { FiX, FiChevronLeft, FiChevronRight, FiEdit2, FiSave, FiCheckCircle } from 'react-icons/fi'
import { renderContent } from './LatexRenderer'
// Maps an answer (letter, "B) 240"-style key, or option text — any casing) to its option letter.
import { resolveAnswerLetter } from '../../../lib/scoring/satScale'

export default function QuestionPreviewModal({ questions, onClose, onQuestionsUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editedQuestions, setEditedQuestions] = useState(questions)
  const [editMode, setEditMode] = useState({})

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          <div key={i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <img src={url} alt={`img-${i}`} className="h-20 w-auto max-w-[160px] object-contain" onError={e => { e.target.style.border = '2px solid red' }} />
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{url.split('/').pop()}</div>
          </div>
        ))}
      </div>
    )
  }

  // renderContent imported from LatexRenderer

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Question Preview</h3>
              <p className="text-sm text-slate-500 mt-1">
                Question {currentIndex + 1} of {editedQuestions.length}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-white rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Question Metadata */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Question ID</span>
              <p className="text-sm font-medium text-slate-900 mt-1 font-mono">
                {currentQuestion.questionId || currentQuestion._id?.toString().slice(-8) || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Difficulty</span>
              <p className={`text-sm font-bold mt-1 ${
                currentQuestion.difficulty === 'Easy' ? 'text-emerald-600' :
                currentQuestion.difficulty === 'Medium' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {currentQuestion.difficulty}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Topic</span>
              <p className="text-sm font-medium text-slate-900 mt-1">
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
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</span>
              <p className="text-sm font-medium text-slate-900 mt-1">{currentQuestion.domain || currentQuestion.subject}</p>
            </div>
          </div>

          {/* Question Paragraph (if exists) */}
          {currentQuestion.questionParagraph && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Context Paragraph</span>
                <button
                  onClick={() => toggleEditMode('questionParagraph')}
                  className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
                >
                  <FiEdit2 className="w-3 h-3" /> Edit
                </button>
              </div>
              {editMode.questionParagraph ? (
                <div><textarea
                  value={currentQuestion.questionParagraph}
                  onChange={(e) => handleEdit('questionParagraph', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
                /><ImagePreviews text={currentQuestion.questionParagraph} /></div>
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {renderContent(currentQuestion.questionParagraph)}
                </div>
              )}
            </div>
          )}

          {/* Question Content */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-slate-700">Question</span>
              <button
                onClick={() => toggleEditMode('content')}
                className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
              >
                <FiEdit2 className="w-3 h-3" /> Edit
              </button>
            </div>
            {editMode.content ? (
              <div><textarea
                value={currentQuestion.content}
                onChange={(e) => handleEdit('content', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
              /><ImagePreviews text={currentQuestion.content} /></div>
            ) : (
              <div className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-900 text-sm whitespace-pre-wrap">
                {renderContent(currentQuestion.content)}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options?.A || currentQuestion.options?.B || currentQuestion.options?.C || currentQuestion.options?.D ? (
              // MULTIPLE CHOICE - Show all options
              <>
                <span className="text-sm font-semibold text-slate-700">Answer Options</span>
                {['A', 'B', 'C', 'D'].map((optionKey) => {
                  const isCorrect = resolveAnswerLetter(currentQuestion.correctAnswer, currentQuestion.options) === optionKey
                  const optionText = currentQuestion.options[optionKey] || ''
                  if (!optionText) return null

                  return (
                    <div key={optionKey} className={`p-3 border-2 rounded-xl ${
                      isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {optionKey}.
                          </span>
                          {isCorrect && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Correct Answer
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleEditMode(`option${optionKey}`)}
                          className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
                        >
                          <FiEdit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      {editMode[`option${optionKey}`] ? (
                        <div><textarea
                          value={currentQuestion.options[optionKey] || ''}
                          onChange={(e) => handleOptionEdit(optionKey, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          rows="2"
                        /><ImagePreviews text={currentQuestion.options[optionKey]} /></div>
                      ) : (
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">
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
                <span className="text-sm font-semibold text-slate-700">Correct Answer (Fill-in-the-Blank)</span>
                <div className="p-4 border-2 rounded-xl border-emerald-500 bg-emerald-50">
                  <div className="flex items-center gap-3 mb-2">
                    <FiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Students will type their answer
                    </span>
                  </div>
                  <div className="text-lg font-bold text-emerald-900">
                    {currentQuestion.correctAnswer}
                  </div>
                  <p className="text-xs text-emerald-700 mt-2">
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
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Short Explanation</span>
                    <button
                      onClick={() => toggleEditMode('shortExplanation')}
                      className="text-amber-600 hover:text-amber-700 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.shortExplanation ? (
                    <div><textarea
                      value={currentQuestion.shortExplanation}
                      onChange={(e) => handleEdit('shortExplanation', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px]"
                    /><ImagePreviews text={currentQuestion.shortExplanation} /></div>
                  ) : (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.shortExplanation)}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.longExplanation && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Long Explanation</span>
                    <button
                      onClick={() => toggleEditMode('longExplanation')}
                      className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.longExplanation ? (
                    <div><textarea
                      value={currentQuestion.longExplanation}
                      onChange={(e) => handleEdit('longExplanation', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[120px]"
                    /><ImagePreviews text={currentQuestion.longExplanation} /></div>
                  ) : (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.longExplanation)}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.explanation && !currentQuestion.shortExplanation && !currentQuestion.longExplanation && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Explanation</span>
                    <button
                      onClick={() => toggleEditMode('explanation')}
                      className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {editMode.explanation ? (
                    <div><textarea
                      value={currentQuestion.explanation}
                      onChange={(e) => handleEdit('explanation', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
                    /><ImagePreviews text={currentQuestion.explanation} /></div>
                  ) : (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {renderContent(currentQuestion.explanation)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiChevronLeft /> Previous
          </button>

          <div className="text-sm text-slate-600 font-medium">
            {currentIndex + 1} / {editedQuestions.length}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleNext}
              disabled={currentIndex === editedQuestions.length - 1}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <FiChevronRight />
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <FiSave /> Save &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
