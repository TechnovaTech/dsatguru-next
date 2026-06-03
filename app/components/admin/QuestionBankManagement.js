'use client'
import { useEffect, useState, useRef } from 'react'
import { FiSearch, FiEye, FiArrowLeft, FiPlus, FiEdit, FiX, FiCheck, FiEye as FiPreview, FiTrash, FiSettings, FiUserPlus, FiUserMinus, FiUpload, FiImage } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { renderContent } from './LatexRenderer'

const ImageUploadButton = ({ onUpload }) => {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    try {
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        onUpload(`![${data.filename}](${data.url})`)
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Upload error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFile} 
      />
      <button 
        type="button"
        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 mb-1 disabled:opacity-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <FiImage /> {uploading ? 'Uploading...' : 'Add Image'}
      </button>
    </>
  )
}

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
    <div className="flex flex-wrap gap-2 mt-1 p-2 bg-gray-50 rounded border border-dashed border-gray-200">
      <span className="text-xs text-gray-500 w-full">Image Preview:</span>
      {images.map((img, i) => (
        <img key={i} src={img.src} alt={img.alt} title={img.alt} className="h-20 w-auto object-contain rounded border bg-white" />
      ))}
    </div>
  )
}

export default function QuestionBankManagement({ isTutor = false, isAdminTest = false }) {
  const router = useRouter()
  const [questionBanks, setQuestionBanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [currentView, setCurrentView] = useState('banks')
  const [selectedBank, setSelectedBank] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qLoading, setQLoading] = useState(false)
  const [filters, setFilters] = useState({ subject: isTutor ? 'Math' : '', difficulty: '', type: '', tag: '', isActive: '', mathTopic: '', mathSubtopic: '', readingWritingTopic: '', remark: '' })
  const [questionSearch, setQuestionSearch] = useState('')
  const [preview, setPreview] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [selectedBankForAccess, setSelectedBankForAccess] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [bankAccess, setBankAccess] = useState([])
  const [accessLoading, setAccessLoading] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  const mathSubtopics = {
    'algebra': {
      label: 'Algebra',
      subtopics: {
        'expression': 'Expression',
        'linear-equations': 'Linear Equations',
        'linear-system-equations': 'Linear System of Equations',
        'linear-functions': 'Linear Functions',
        'linear-inequalities': 'Linear Inequalities'
      }
    },
    'advance-math': {
      label: 'Advance Math',
      subtopics: {
        'polynomials': 'Polynomials',
        'exponents-radicals': 'Exponents & Radicals',
        'functions-notation': 'Functions & Function Notations',
        'exponential-functions': 'Exponential Functions',
        'quadratics': 'Quadratics'
      }
    },
    'word-problem-data-analysis': {
      label: 'Word Problem and Data Analysis',
      subtopics: {}
    },
    'geometry': {
      label: 'Geometry',
      subtopics: {}
    }
  }
  const readingWritingTopics = {
    'reading': 'Reading',
    'writing': 'Writing'
  }

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoading(true)
        let url = '/api/questions?question-banks=true'
        if (isTutor) url += '&isTutor=true'
        if (isAdminTest) url += '&isAdminTest=true'
        
        const res = await fetch(url)
        const json = await res.json()
        const data = json.data || []
        setQuestionBanks(data)
      } finally {
        setLoading(false)
      }
    }
    fetchBanks()
  }, [isTutor])

  const filteredBanks = questionBanks.filter(b => (b.title || '').toLowerCase().includes(search.toLowerCase()))

  const fetchQuestions = async (bankId, overrides = {}) => {
    try {
      setQLoading(true)
      const currentFilters = { ...filters, ...overrides }
      const params = new URLSearchParams()
      if (bankId) params.set('bankId', bankId)
      if (isTutor) params.set('isTutor', 'true')
      if (isAdminTest && !bankId) params.set('isAdminTest', 'true')
      if (currentFilters.subject) params.set('subject', currentFilters.subject)
      if (currentFilters.difficulty) params.set('difficulty', currentFilters.difficulty)
      if (currentFilters.type) params.set('type', currentFilters.type)
      if (currentFilters.tag) params.set('tag', currentFilters.tag)
      if (currentFilters.isActive !== '') params.set('isActive', String(currentFilters.isActive === 'true'))
      const res = await fetch(`/api/questions?${params.toString()}`)
      const json = await res.json()
      // Handle both response formats: direct array or {data: array}
      const questionsArray = Array.isArray(json) ? json : (json.data || [])
      
      console.log('ðŸ“¥ Fetched Questions from API:', {
        totalQuestions: questionsArray.length,
        questionsWithRemarks: questionsArray.filter(q => q.remark && q.remark.trim()).length,
        sampleQuestions: questionsArray.slice(0, 3).map(q => ({
          questionId: q.questionId,
          id: q.id || q._id,
          remark: q.remark || '(empty)',
          remarkExists: !!q.remark
        }))
      })
      
      setQuestions(questionsArray)
    } finally {
      setQLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      setUsers(Array.isArray(json) ? json : json.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchBankAccess = async (bankId) => {
    try {
      setAccessLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/admin/question-banks/${bankId}/access`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      setBankAccess(json.access || [])
    } catch (error) {
      console.error('Error fetching bank access:', error)
    } finally {
      setAccessLoading(false)
    }
  }

  const grantAccess = async () => {
    if (!selectedUser || !selectedBankForAccess) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      await fetch(`/api/admin/question-banks/${selectedBankForAccess.id}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: selectedUser })
      })
      setSelectedUser('')
      fetchBankAccess(selectedBankForAccess.id)
      alert('Access granted successfully')
    } catch (error) {
      console.error('Error granting access:', error)
      alert('Failed to grant access')
    }
  }

  const revokeAccess = async (userId) => {
    if (!selectedBankForAccess) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      await fetch(`/api/admin/question-banks/${selectedBankForAccess.id}/access/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      fetchBankAccess(selectedBankForAccess.id)
      alert('Access revoked successfully')
    } catch (error) {
      console.error('Error revoking access:', error)
      alert('Failed to revoke access')
    }
  }

  const deleteQuestionBank = async (bankId) => {
    if (!confirm('Are you sure you want to delete this question bank? This action cannot be undone.')) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      await fetch(`/api/admin/question-banks/${bankId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setQuestionBanks(prev => prev.filter(b => b.id !== bankId))
      alert('Question bank deleted successfully')
    } catch (error) {
      console.error('Error deleting question bank:', error)
      alert('Failed to delete question bank')
    }
  }

  const openAccessModal = (bank) => {
    setSelectedBankForAccess(bank)
    setShowAccessModal(true)
    fetchUsers()
    fetchBankAccess(bank.id)
  }

  const setBankAndView = (bank) => {
    setSelectedBank(bank)
    setCurrentView('questions')
    if (isTutor) {
      const subject = bank.title.includes('Math') ? 'Math' : 'Reading and Writing'
      const nextFilters = { ...filters, subject }
      setFilters(nextFilters)
      fetchQuestions(null, nextFilters)
    } else if (isAdminTest) {
      if (bank.id === 'admintest-math') {
        setFilters(prev => ({ ...prev, subject: 'Math' }))
      } else if (bank.id === 'admintest-rw') {
        setFilters(prev => ({ ...prev, subject: 'Reading and Writing' }))
      }
      fetchQuestions(bank.id)
    } else {
      if (bank.id === 'admin-math') {
        setFilters(prev => ({ ...prev, subject: 'Math' }))
      } else if (bank.id === 'admin-rw') {
        setFilters(prev => ({ ...prev, subject: 'Reading and Writing' }))
      }
      fetchQuestions(bank.id)
    }
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'subject') {
      next.mathTopic = ''
      next.mathSubtopic = ''
      next.readingWritingTopic = ''
      next.tag = ''

      // When switching subject tab, also switch selectedBank to the matching bank
      if (!isTutor) {
        const isMath = value === 'Math'
        if (isAdminTest) {
          const matchBank = questionBanks.find(b => b.id === (isMath ? 'admintest-math' : 'admintest-rw'))
          if (matchBank) setSelectedBank(matchBank)
        } else {
          const matchBank = questionBanks.find(b => b.id === (isMath ? 'admin-math' : 'admin-rw'))
          if (matchBank) setSelectedBank(matchBank)
        }
      }
    }
    if (next.subject === 'Math') {
      next.tag = next.mathSubtopic || next.mathTopic || next.tag
    } else if (next.subject === 'Reading and Writing') {
      next.tag = next.readingWritingTopic || next.tag
    }
    setFilters(next)

    // Reset to page 1 when filters change
    setCurrentPage(1)

    // Determine correct bankId for fetch
    let bankId = selectedBank?.id
    if (key === 'subject' && !isTutor) {
      const isMath = value === 'Math'
      bankId = isAdminTest
        ? (isMath ? 'admintest-math' : 'admintest-rw')
        : (isMath ? 'admin-math' : 'admin-rw')
    }

    if (bankId || isTutor) fetchQuestions(bankId, next)
  }

  const toggleActive = async (q) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !q.isActive })
    })
    fetchQuestions(selectedBank?.id)
  }

  const softDelete = async (q) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    await fetch(`/api/questions/${q.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    fetchQuestions(selectedBank?.id)
  }

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select questions to delete')
      return
    }
    if (!confirm(`Are you sure you want to delete ${selectedQuestions.length} question(s)?`)) return
    try {
      setIsDeleting(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      await fetch('/api/questions/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ questionIds: selectedQuestions })
      })
      setSelectedQuestions([])
      fetchQuestions(selectedBank?.id)
      alert(`${selectedQuestions.length} question(s) deleted successfully`)
    } catch (error) {
      console.error('Bulk delete failed:', error)
      alert('Failed to delete questions')
    } finally {
      setIsDeleting(false)
    }
  }

  const getFilteredQuestions = () => {
    return questions.filter(q => {
      if (filters.remark && filters.remark.trim()) {
        const remarkFilterLower = filters.remark.toLowerCase().trim()
        const qRemark = (q.remark || '').toLowerCase()
        if (!qRemark.includes(remarkFilterLower)) return false
      }
      if (questionSearch.trim()) {
        const searchLower = questionSearch.toLowerCase().trim()
        const questionId = (q.questionId || '').toLowerCase()
        const content = (q.content || '').toLowerCase()
        const remark = (q.remark || '').toLowerCase()
        const serialNumber = q.questionId ? q.questionId.split('-').pop() : ''
        return questionId.includes(searchLower) ||
               content.includes(searchLower) ||
               remark.includes(searchLower) ||
               serialNumber === searchLower.replace('#', '')
      }
      return true
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Only select currently visible/filtered questions
      setSelectedQuestions(getFilteredQuestions().map(q => q.id))
    } else {
      setSelectedQuestions([])
    }
  }

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  const handleOpenEdit = (q) => {
    // Safe parse tags
    let tags = []
    try {
      tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
    } catch (e) {
      console.error('Error parsing tags:', e)
      tags = []
    }

    // Safe parse options and ensure they are strings
    let options = ['', '', '', '']
    try {
      const rawOptions = q.options
      const parsed = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : (Array.isArray(rawOptions) ? rawOptions : [])
      // Ensure we have 4 options and they are all strings
      for (let i = 0; i < 4; i++) {
        options[i] = (parsed[i] !== undefined && parsed[i] !== null) ? String(parsed[i]) : ''
      }
    } catch (e) {
      console.error('Error parsing options in handleOpenEdit:', e)
    }

    let mathTopic = ''
    let mathSubtopic = ''
    let readingWritingTopic = ''
    
    if (q.subject === 'Math') {
      // Find topic
      for (const [key, val] of Object.entries(mathSubtopics)) {
        if (tags.includes(key)) {
          mathTopic = key
          break
        }
      }
      // Find subtopic
      if (mathTopic) {
         for (const [key, val] of Object.entries(mathSubtopics[mathTopic].subtopics || {})) {
            if (tags.includes(key)) {
              mathSubtopic = key
              break
            }
         }
      } else {
         // Try to find subtopic globally if topic not found
         for (const [tKey, tVal] of Object.entries(mathSubtopics)) {
            for (const [sKey, sVal] of Object.entries(tVal.subtopics || {})) {
               if (tags.includes(sKey)) {
                  mathSubtopic = sKey
                  mathTopic = tKey
                  break
               }
            }
            if (mathSubtopic) break
         }
      }
    } else if (q.subject === 'Reading and Writing') {
      for (const [key, val] of Object.entries(readingWritingTopics)) {
        if (tags.includes(key)) {
          readingWritingTopic = key
          break
        }
      }
    }

    const usedTags = [mathTopic, mathSubtopic, readingWritingTopic].filter(Boolean)
    const otherTags = tags.filter(t => !usedTags.includes(t))

    console.log('ðŸ“ Opening Edit Modal - Remark Data:', {
      questionId: q.questionId || q.id,
      originalRemark: q.remark,
      remarkExists: !!q.remark,
      remarkLength: (q.remark || '').length
    })

    setEditItem({ 
      ...q, 
      content: q.content || q.question || '',
      tags: otherTags, 
      options: options,
      mathTopic, 
      mathSubtopic, 
      readingWritingTopic,
      remark: q.remark || ''
    })
  }

  const saveEdit = async () => {
    if (!editItem) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    console.log('ðŸ’¾ Saving Question Edit - Remark Data:', {
      questionId: editItem.questionId || editItem.id,
      remarkValue: editItem.remark,
      remarkExists: !!editItem.remark,
      remarkLength: (editItem.remark || '').length,
      remarkType: typeof editItem.remark
    })
    
    // Parse current free tags
    let freeTags = []
    try {
        freeTags = typeof editItem.tags === 'string' ? JSON.parse(editItem.tags) : (Array.isArray(editItem.tags) ? editItem.tags : [])
    } catch (e) {
        freeTags = []
    }

    const topicTags = []
    if (editItem.subject === 'Math') {
      if (editItem.mathTopic) topicTags.push(editItem.mathTopic)
      if (editItem.mathSubtopic) topicTags.push(editItem.mathSubtopic)
    } else if (editItem.subject === 'Reading and Writing') {
      if (editItem.readingWritingTopic) topicTags.push(editItem.readingWritingTopic)
    }
    const allTags = [...topicTags, ...freeTags]

    const payload = {
      title: editItem.title || '',
      questionParagraph: editItem.questionParagraph || '',
      content: editItem.content || '',
      explanation: editItem.explanation || '',
      shortExplanation: editItem.shortExplanation || '',
      longExplanation: editItem.longExplanation || '',
      subject: editItem.subject,
      difficulty: editItem.difficulty,
      type: editItem.type,
      testType: editItem.testType || 'Base',
      correctAnswer: editItem.correctAnswer || 'A',
      options: (() => {
          try {
              return typeof editItem.options === 'string' ? JSON.parse(editItem.options) : (Array.isArray(editItem.options) ? editItem.options : ['', '', '', ''])
          } catch {
              return ['', '', '', '']
          }
      })(),
      tags: allTags,
      points: typeof editItem.points === 'number' ? editItem.points : 1,
      remark: editItem.remark || ''
    }
    
    console.log('ðŸ“¤ Sending Payload to API:', {
      questionId: editItem.id,
      remarkInPayload: payload.remark,
      payloadRemarkLength: (payload.remark || '').length,
      apiEndpoint: `/api/admin/questions/${editItem.id}`
    })
    
    const response = await fetch(`/api/admin/questions/${editItem.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log('âœ… API Response:', {
      success: result.success,
      status: response.status,
      questionId: editItem.id
    })
    
    setEditItem(null)
    fetchQuestions(selectedBank?.id)
  }

  if (currentView === 'questions' && (selectedBank || isTutor)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {!isTutor && (
          <div className="flex items-center justify-between mb-6">
            <button className="inline-flex items-center text-blue-600 hover:text-blue-800" onClick={() => { setCurrentView('banks'); setSelectedBank(null) }}>
              <FiArrowLeft className="mr-2" />
              <span>Back to Question Banks</span>
            </button>
          </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              {isTutor && (
                <button className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-3" onClick={() => router.back()}>
                  <FiArrowLeft className="mr-2" />
                  <span>Back</span>
                </button>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isTutor
                  ? (filters.subject === 'Math' ? 'Tutor Math Question Bank' : filters.subject === 'Reading and Writing' ? 'Tutor Reading & Writing Question Bank' : 'Tutor Question Bank')
                  : selectedBank.title}
              </h1>
              <p className="text-gray-600">Manage questions for {isTutor ? 'tutors' : 'this question bank'}</p>
            </div>
            {isTutor && (
              <button
                onClick={() => router.push(`/admin/tutor/question-bank/upload?isTutor=true&subject=${filters.subject || 'Math'}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <FiPlus className="mr-2" />
                Add Question
              </button>
            )}
          </div>


          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {!isTutor && (!selectedBank || (selectedBank.id !== 'admin-math' && selectedBank.id !== 'admin-rw' && selectedBank.id !== 'admintest-math' && selectedBank.id !== 'admintest-rw')) && false && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                  <select value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    <option value="Math">Math</option>
                    <option value="Reading and Writing">Reading and Writing</option>
                  </select>
                </div>
              )}
              {filters.subject === 'Math' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Math Topic</label>
                    <select value={filters.mathTopic} onChange={(e) => handleFilterChange('mathTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="">All</option>
                      {Object.entries(mathSubtopics).map(([key, topic]) => (
                        <option key={key} value={key}>{topic.label}</option>
                      ))}
                    </select>
                  </div>
                  {filters.mathTopic && Object.keys(mathSubtopics[filters.mathTopic]?.subtopics || {}).length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Math Subtopic</label>
                      <select value={filters.mathSubtopic} onChange={(e) => handleFilterChange('mathSubtopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">All</option>
                        {Object.entries(mathSubtopics[filters.mathTopic]?.subtopics || {}).map(([key, sub]) => (
                          <option key={key} value={key}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              {filters.subject === 'Reading and Writing' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                  <select value={filters.readingWritingTopic} onChange={(e) => handleFilterChange('readingWritingTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    {Object.entries(readingWritingTopics).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                <select value={filters.difficulty} onChange={(e) => handleFilterChange('difficulty', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Question Type</label>
                <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="MultipleChoice">MultipleChoice</option>
                  <option value="TrueFalse">TrueFalse</option>
                  <option value="ShortAnswer">ShortAnswer</option>
                  <option value="Essay">Essay</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Tag</label>
                <input value={filters.tag} onChange={(e) => handleFilterChange('tag', e.target.value)} placeholder="e.g. algebra" className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                <input value={filters.remark} onChange={(e) => handleFilterChange('remark', e.target.value)} placeholder="Search remarks..." className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={filters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Questions</h2>
              <div className="flex items-center gap-3">
                {/* Question Search Input */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => { setQuestionSearch(e.target.value); setCurrentPage(1) }}
                    placeholder="Search by Question ID or Remark..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                  >
                    <FiTrash className="mr-2" />
                    Delete Selected ({selectedQuestions.length})
                  </button>
                )}
                <div className="text-sm text-gray-500">
                  {qLoading ? 'Loading...' : (() => {
                    const filteredCount = getFilteredQuestions().length
                    return `${filteredCount} result(s)${questionSearch.trim() ? ` (filtered from ${questions.length})` : ''}`
                  })()}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={(() => { const fq = getFilteredQuestions(); return fq.length > 0 && fq.every(q => selectedQuestions.includes(q.id)) })()}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic/Subtopic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const filteredQs = getFilteredQuestions()

                    const totalPages = Math.ceil(filteredQs.length / PAGE_SIZE)
                    const safePage = Math.min(currentPage, totalPages || 1)
                    const paginated = filteredQs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

                    if (paginated.length === 0 && !qLoading) {
                      return (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">No questions found for the selected filters.</td>
                        </tr>
                      )
                    }

                    return paginated.map((q, index) => {
                      const serialNumber = q.questionId ? q.questionId.split('-').pop() : ((safePage - 1) * PAGE_SIZE + index + 1)
                      const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (Array.isArray(q.options) ? q.options : [])
                      const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                      return (
                        <tr key={q.id || q._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.includes(q.id)}
                              onChange={() => handleSelectQuestion(q.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-mono text-gray-900">{q.questionId || `Q-${index + 1}`}</div>
                            <div className="text-xs text-gray-500">#{serialNumber}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{q.subject}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                              q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{q.type || 'MultipleChoice'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{parsedTags.join(', ') || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={q.remark || ''}>
                            {q.remark || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${q.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {q.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" onClick={() => handleOpenEdit(q)}>
                                <FiEdit className="mr-1" /> Edit
                              </button>
                              <button className="inline-flex items-center px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded" onClick={() => setPreview(q)}>
                                <FiPreview className="mr-1" /> Preview
                              </button>
                              <button className="inline-flex items-center px-2 py-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded" onClick={() => toggleActive(q)}>
                                {q.isActive ? <><FiX className="mr-1" /> Disable</> : <><FiCheck className="mr-1" /> Enable</>}
                              </button>
                              <button className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded" onClick={() => softDelete(q)}>
                                <FiTrash className="mr-1" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                  {questions.length === 0 && !qLoading && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">No questions found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* END overflow-x-auto */}

            {/* Pagination — outside scroll container so it's always visible */}
            {(() => {
              const filteredQs = getFilteredQuestions()
              const totalPages = Math.ceil(filteredQs.length / PAGE_SIZE)
              if (totalPages <= 1) return null
              const safePage = Math.min(currentPage, totalPages)

              // Build page numbers: show 5 around current page
              const delta = 2
              const pages = []
              for (let p = Math.max(1, safePage - delta); p <= Math.min(totalPages, safePage + delta); p++) {
                pages.push(p)
              }

              return (
                <div className="px-6 py-4 border-t flex items-center justify-between bg-white sticky bottom-0 z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                  <div className="text-sm text-gray-500">
                    Page {safePage} of {totalPages} &nbsp;·&nbsp; {filteredQs.length} questions
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Previous */}
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>

                    {/* First page + ellipsis */}
                    {pages[0] > 1 && (
                      <>
                        <button onClick={() => setCurrentPage(1)} className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50">1</button>
                        {pages[0] > 2 && <span className="px-2 text-gray-400">…</span>}
                      </>
                    )}

                    {/* Page numbers */}
                    {pages.map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 text-sm rounded border ${
                          p === safePage
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    {/* Last page + ellipsis */}
                    {pages[pages.length - 1] < totalPages && (
                      <>
                        {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-gray-400">…</span>}
                        <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50">{totalPages}</button>
                      </>
                    )}

                    {/* Next */}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>

          {preview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-lg w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Preview Question</h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        preview.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        preview.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {preview.difficulty || 'Medium'}
                      </span>
                      {preview.remark && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-xs font-medium text-amber-800 max-w-md truncate" title={preview.remark}>
                            {preview.remark}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="text-gray-600 hover:text-gray-800" onClick={() => setPreview(null)}><FiX size={24} /></button>
                </div>
                
                {/* Body - Split View (Test UI) */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Column - Passage & Question */}
                  <div className="w-1/2 border-r border-gray-200 p-8 overflow-y-auto bg-gray-50">
                    {preview.questionParagraph && (
                      <div className="prose max-w-none mb-8 text-gray-800 leading-relaxed whitespace-pre-line font-serif">
                        {renderContent(preview.questionParagraph)}
                      </div>
                    )}
                    <div className="text-gray-900 text-base leading-relaxed font-medium">
                      {renderContent(preview.content || preview.question)}
                    </div>
                  </div>

                  {/* Right Column - Options */}
                  <div className="w-1/2 p-8 overflow-y-auto bg-gray-50">
                    {/* Question Number Placeholder */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-black text-white w-12 h-12 rounded flex items-center justify-center font-bold text-lg">
                        1
                      </div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Preview Mode
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Choose an Answer
                        </span>
                      </div>
                      
                      {(() => {
                        let opts = ['', '', '', '']
                        try {
                           // Use q.options if it exists, otherwise use empty array
                           const rawOptions = preview.options
                           const parsed = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : (Array.isArray(rawOptions) ? rawOptions : [])
                           for (let i = 0; i < 4; i++) {
                             opts[i] = (parsed[i] !== undefined && parsed[i] !== null) ? String(parsed[i]) : ''
                           }
                        } catch (e) { 
                           console.error('Error parsing preview options:', e)
                           opts = ['', '', '', ''] 
                        }
                        
                        return ['A', 'B', 'C', 'D'].map((letter, i) => (
                          <div key={letter} className="flex items-stretch gap-3">
                            <div className="group flex-1 flex items-stretch border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-all overflow-hidden relative cursor-pointer">
                              <div className="flex-1 text-left p-3 sm:p-4 flex items-start gap-3 sm:gap-4 relative">
                                <div className="w-8 h-8 rounded-full border-2 border-gray-400 text-gray-700 bg-white group-hover:border-gray-600 flex items-center justify-center flex-shrink-0 font-semibold transition-colors">
                                  {letter}
                                </div>
                                <div className="flex-1 pt-1 text-base sm:text-lg leading-relaxed text-gray-900">
                                  {renderContent(opts[i] || '')}
                                </div>
                              </div>
                            </div>
                            {/* Eliminate Button Placeholder */}
                            <button className="group flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-gray-300 hover:text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                              <div className="relative w-5 h-5 flex items-center justify-center font-bold text-[10px] border border-current rounded">
                                ABC
                              </div>
                            </button>
                          </div>
                        ))
                      })()}
                    </div>

                    {/* Explanation */}
                    <div className="mt-8 pt-8 border-t">
                      <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider text-gray-500">Explanation (Hidden in Test)</h4>
                      
                      {preview.shortExplanation && (
                        <div className="mb-4">
                          <h5 className="font-semibold text-gray-700 text-xs uppercase mb-1">Short Explanation</h5>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                             <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {renderContent(preview.shortExplanation)}
                             </div>
                          </div>
                        </div>
                      )}

                      {preview.longExplanation && (
                        <div className="mb-4">
                          <h5 className="font-semibold text-gray-700 text-xs uppercase mb-1">Long Explanation</h5>
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                             <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {renderContent(preview.longExplanation)}
                             </div>
                          </div>
                        </div>
                      )}

                      {!preview.shortExplanation && !preview.longExplanation && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                           <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                              {renderContent(preview.explanation || 'No explanation provided.')}
                           </div>
                        </div>
                      )}

                      <div className="mt-4 text-sm text-gray-800 bg-green-50 px-4 py-2 rounded border border-green-200 inline-block">
                         <strong>Correct Answer:</strong> <span className="font-bold text-green-700">{preview.correctAnswer}</span>
                      </div>

                      {/* Remark Section */}
                      {preview.remark && (
                        <div className="mt-6 pt-6 border-t">
                          <h5 className="font-semibold text-gray-700 text-xs uppercase mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Admin/Tutor Remark
                          </h5>
                          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                              {preview.remark}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {editItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-[1500px] w-[95vw]">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Question</h3>
                  <button className="text-gray-600 hover:text-gray-800" onClick={() => setEditItem(null)}><FiX /></button>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                    <select value={editItem.subject} onChange={(e) => setEditItem({ ...editItem, subject: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Math">Math</option>
                      <option value="Reading and Writing">Reading and Writing</option>
                    </select>
                  </div>

                  {editItem.subject === 'Math' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Math Topic</label>
                        <select value={editItem.mathTopic || ''} onChange={(e) => setEditItem({ ...editItem, mathTopic: e.target.value, mathSubtopic: '' })} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">Select Topic</option>
                          {Object.entries(mathSubtopics).map(([key, topic]) => (
                            <option key={key} value={key}>{topic.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Math Subtopic</label>
                        <select value={editItem.mathSubtopic || ''} onChange={(e) => setEditItem({ ...editItem, mathSubtopic: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">Select Subtopic</option>
                          {editItem.mathTopic && mathSubtopics[editItem.mathTopic] && Object.entries(mathSubtopics[editItem.mathTopic].subtopics || {}).map(([key, sub]) => (
                            <option key={key} value={key}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {editItem.subject === 'Reading and Writing' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">R&W Topic</label>
                      <select value={editItem.readingWritingTopic || ''} onChange={(e) => setEditItem({ ...editItem, readingWritingTopic: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">Select Topic</option>
                        {Object.entries(readingWritingTopics).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Module Type</label>
                    <select value={editItem.testType || 'Base'} onChange={(e) => setEditItem({ ...editItem, testType: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Base">Base</option>
                      <option value="Adaptive">Adaptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                    <select value={editItem.difficulty} onChange={(e) => setEditItem({ ...editItem, difficulty: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question Type</label>
                    <select value={editItem.type} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="MultipleChoice">MultipleChoice</option>
                      <option value="TrueFalse">TrueFalse</option>
                      <option value="ShortAnswer">ShortAnswer</option>
                      <option value="Essay">Essay</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Other Tags (comma-separated)</label>
                    <input
                      value={(() => {
                        try {
                           const tags = typeof editItem.tags === 'string' ? JSON.parse(editItem.tags) : (Array.isArray(editItem.tags) ? editItem.tags : [])
                           return tags.join(', ')
                        } catch { return '' }
                      })()}
                      onChange={(e) => setEditItem({ ...editItem, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  {/* Title field removed */}
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Passage (Optional)</label>
                      <ImageUploadButton onUpload={(md) => setEditItem(prev => ({ ...prev, questionParagraph: (prev.questionParagraph || '') + '\n' + md }))} />
                    </div>
                    <textarea
                      value={editItem.questionParagraph || ''}
                      onChange={(e) => setEditItem({ ...editItem, questionParagraph: e.target.value })}
                      rows={3}
                      placeholder="Enter passage or context here (mainly for Reading/Writing sections)..."
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <ImagePreview text={editItem.questionParagraph} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Question</label>
                      <ImageUploadButton onUpload={(md) => setEditItem(prev => ({ ...prev, content: (prev.content || '') + '\n' + md }))} />
                    </div>
                    <textarea
                      value={editItem.content || ''}
                      onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                      rows={4}
                      placeholder="Enter the main question text here..."
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <ImagePreview text={editItem.content} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Explanation</label>
                      <ImageUploadButton onUpload={(md) => setEditItem(prev => ({ ...prev, explanation: (prev.explanation || '') + '\n' + md }))} />
                    </div>
                    <textarea
                      value={editItem.explanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, explanation: e.target.value })}
                      rows={3}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <ImagePreview text={editItem.explanation} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Short Explanation</label>
                      <ImageUploadButton onUpload={(md) => setEditItem(prev => ({ ...prev, shortExplanation: (prev.shortExplanation || '') + '\n' + md }))} />
                    </div>
                    <textarea
                      value={editItem.shortExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, shortExplanation: e.target.value })}
                      rows={2}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <ImagePreview text={editItem.shortExplanation} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Long Explanation</label>
                      <ImageUploadButton onUpload={(md) => setEditItem(prev => ({ ...prev, longExplanation: (prev.longExplanation || '') + '\n' + md }))} />
                    </div>
                    <textarea
                      value={editItem.longExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, longExplanation: e.target.value })}
                      rows={4}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <ImagePreview text={editItem.longExplanation} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remark (Admin/Tutor Notes)</label>
                    <textarea
                      value={editItem.remark || ''}
                      onChange={(e) => {
                        console.log('âœï¸ Remark Field Changed:', {
                          newValue: e.target.value,
                          valueLength: e.target.value.length,
                          questionId: editItem.questionId || editItem.id
                        })
                        setEditItem({ ...editItem, remark: e.target.value })
                      }}
                      rows={2}
                      placeholder="Add notes or remarks about this question..."
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Options</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {(() => {
                        // editItem.options is already ensured to be an array of 4 strings in handleOpenEdit
                        const opts = Array.isArray(editItem.options) ? editItem.options : ['', '', '', '']
                        return opts.map((opt, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-700">Option {String.fromCharCode(65 + idx)}</label>
                            <ImageUploadButton onUpload={(md) => {
                                const next = [...opts]
                                next[idx] = String((next[idx] || '') + ' ' + md)
                                setEditItem(prev => ({ ...prev, options: next }))
                            }} />
                          </div>
                          <input
                            value={String(opt || '')}
                            onChange={(e) => {
                              const next = [...opts]
                              next[idx] = String(e.target.value)
                              setEditItem({ ...editItem, options: next })
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                          <ImagePreview text={String(opt || '')} />
                        </div>
                      ))
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select
                      value={editItem.correctAnswer || 'A'}
                      onChange={(e) => setEditItem({ ...editItem, correctAnswer: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Points</label>
                    <input
                      type="number"
                      value={typeof editItem.points === 'number' ? editItem.points : 1}
                      onChange={(e) => setEditItem({ ...editItem, points: Number(e.target.value || 1) })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div className="p-4 border-t text-right flex gap-2 justify-end">
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded" onClick={() => setEditItem(null)}>Cancel</button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveEdit}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {!isTutor ? (
              <>
                <button
                  type="button"
                  onClick={() => router.replace('/admin/sat-question-upload')}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <FiArrowLeft className="mr-2" />
                  <span>Back to SAT Question Management</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/admin-tests/question-bank/upload?subject=Math')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiUpload className="mr-2" />
                    Upload Math
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/admin-tests/question-bank/upload?subject=Reading and Writing')}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <FiUpload className="mr-2" />
                    Upload R&W
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/flagged-questions')}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
                    </svg>
                    Flagged Questions
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3 w-full justify-end">
                 <button
                  onClick={() => router.push('/admin/tutor/question-bank/upload?isTutor=true&subject=Math')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <FiUpload className="mr-2" />
                  Upload Math
                </button>
                <button
                  onClick={() => router.push('/admin/tutor/question-bank/upload?isTutor=true&subject=Reading and Writing')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
                >
                  <FiUpload className="mr-2" />
                  Upload R&W
                </button>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isTutor ? 'Tutor Databases' : 'Question Bank Management'}</h1>
          <div className="text-gray-600 text-sm">{loading ? 'Loading...' : `${questionBanks.length} ${isTutor ? 'Databases' : 'Question Banks'}`}</div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.questionBankType === 'Mathematics' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {bank.questionBankType || 'Reading and Writing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.totalQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.activeQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.draftQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{bank.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bank.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" onClick={() => setBankAndView(bank)}>
                          <FiEye className="mr-1" /> View
                        </button>
                        {isTutor && (
                          <button 
                            className="inline-flex items-center px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded" 
                            onClick={() => router.push(`/admin/tutor/question-bank/upload?isTutor=true&subject=${bank.title.includes('Math') ? 'Math' : 'Reading and Writing'}`)}
                          >
                            <FiUpload className="mr-1" /> Upload
                          </button>
                        )}
                        {!isTutor && (
                          <>
                            <button className="inline-flex items-center px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded" onClick={() => openAccessModal(bank)}>
                              <FiSettings className="mr-1" /> Manage Access
                            </button>
                            <button className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded" onClick={() => deleteQuestionBank(bank.id)}>
                              <FiTrash className="mr-1" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBanks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">{loading ? 'Loading...' : 'No question banks found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access Management Modal */}
        {showAccessModal && selectedBankForAccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-xl font-semibold">Manage Access - {selectedBankForAccess.title}</h3>
                <button className="text-gray-600 hover:text-gray-800" onClick={() => setShowAccessModal(false)}>
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="p-6">
                {/* Grant Access Section */}
                <div className="mb-8">
                  <h4 className="text-lg font-medium mb-4 flex items-center">
                    <FiUserPlus className="mr-2 text-green-600" />
                    Grant Access to User
                  </h4>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose a user...</option>
                        {users.filter(user => !bankAccess.some(access => access.userId === user._id)).map(user => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email}) - {user.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={grantAccess}
                      disabled={!selectedUser}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <FiUserPlus className="mr-2" />
                      Grant Access
                    </button>
                  </div>
                </div>

                {/* Current Access List */}
                <div>
                  <h4 className="text-lg font-medium mb-4 flex items-center">
                    <FiEye className="mr-2 text-blue-600" />
                    Users with Access ({bankAccess.length})
                  </h4>
                  
                  {accessLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading access list...</div>
                    </div>
                  ) : bankAccess.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No users have access to this question bank yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Granted Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {bankAccess.map(access => (
                            <tr key={access.userId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {access.userName || 'Unknown User'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {access.userEmail || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  access.userRole === 'Admin' ? 'bg-red-100 text-red-800' :
                                  access.userRole === 'Tutor' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {access.userRole || 'Student'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  access.accessType === 'stripe' ? 'bg-purple-100 text-purple-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {access.accessType === 'stripe' ? 'Stripe Payment' : 'Admin Granted'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(access.grantedAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {access.accessType !== 'stripe' && (
                                  <button
                                    onClick={() => revokeAccess(access.userId)}
                                    className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                  >
                                    <FiUserMinus className="mr-1" />
                                    Revoke
                                  </button>
                                )}
                                {access.accessType === 'stripe' && (
                                  <span className="text-xs text-gray-500">Paid Access</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t bg-gray-50 text-right">
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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

