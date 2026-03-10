'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit } from 'react-icons/fi'

export default function TutorTestSheets() {
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all') // all, timed, untimed
  const [activeTab, setActiveTab] = useState('Math')
  
  // View test modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [testQuestions, setTestQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  
  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [editedQuestionsData, setEditedQuestionsData] = useState({})
  const [savingTest, setSavingTest] = useState(false)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setTests(data)
      } else {
        setError('Failed to load tests')
      }
    } catch (err) {
      setError('Failed to load tests')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/tests/list?id=${testId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        setSuccess('Test deleted successfully')
        fetchTests()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete test')
      }
    } catch (err) {
      setError('Failed to delete test')
      console.error(err)
    }
  }

  const handleViewTest = async (test) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(false)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})
    
    try {
      const token = localStorage.getItem('token')
      const questionIds = test.questions.join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const questions = await res.json()
        
        // Apply custom questions if they exist
        if (test.customQuestions) {
          const customQuestionsMap = test.customQuestions
          const mergedQuestions = questions.map(q => {
            const qId = q.id || q._id
            return customQuestionsMap[qId] ? { ...q, ...customQuestionsMap[qId] } : q
          })
          setTestQuestions(mergedQuestions)
        } else {
          setTestQuestions(questions)
        }
      }
    } catch (err) {
      console.error('Failed to load questions', err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleEditTest = async (test) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(true)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})
    
    try {
      const token = localStorage.getItem('token')
      const questionIds = test.questions.join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const questions = await res.json()
        
        // Apply custom questions if they exist
        if (test.customQuestions) {
          const customQuestionsMap = test.customQuestions
          const mergedQuestions = questions.map(q => {
            const qId = q.id || q._id
            return customQuestionsMap[qId] ? { ...q, ...customQuestionsMap[qId] } : q
          })
          setTestQuestions(mergedQuestions)
        } else {
          setTestQuestions(questions)
        }
      }
    } catch (err) {
      console.error('Failed to load questions', err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleSaveTestEdits = async () => {
    setSavingTest(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: viewingTest._id,
          customQuestions: editedQuestionsData
        })
      })

      if (res.ok) {
        setSuccess('Test updated successfully')
        setIsEditMode(false)
        setEditingQuestionId(null)
        fetchTests()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update test')
      }
    } catch (err) {
      setError('Failed to update test')
      console.error(err)
    } finally {
      setSavingTest(false)
    }
  }

  const handleEditQuestion = (questionId) => {
    setEditingQuestionId(questionId)
  }

  const handleSaveQuestion = (questionId) => {
    setEditingQuestionId(null)
  }

  const handleQuestionFieldChange = (questionId, field, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    
    setEditedQuestionsData(prev => ({
      ...prev,
      [questionId]: {
        ...currentEdited,
        [field]: value
      }
    }))
    
    // Update the displayed question immediately
    setTestQuestions(prev => prev.map(q => {
      if ((q.id || q._id) === questionId) {
        return { ...q, [field]: value }
      }
      return q
    }))
  }

  const handleOptionChange = (questionId, optionIndex, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    const currentOptions = typeof currentEdited.options === 'string' ? JSON.parse(currentEdited.options) : currentEdited.options
    const newOptions = [...currentOptions]
    newOptions[optionIndex] = value
    
    setEditedQuestionsData(prev => ({
      ...prev,
      [questionId]: {
        ...currentEdited,
        options: newOptions
      }
    }))
    
    // Update the displayed question immediately
    setTestQuestions(prev => prev.map(q => {
      if ((q.id || q._id) === questionId) {
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const renderWithImages = (text) => {
    if (!text) return null
    const stringText = String(text)
    const regex = /(!\[.*?\]\(.*?\))/g
    const parts = stringText.split(regex)
    
    return parts.map((part, index) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/)
      if (match) {
        return <img key={index} src={match[2]} alt={match[1]} className="max-w-full h-auto my-2 rounded border" />
      }
      return <span key={index}>{part}</span>
    })
  }

  const filteredTests = tests.filter(test => {
    // Filter by subject (tab)
    if (test.subject !== activeTab) return false
    
    // Filter by search term
    if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // Filter by mode
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tutor Test Sheets</h1>
          <p className="text-gray-600">View and manage all created tutor tests</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
            <FiX /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100">
            <FiSave /> {success}
          </div>
        )}

        {/* Subject Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('Math')}
                className={`${
                  activeTab === 'Math'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Math Tests
              </button>
              <button
                onClick={() => setActiveTab('Reading and Writing')}
                className={`${
                  activeTab === 'Reading and Writing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Reading & Writing Tests
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Title</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search test titles..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Mode</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tests</option>
                <option value="timed">Timed Only</option>
                <option value="untimed">Untimed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tests List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab} Tests ({filteredTests.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading tests...</td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No tests found</td>
                  </tr>
                ) : (
                  filteredTests.map((test) => (
                    <tr key={test._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{test.title}</td>
                      <td className="px-6 py-4 text-sm">
                        {test.isTimed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <FiClock /> {test.duration} min
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            Untimed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {test.questions?.length || 0} questions
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTest(test)}
                            className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                          >
                            <FiEye className="mr-1" /> View
                          </button>
                          <button
                            onClick={() => handleEditTest(test)}
                            className="inline-flex items-center px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                          >
                            <FiEdit className="mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test._id)}
                            className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                          >
                            <FiTrash className="mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View/Edit Test Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Test Questions' : viewingTest.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Question {currentQuestionIndex + 1} of {testQuestions.length}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <button
                      onClick={handleSaveTestEdits}
                      disabled={savingTest}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                      <FiSave /> {savingTest ? 'Saving...' : 'Save All Changes'}
                    </button>
                  )}
                  <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading questions...</div>
                  </div>
                ) : testQuestions.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">No questions found</div>
                  </div>
                ) : (
                  (() => {
                    const q = testQuestions[currentQuestionIndex]
                    if (!q) return null
                    
                    const qId = q.id || q._id
                    const isEditing = isEditMode && editingQuestionId === qId
                    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                    
                    const ImagePreview = ({ text }) => {
                      if (!text) return null
                      const regex = /!\[(.*?)\]\((.*?)\)/g
                      const images = []
                      let match
                      while ((match = regex.exec(text)) !== null) {
                        images.push({ alt: match[1], src: match[2] })
                      }
                      if (images.length === 0) return null
                      return (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200">
                          <span className="text-xs text-gray-500 block mb-2">Image Preview:</span>
                          <div className="flex flex-wrap gap-2">
                            {images.map((img, i) => (
                              <img key={i} src={img.src} alt={img.alt} title={img.alt} className="h-20 w-auto object-contain rounded border bg-white" />
                            ))}
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="max-w-4xl mx-auto">
                        <div className="border rounded-lg p-6 bg-gray-50">
                          {/* Question Header with Edit/Save Button */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-lg font-bold text-gray-900">Question {currentQuestionIndex + 1}</span>
                              
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {q.subject}
                              </span>
                              
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {q.difficulty}
                              </span>
                              
                              {tags.length > 0 && tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                  {tag}
                                </span>
                              ))}
                              
                              {q.remark && (
                                <span className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                                  💬 {q.remark}
                                </span>
                              )}
                            </div>
                            
                            {isEditMode && (
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveQuestion(qId)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                  >
                                    <FiSave /> Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuestion(qId)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                  >
                                    <FiEdit /> Edit
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Question Content */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                            {isEditing ? (
                              <>
                                <textarea
                                  value={q.content || q.question}
                                  onChange={(e) => handleQuestionFieldChange(qId, 'content', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
                                  rows={4}
                                />
                                <ImagePreview text={q.content || q.question} />
                              </>
                            ) : (
                              <div className="text-gray-900 bg-white p-3 rounded-lg border">
                                {renderWithImages(q.content || q.question)}
                              </div>
                            )}
                          </div>

                          {/* Options */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((letter, i) => (
                                <div key={letter} className={`p-3 border rounded-lg ${q.correctAnswer === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium">{letter}.</span>
                                    {isEditing ? (
                                      <div className="flex-1">
                                        <textarea
                                          value={options[i] || ''}
                                          onChange={(e) => handleOptionChange(qId, i, e.target.value)}
                                          className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                          rows={2}
                                        />
                                        <ImagePreview text={options[i] || ''} />
                                      </div>
                                    ) : (
                                      <div className="flex-1">{renderWithImages(options[i] || '')}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Correct Answer */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                            {isEditing ? (
                              <select
                                value={q.correctAnswer}
                                onChange={(e) => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</span>
                              </div>
                            )}
                          </div>

                          {/* Short Explanation */}
                          {(q.shortExplanation || isEditing) && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Short Explanation</label>
                              {isEditing ? (
                                <>
                                  <textarea
                                    value={q.shortExplanation || ''}
                                    onChange={(e) => handleQuestionFieldChange(qId, 'shortExplanation', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
                                    rows={3}
                                    placeholder="Add short explanation..."
                                  />
                                  <ImagePreview text={q.shortExplanation || ''} />
                                </>
                              ) : (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                  <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                    {renderWithImages(q.shortExplanation)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Long Explanation */}
                          {(q.longExplanation || isEditing) && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Long Explanation</label>
                              {isEditing ? (
                                <>
                                  <textarea
                                    value={q.longExplanation || ''}
                                    onChange={(e) => handleQuestionFieldChange(qId, 'longExplanation', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
                                    rows={5}
                                    placeholder="Add detailed explanation..."
                                  />
                                  <ImagePreview text={q.longExplanation || ''} />
                                </>
                              ) : (
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                  <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                    {renderWithImages(q.longExplanation)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* General Explanation (if no short/long) */}
                          {!q.shortExplanation && !q.longExplanation && q.explanation && !isEditing && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {renderWithImages(q.explanation)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>

              {/* Navigation Footer */}
              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <FiArrowLeft /> Previous
                </button>
                
                <div className="text-sm text-gray-600">
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === testQuestions.length - 1}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
