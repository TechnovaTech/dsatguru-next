'use client'
import { useState } from 'react'
import { FiCheck, FiX, FiEdit2, FiImage, FiChevronDown, FiChevronUp, FiSave } from 'react-icons/fi'

export default function BulkQuestionPreview({ questions, onApprove, onCancel, questionBankId, isTutor }) {
  const [editedQuestions, setEditedQuestions] = useState(questions)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set([0]))
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [approving, setApproving] = useState(false)

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedQuestions(newExpanded)
  }

  const expandAll = () => {
    const allIndices = editedQuestions.map((_, idx) => idx)
    setExpandedQuestions(new Set(allIndices))
  }

  const collapseAll = () => {
    setExpandedQuestions(new Set())
  }

  const startEdit = (index) => {
    setEditingQuestion(index)
  }

  const saveEdit = (index) => {
    setEditingQuestion(null)
  }

  const updateQuestion = (index, field, value) => {
    const updated = [...editedQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setEditedQuestions(updated)
  }

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...editedQuestions]
    const newOptions = [...updated[qIndex].options]
    newOptions[optIndex] = value
    updated[qIndex] = { ...updated[qIndex], options: newOptions }
    setEditedQuestions(updated)
  }

  const removeQuestion = (index) => {
    const updated = editedQuestions.filter((_, i) => i !== index)
    setEditedQuestions(updated)
    const newExpanded = new Set(expandedQuestions)
    newExpanded.delete(index)
    setExpandedQuestions(newExpanded)
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await onApprove(editedQuestions)
    } finally {
      setApproving(false)
    }
  }

  const hasImage = (text) => {
    return text && (text.includes('![') || text.includes('<img'))
  }

  const renderContent = (text) => {
    if (!text) return null
    
    // Log for debugging
    console.log('Rendering content:', text.substring(0, 100))
    
    // Split by markdown image syntax: ![alt](url)
    const parts = text.split(/(!\[.*?\]\(.*?\))/g)
    
    console.log('Split into parts:', parts.length)
    
    return (
      <div className="whitespace-pre-wrap">
        {parts.map((part, idx) => {
          // Match markdown image: ![alt](url)
          const imgMatch = part.match(/!\[.*?\]\((.*?)\)/)
          if (imgMatch) {
            console.log('Found image:', imgMatch[1])
            return (
              <div key={idx} className="my-2">
                <img 
                  src={imgMatch[1]} 
                  alt="Question" 
                  className="max-w-full h-auto rounded border"
                  onLoad={() => console.log('Image loaded successfully:', imgMatch[1])}
                  onError={(e) => {
                    console.error('Image failed to load:', imgMatch[1])
                    e.target.style.border = '2px solid red'
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Image: {imgMatch[1]}</p>
              </div>
            )
          }
          return <span key={idx}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Preview & Approve Questions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review {editedQuestions.length} question(s) before saving to database
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {expandedQuestions.size} of {editedQuestions.length} expanded
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Collapse All
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {editedQuestions.map((question, qIndex) => {
              const isExpanded = expandedQuestions.has(qIndex)
              const isEditing = editingQuestion === qIndex
              
              return (
                <div key={question.id} className={`border rounded-lg bg-white shadow-sm ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => !isEditing && toggleExpand(qIndex)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-gray-500">#{qIndex + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          question.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {question.subject}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {question.difficulty}
                        </span>
                        {hasImage(question.content) && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1">
                            <FiImage className="w-3 h-3" /> Image
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate flex-1">
                        {question.content.substring(0, 80)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t bg-gray-50" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900">
                            Question Details
                            {isEditing && <span className="ml-2 text-sm text-blue-600">(Editing Mode)</span>}
                          </h3>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); saveEdit(qIndex) }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-1"
                              >
                                <FiSave className="w-4 h-4" /> Save
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); startEdit(qIndex) }}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"
                              >
                                <FiEdit2 className="w-4 h-4" /> Edit
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex) }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm flex items-center gap-1"
                            >
                              <FiX className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            {isEditing ? (
                              <select
                                value={question.subject}
                                onChange={(e) => updateQuestion(qIndex, 'subject', e.target.value)}
                                className="w-full border rounded px-3 py-2"
                              >
                                <option value="Math">Math</option>
                                <option value="Reading and Writing">Reading and Writing</option>
                              </select>
                            ) : (
                              <p className="text-gray-900">{question.subject}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            {isEditing ? (
                              <select
                                value={question.difficulty}
                                onChange={(e) => updateQuestion(qIndex, 'difficulty', e.target.value)}
                                className="w-full border rounded px-3 py-2"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            ) : (
                              <p className="text-gray-900">{question.difficulty}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question Content</label>
                          {isEditing ? (
                            <div>
                              <textarea
                                value={question.content}
                                onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)}
                                className="w-full border rounded px-3 py-2 font-mono text-sm"
                                rows={6}
                                placeholder="Question text with markdown images: ![alt](url)"
                              />
                              <details className="mt-2">
                                <summary className="text-xs text-gray-500 cursor-pointer">Show raw content</summary>
                                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">{question.content}</pre>
                              </details>
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded border">
                              {renderContent(question.content)}
                            </div>
                          )}
                          {hasImage(question.content) && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <FiImage className="w-3 h-3" /> Contains embedded image(s)
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-start gap-2">
                                <span className={`px-2 py-1 rounded text-sm font-medium flex-shrink-0 ${
                                  question.correctAnswer === String.fromCharCode(65 + optIndex)
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                {isEditing ? (
                                  <textarea
                                    value={option}
                                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                    className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                                    rows={2}
                                    placeholder="Option text with markdown images: ![alt](url)"
                                  />
                                ) : (
                                  <div className="flex-1 bg-white p-2 rounded border">
                                    {renderContent(option)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                          {isEditing ? (
                            <select
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          ) : (
                            <p className="text-green-600 font-semibold">{question.correctAnswer}</p>
                          )}
                        </div>

                        {question.explanation && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                            {isEditing ? (
                              <textarea
                                value={question.explanation}
                                onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                                className="w-full border rounded px-3 py-2 font-mono text-sm"
                                rows={4}
                                placeholder="Explanation text with markdown images: ![alt](url)"
                              />
                            ) : (
                              <div className="bg-white p-3 rounded border">
                                {renderContent(question.explanation)}
                              </div>
                            )}
                          </div>
                        )}

                        {question.tags && question.tags.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2">
                              {question.tags.map((tag, tagIndex) => (
                                <span key={tagIndex} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {editedQuestions.length} question(s) ready to approve
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={approving || editedQuestions.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FiCheck className="w-5 h-5" />
              {approving ? 'Approving...' : 'Approve & Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
