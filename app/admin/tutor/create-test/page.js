'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiAlertCircle, FiCheck, FiUsers, FiBook, FiPieChart, FiLoader, FiClock, FiList, FiPlus, FiX, FiChevronDown, FiChevronUp, FiEdit, FiTrash2, FiBarChart, FiEye } from 'react-icons/fi'
import Link from 'next/link'
import QuestionPreviewModal from '../../../components/admin/QuestionPreviewModal'

export default function CreateTutorTest() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [availableTopics, setAvailableTopics] = useState([])
  const [students, setStudents] = useState([])
  const [pastTests, setPastTests] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewQuestions, setPreviewQuestions] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [editedQuestions, setEditedQuestions] = useState([])
  
  // Custom dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTests, setSelectedTests] = useState([])
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [selectedTestForStudents, setSelectedTestForStudents] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    subject: 'Math', 
    totalQuestions: 10,
    isTimed: true, // New field for timed/untimed toggle
    duration: 30, // Default duration in minutes
    showExplanation: true, // New field for showing/hiding explanations
    topicConfig: {}, // { "TopicName": 50 }
    difficultyConfig: {
      'Easy': 0,
      'Medium': 0,
      'Hard': 0
    },
    assignedUsers: []
  })

  useEffect(() => {
    fetchStudents()
    fetchPastTests()
  }, [])

  useEffect(() => {
    fetchTopics(formData.subject)
    // Reset topic config when subject changes
    setFormData(prev => ({ ...prev, topicConfig: {} }))
  }, [formData.subject])

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests?type=students', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error('Failed to fetch students', err)
    }
  }

  const fetchPastTests = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests?type=tests', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched past tests:', data)
        setPastTests(data)
      }
    } catch (err) {
      console.error('Failed to fetch past tests', err)
    }
  }

  const fetchTopics = async (subject) => {
    setFetchingData(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/tests?type=topics&subject=${subject}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableTopics(data)
      }
    } catch (err) {
      console.error('Failed to fetch topics', err)
    } finally {
      setFetchingData(false)
    }
  }

  const handleTopicCheck = (topicName, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        topicConfig: { ...prev.topicConfig, [topicName]: 0 }
      }))
    } else {
      // Remove topic and rebalance others to 100%
      const newConfig = { ...formData.topicConfig }
      delete newConfig[topicName]
      
      const keys = Object.keys(newConfig)
      if (keys.length > 0) {
        const currentSum = keys.reduce((a, b) => a + newConfig[b], 0)
        let allocated = 0
        
        keys.forEach((k, i) => {
          let newVal
          if (currentSum === 0) {
            // Distribute equally if sum was 0
            newVal = Math.floor(100 / keys.length)
          } else {
            // Scale proportionally
            newVal = Math.floor((newConfig[k] / currentSum) * 100)
          }

          // Adjust last item
          if (i === keys.length - 1) {
            newVal = 100 - allocated
          }
          
          newConfig[k] = newVal
          allocated += newVal
        })
      }
      setFormData(prev => ({ ...prev, topicConfig: newConfig }))
    }
  }

  // Helper to distribute percentages proportionally
  const distributePercentages = (config, changedKey, newValue) => {
    const target = Math.max(0, Math.min(100, parseInt(newValue) || 0))
    const remaining = 100 - target
    
    const otherKeys = Object.keys(config).filter(k => k !== changedKey)
    
    // If no other keys, just set the target (though logic suggests it should be 100 if alone)
    if (otherKeys.length === 0) return { [changedKey]: target }

    const currentSumOthers = otherKeys.reduce((sum, key) => sum + config[key], 0)
    
    const newConfig = { [changedKey]: target }
    let allocated = 0
    
    otherKeys.forEach((key, index) => {
      let portion
      if (currentSumOthers === 0) {
        // Distribute equally if others were 0
        portion = Math.floor(remaining / otherKeys.length)
      } else {
        // Distribute proportionally
        portion = Math.floor((config[key] / currentSumOthers) * remaining)
      }
      
      // Adjust last item to ensure sum is exactly 100
      if (index === otherKeys.length - 1) {
        portion = remaining - allocated
      }
      
      newConfig[key] = portion
      allocated += portion
    })

    return newConfig
  }

  const handleTopicPercentage = (topic, value) => {
    const newConfig = distributePercentages(formData.topicConfig, topic, value)
    setFormData(prev => ({
      ...prev,
      topicConfig: newConfig
    }))
  }

  const handleDifficultyPercentage = (diff, value) => {
    const newConfig = distributePercentages(formData.difficultyConfig, diff, value)
    setFormData(prev => ({
      ...prev,
      difficultyConfig: newConfig
    }))
  }

  const handleUserToggle = (userId) => {
    const current = formData.assignedUsers
    let newUsers
    if (current.includes(userId)) {
      newUsers = current.filter(id => id !== userId)
    } else {
      newUsers = [...current, userId]
    }
    setFormData({ ...formData, assignedUsers: newUsers })
  }

  const handleSelectAllStudents = () => {
    setFormData(prev => ({ ...prev, assignedUsers: students.map(s => s._id) }))
  }

  const handleDeselectAllStudents = () => {
    setFormData(prev => ({ ...prev, assignedUsers: [] }))
  }

  const handleSelectAllTopics = () => {
    // Check if all are currently selected
    const allSelected = availableTopics.length > 0 && availableTopics.every(t => formData.topicConfig.hasOwnProperty(t.topic))
    
    if (allSelected) {
      // Deselect all
      setFormData(prev => ({ ...prev, topicConfig: {} }))
    } else {
      // Select all and distribute equally
      const count = availableTopics.length
      if (count === 0) return
      
      const share = Math.floor(100 / count)
      const remainder = 100 - (share * count)
      
      const newConfig = {}
      availableTopics.forEach((topicObj, index) => {
        newConfig[topicObj.topic] = share + (index === count - 1 ? remainder : 0)
      })
      
      setFormData(prev => ({ ...prev, topicConfig: newConfig }))
    }
  }

  const handlePreviewQuestions = async () => {
    setError('')
    
    // Validation
    const topicSum = Object.values(formData.topicConfig).reduce((a, b) => a + b, 0)
    if (topicSum !== 100) {
      setError(`Topic percentages must sum to 100%. Current: ${topicSum}%`)
      return
    }

    const diffSum = Object.values(formData.difficultyConfig).reduce((a, b) => a + b, 0)
    if (diffSum !== 100) {
      setError(`Difficulty percentages must sum to 100%. Current: ${diffSum}%`)
      return
    }

    setLoadingPreview(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: formData.subject,
          totalQuestions: parseInt(formData.totalQuestions),
          topicConfig: formData.topicConfig,
          difficultyConfig: formData.difficultyConfig
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch questions')
      }

      setPreviewQuestions(data.questions)
      setEditedQuestions(data.questions)
      setShowPreviewModal(true)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleQuestionsUpdate = (updatedQuestions) => {
    setEditedQuestions(updatedQuestions)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.title) {
      setError('Please enter a test title')
      return
    }

    const topicSum = Object.values(formData.topicConfig).reduce((a, b) => a + b, 0)
    if (topicSum !== 100) {
      setError(`Topic percentages must sum to 100%. Current: ${topicSum}%`)
      return
    }

    const diffSum = Object.values(formData.difficultyConfig).reduce((a, b) => a + b, 0)
    if (diffSum !== 100) {
      setError(`Difficulty percentages must sum to 100%. Current: ${diffSum}%`)
      return
    }

    if (formData.assignedUsers.length === 0) {
      setError('Please assign at least one student')
      return
    }

    if (formData.isTimed && (!formData.duration || formData.duration < 5)) {
      setError('Please enter a valid time limit (minimum 5 minutes)')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          duration: formData.isTimed ? parseInt(formData.duration) : null,
          customQuestions: editedQuestions.length > 0 ? editedQuestions : null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create test')
      }

      setSuccess(`Test created successfully! ID: ${data.testId} with ${data.count} questions.`)
      fetchPastTests() // Refresh the list
      
      // Reset form slightly delay to show success
      setTimeout(() => {
        setShowCreateForm(false)
        setSuccess('')
        setEditedQuestions([])
        setPreviewQuestions([])
        setFormData({
            title: '',
            subject: 'Math', 
            totalQuestions: 10,
            isTimed: true,
            duration: 30,
            showExplanation: true,
            topicConfig: {},
            difficultyConfig: { 'Easy': 0, 'Medium': 0, 'Hard': 0 },
            assignedUsers: []
        })
      }, 2000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTestSelection = (testId) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId) 
        : [...prev, testId]
    )
  }

  const handleSelectAllTests = () => {
    if (selectedTests.length === pastTests.length) {
      setSelectedTests([])
    } else {
      setSelectedTests(pastTests.map(t => t._id))
    }
  }

  const handleDeleteSelectedTests = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTests.length} test(s)? This will also delete associated student sessions.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/tests?ids=${selectedTests.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(`Deleted ${data.deletedTests} tests and ${data.deletedSessions} sessions.`)
        setSelectedTests([])
        fetchPastTests()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete tests')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete tests')
    }
  }

  const handleShowStudents = (test) => {
    setSelectedTestForStudents(test)
    setShowStudentsModal(true)
  }

  const handleCloseStudentsModal = () => {
    setShowStudentsModal(false)
    setSelectedTestForStudents(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tutor Test Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create and distribute custom practice tests</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm ${
              showCreateForm 
                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {showCreateForm ? <FiX /> : <FiPlus />}
            {showCreateForm ? 'Cancel' : 'Create New Test'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100 animate-fadeIn">
            <FiAlertCircle className="flex-shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100 animate-fadeIn">
            <FiCheck className="flex-shrink-0" /> {success}
          </div>
        )}

        {/* Create Test Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                 <FiEdit className="text-blue-500" /> New Test Configuration
               </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Title</label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g., Algebra Weekly Quiz"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <div className="flex gap-3">
                        <label className={`flex-1 flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${formData.subject === 'Math' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="subject" 
                                value="Math" 
                                checked={formData.subject === 'Math'} 
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                className="hidden"
                            />
                            <span className="font-medium text-sm">Math</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${formData.subject === 'Reading and Writing' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="subject" 
                                value="Reading and Writing" 
                                checked={formData.subject === 'Reading and Writing'} 
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                className="hidden"
                            />
                            <span className="font-medium text-sm">Reading & Writing</span>
                        </label>
                    </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Questions</label>
                      <input
                          type="number"
                          min="1"
                          max="100"
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.totalQuestions}
                          onChange={e => setFormData({...formData, totalQuestions: e.target.value})}
                      />
                  </div>

                  {/* Timed/Untimed Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Mode</label>
                    <div className="flex gap-3">
                        <label className={`flex-1 flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${formData.isTimed ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="testMode" 
                                checked={formData.isTimed} 
                                onChange={() => setFormData({...formData, isTimed: true, duration: 30})}
                                className="hidden"
                            />
                            <FiClock className="mr-2" />
                            <span className="font-medium text-sm">Timed</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${!formData.isTimed ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <input 
                                type="radio" 
                                name="testMode" 
                                checked={!formData.isTimed} 
                                onChange={() => setFormData({...formData, isTimed: false, duration: null})}
                                className="hidden"
                            />
                            <span className="font-medium text-sm">Untimed</span>
                        </label>
                    </div>
                  </div>

                  {/* Duration Input - Only show when Timed is selected */}
                  {formData.isTimed && (
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Time Limit (minutes)</label>
                          <div className="relative">
                              <FiClock className="absolute left-3 top-3 text-gray-400" />
                              <input
                                  type="number"
                                  min="5"
                                  max="180"
                                  className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={formData.duration || ''}
                                  onChange={e => setFormData({...formData, duration: e.target.value})}
                                  placeholder="Enter time limit"
                                  required
                              />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Recommended: 30-60 minutes</p>
                      </div>
                  )}

                  {/* Show Explanation Checkbox */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showExplanation}
                        onChange={(e) => setFormData({...formData, showExplanation: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Show Explanations to Students</span>
                        <p className="text-xs text-gray-600 mt-1">
                          When checked, students will see question explanations in their results/analysis page after completing the test.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Difficulty Levels */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Difficulty Distribution</label>
                        <span className={`text-xs font-medium ${Object.values(formData.difficultyConfig).reduce((a,b)=>a+b,0) === 100 ? 'text-green-600' : 'text-orange-500'}`}>
                            Total: {Object.values(formData.difficultyConfig).reduce((a,b)=>a+b,0)}%
                        </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        {['Easy', 'Medium', 'Hard'].map(diff => (
                            <div key={diff} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 w-20">{diff}</span>
                                <div className="flex-1 mx-3">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={formData.difficultyConfig[diff]} 
                                        onChange={(e) => handleDifficultyPercentage(diff, e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.difficultyConfig[diff]}
                                        onChange={(e) => handleDifficultyPercentage(diff, e.target.value)}
                                        className="w-12 p-1 text-center text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Topic Distribution */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-semibold text-gray-800">Topic Distribution</h3>
                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={handleSelectAllTopics}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                {availableTopics.length > 0 && availableTopics.every(t => formData.topicConfig.hasOwnProperty(t)) ? 'Deselect All' : 'Select All'}
                            </button>
                            <span className={`text-xs font-medium ${Object.values(formData.topicConfig).reduce((a,b)=>a+b,0) === 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                Sum: {Object.values(formData.topicConfig).reduce((a,b)=>a+b,0)}%
                            </span>
                        </div>
                    </div>
                    
                    {fetchingData ? (
                        <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                            <FiLoader className="animate-spin mr-2" /> Loading topics...
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                            {availableTopics.length === 0 ? (
                                <p className="p-4 text-gray-500 text-sm italic text-center">No topics found for this subject.</p>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {availableTopics.map(topicObj => (
                                        <div key={topicObj.topic} className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${formData.topicConfig.hasOwnProperty(topicObj.topic) ? 'bg-blue-50/50' : ''}`}>
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.topicConfig.hasOwnProperty(topicObj.topic)}
                                                    onChange={(e) => handleTopicCheck(topicObj.topic, e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{topicObj.topic}</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {topicObj.count}
                                                </span>
                                                {formData.topicConfig.hasOwnProperty(topicObj.topic) && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={formData.topicConfig[topicObj.topic]}
                                                            onChange={(e) => handleTopicPercentage(topicObj.topic, e.target.value)}
                                                            className="w-14 p-1 text-right text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                        <span className="text-xs text-gray-500">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Student Assignment */}
                <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3">Assign Students</h3>
                    <div className="relative">
                        <div 
                            className="w-full p-2.5 border border-gray-300 rounded-lg cursor-pointer flex justify-between items-center bg-white hover:border-blue-400 transition-colors"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={`text-sm ${formData.assignedUsers.length === 0 ? "text-gray-400" : "text-gray-800"}`}>
                                {formData.assignedUsers.length === 0 
                                    ? "Select students..." 
                                    : `${formData.assignedUsers.length} student${formData.assignedUsers.length !== 1 ? 's' : ''} selected`
                                }
                            </span>
                            {isDropdownOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
                                <div className="p-2 border-b border-gray-100 bg-gray-50">
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <div className="mt-2 flex justify-between items-center text-xs px-1">
                                        <div className="flex gap-3">
                                            <button type="button" onClick={handleSelectAllStudents} className="text-blue-600 hover:underline font-medium">
                                                Select All
                                            </button>
                                            <button type="button" onClick={handleDeselectAllStudents} className="text-red-500 hover:underline font-medium">
                                                Deselect All
                                            </button>
                                        </div>
                                        <span className="text-gray-500">{formData.assignedUsers.length} selected</span>
                                    </div>
                                </div>
                                
                                <div className="overflow-y-auto flex-1 p-1">
                                    {filteredStudents.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">No students found</div>
                                    ) : (
                                        filteredStudents.map(student => (
                                            <label 
                                                key={student._id} 
                                                className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${formData.assignedUsers.includes(student._id) ? 'bg-purple-50' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.assignedUsers.includes(student._id)}
                                                    onChange={() => handleUserToggle(student._id)}
                                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                />
                                                <div className="overflow-hidden">
                                                    <div className="font-medium text-gray-800 text-sm truncate">{student.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{student.email}</div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Selected Tags */}
                    {formData.assignedUsers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                            {students.filter(s => formData.assignedUsers.includes(s._id)).map(s => (
                                <span key={s._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                    {s.name}
                                    <button type="button" onClick={() => handleUserToggle(s._id)} className="ml-1.5 text-purple-400 hover:text-purple-600">
                                        <FiX className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-6 border-t border-gray-100">
                <button
                    type="button"
                    onClick={handlePreviewQuestions}
                    disabled={loadingPreview}
                    className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {loadingPreview ? <FiLoader className="animate-spin" /> : <FiEye />}
                    {loadingPreview ? 'Loading...' : 'Preview Questions'}
                </button>
                <div className="flex gap-3">
                  <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  >
                      Cancel
                  </button>
                  <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                      {loading ? <FiLoader className="animate-spin" /> : <FiSave />}
                      {loading ? 'Creating...' : 'Create Test'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Question Preview Modal */}
        {showPreviewModal && previewQuestions.length > 0 && (
          <QuestionPreviewModal
            questions={previewQuestions}
            onClose={() => setShowPreviewModal(false)}
            onQuestionsUpdate={handleQuestionsUpdate}
          />
        )}

        {/* Past Tests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiList className="text-blue-500" /> Test History
                </h2>
                <div className="flex items-center gap-3">
                    {selectedTests.length > 0 && (
                        <button 
                            onClick={handleDeleteSelectedTests}
                            className="text-xs flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors font-medium"
                        >
                            <FiTrash2 /> Delete ({selectedTests.length})
                        </button>
                    )}
                    <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{pastTests.length} Tests</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="p-4 w-10">
                                <input 
                                    type="checkbox" 
                                    checked={pastTests.length > 0 && selectedTests.length === pastTests.length}
                                    onChange={handleSelectAllTests}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Test Title</th>
                            <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Subject</th>
                            <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Stats</th>
                            <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                            <th className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pastTests.length > 0 ? (
                            pastTests.map(test => (
                                <tr key={test._id} className={`hover:bg-gray-50/80 transition-colors ${selectedTests.includes(test._id) ? 'bg-blue-50/30' : ''}`}>
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTests.includes(test._id)}
                                            onChange={() => handleTestSelection(test._id)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 text-sm">{test.title}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            test.subject === 'Math' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                                        }`}>
                                            {test.subject}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1"><FiBook className="w-3 h-3" /> {test.totalQuestions} Qs</span>
                                            <span className="flex items-center gap-1">
                                                <FiClock className="w-3 h-3" /> 
                                                {test.duration ? `${test.duration} m` : <span className="text-orange-600 font-medium">Untimed</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm whitespace-nowrap">
                                        {new Date(test.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleShowStudents(test)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <FiUsers /> Assigned Students
                                            </button>
                                            <Link 
                                                href={`/admin/tutor/tests/${test._id}/analytics`}
                                                className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 px-2 py-1 hover:bg-purple-50 rounded transition-colors"
                                            >
                                                <FiBarChart /> View Analytics
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-gray-400 italic">
                                    No tests created yet. Click &quot;Create New Test&quot; to begin.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Assigned Students Modal */}
        {showStudentsModal && selectedTestForStudents && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseStudentsModal}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <FiUsers className="text-blue-600" />
                      Assigned Students
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedTestForStudents.title}</p>
                  </div>
                  <button
                    onClick={handleCloseStudentsModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {selectedTestForStudents.assignedTo && selectedTestForStudents.assignedTo.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Total: <span className="font-semibold text-gray-900">{selectedTestForStudents.assignedTo.length}</span> student{selectedTestForStudents.assignedTo.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {selectedTestForStudents.assignedTo.map((student, index) => (
                        <div 
                          key={student._id || index} 
                          className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {(student.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{student.name || 'Unknown User'}</p>
                            {student.email && (
                              <p className="text-sm text-gray-500">{student.email}</p>
                            )}
                          </div>
                          <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No students assigned to this test</p>
                    <p className="text-sm text-gray-400 mt-1">Edit the test to assign students</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={handleCloseStudentsModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
