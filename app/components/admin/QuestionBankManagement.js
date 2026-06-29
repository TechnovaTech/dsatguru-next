'use client'
import { useEffect, useState, useRef } from 'react'
import { FiSearch, FiEye, FiArrowLeft, FiPlus, FiEdit, FiX, FiCheck, FiEye as FiPreview, FiTrash, FiSettings, FiUserPlus, FiUserMinus, FiUpload, FiImage, FiUsers, FiGrid } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { renderContent } from './LatexRenderer'
import { useConfirm, useToast } from '../ui/UIProvider'
import TablePasteModal from './TablePasteModal'

const ImageUploadButton = ({ onUpload }) => {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

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
        toast.error('Upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      toast.error('Upload error')
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
        className="text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1 mb-1 disabled:opacity-50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <FiImage /> {uploading ? 'Uploading...' : 'Add Image'}
      </button>
    </>
  )
}

const ImagePreview = ({ text, onRemove }) => {
  if (!text) return null
  const regex = /!\[(.*?)\]\((.*?)\)/g
  const images = []
  let match
  while ((match = regex.exec(text)) !== null) {
    images.push({ alt: match[1], src: match[2] })
  }
  if (images.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mt-1 p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      <span className="text-xs text-slate-500 w-full">Image Preview:</span>
      {images.map((img, i) => (
        <div key={i} className="relative">
          <img src={img.src} alt={img.alt} title={img.alt} className="h-20 w-auto object-contain rounded-lg border border-slate-200 bg-white" />
          {onRemove && (
            <button type="button" onClick={() => onRemove(img.src)} title="Remove image" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow hover:bg-red-700">×</button>
          )}
        </div>
      ))}
    </div>
  )
}

// Small "Table" button used next to each "Add Image" button in the edit form.
const TableButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className="mb-1 flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50">
    <FiGrid /> Table
  </button>
)

export default function QuestionBankManagement({ isTutor = false, isAdminTest = false }) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
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
  const [tableInsertFn, setTableInsertFn] = useState(null)
  const [bulkIds, setBulkIds] = useState(null)
  const [bulkIndex, setBulkIndex] = useState(0)
  const [bulkDrafts, setBulkDrafts] = useState({})
  const [modalEditing, setModalEditing] = useState(true)
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

  // Close any open modal on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (preview) setPreview(null)
      else if (editItem) setEditItem(null)
      else if (showAccessModal) setShowAccessModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, editItem, showAccessModal])

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/questions?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      // Handle both response formats: direct array or {data: array}
      const questionsArray = Array.isArray(json) ? json : (json.data || [])
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
      toast.success('Access granted successfully')
    } catch (error) {
      console.error('Error granting access:', error)
      toast.error('Failed to grant access')
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
      toast.success('Access revoked successfully')
    } catch (error) {
      console.error('Error revoking access:', error)
      toast.error('Failed to revoke access')
    }
  }

  const deleteQuestionBank = async (bankId) => {
    if (!(await confirm({ message: 'Are you sure you want to delete this question bank? This action cannot be undone.', tone: 'danger', confirmText: 'Delete' }))) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      await fetch(`/api/admin/question-banks/${bankId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setQuestionBanks(prev => prev.filter(b => b.id !== bankId))
      toast.success('Question bank deleted successfully')
    } catch (error) {
      console.error('Error deleting question bank:', error)
      toast.error('Failed to delete question bank')
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
    if (!(await confirm({ message: 'Are you sure you want to delete this question?', tone: 'danger', confirmText: 'Delete' }))) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    await fetch(`/api/questions/${q.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    fetchQuestions(selectedBank?.id)
  }

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      toast.info('Please select questions to delete')
      return
    }
    if (!(await confirm({ message: `Are you sure you want to delete ${selectedQuestions.length} question(s)?`, tone: 'danger', confirmText: 'Delete' }))) return
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
      toast.success(`${selectedQuestions.length} question(s) deleted successfully`)
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete questions')
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

  const mapQuestionToEdit = (q) => {
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

    return {
      ...q,
      content: q.content || q.question || '',
      tags: otherTags,
      options: options,
      mathTopic,
      mathSubtopic,
      readingWritingTopic,
      remark: q.remark || ''
    }
  }

  const handleOpenEdit = (q) => { setModalEditing(true); setEditItem(mapQuestionToEdit(q)) }

  // Persist a single edited question (used by both single edit and bulk edit).
  const persistQuestion = async (item) => {
    if (!item) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    let freeTags = []
    try { freeTags = typeof item.tags === 'string' ? JSON.parse(item.tags) : (Array.isArray(item.tags) ? item.tags : []) } catch (e) { freeTags = [] }
    const topicTags = []
    if (item.subject === 'Math') {
      if (item.mathTopic) topicTags.push(item.mathTopic)
      if (item.mathSubtopic) topicTags.push(item.mathSubtopic)
    } else if (item.subject === 'Reading and Writing') {
      if (item.readingWritingTopic) topicTags.push(item.readingWritingTopic)
    }
    const allTags = [...topicTags, ...freeTags]
    const payload = {
      title: item.title || '',
      questionParagraph: item.questionParagraph || '',
      content: item.content || '',
      explanation: item.explanation || '',
      shortExplanation: item.shortExplanation || '',
      longExplanation: item.longExplanation || '',
      subject: item.subject,
      difficulty: item.difficulty,
      type: item.type,
      testType: item.testType || 'Base',
      correctAnswer: item.correctAnswer || 'A',
      options: (() => {
        try { return typeof item.options === 'string' ? JSON.parse(item.options) : (Array.isArray(item.options) ? item.options : ['', '', '', '']) } catch { return ['', '', '', ''] }
      })(),
      tags: allTags,
      points: typeof item.points === 'number' ? item.points : 1,
      remark: item.remark || ''
    }
    await fetch(`/api/admin/questions/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    })
  }

  const saveEdit = async () => {
    if (!editItem) return
    await persistQuestion(editItem)
    setEditItem(null)
    fetchQuestions(selectedBank?.id)
    toast.success('Question saved')
  }

  // ---- Image markdown remove + table insert (parity with the test editors) ----
  const stripImageMarkdown = (text, src) => {
    if (!text) return text
    const esc = String(src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return String(text).replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const appendToField = (field, md) => setEditItem(prev => ({ ...prev, [field]: prev?.[field] ? `${prev[field]}\n${md}` : md }))
  const removeImgFromField = (field, src) => setEditItem(prev => ({ ...prev, [field]: stripImageMarkdown(prev?.[field] || '', src) }))
  const appendToOption = (idx, md) => setEditItem(prev => { const next = [...(prev.options || [])]; next[idx] = next[idx] ? `${next[idx]}\n${md}` : md; return { ...prev, options: next } })
  const removeImgFromOption = (idx, src) => setEditItem(prev => { const next = [...(prev.options || [])]; next[idx] = stripImageMarkdown(next[idx] || '', src); return { ...prev, options: next } })
  const openTable = (onInsert) => setTableInsertFn(() => onInsert)

  // ---- Bulk edit (edit each selected question one-by-one, saved to the bank) ----
  const startBulkEdit = () => {
    const ids = getFilteredQuestions().filter(q => selectedQuestions.includes(q.id)).map(q => q.id)
    if (!ids.length) return
    setBulkIds(ids)
    setBulkIndex(0)
    setBulkDrafts({})
    setModalEditing(false)
    setEditItem(mapQuestionToEdit(questions.find(q => q.id === ids[0])))
  }
  const bulkGoto = (newIndex) => {
    if (newIndex < 0 || newIndex >= bulkIds.length) return
    const curId = bulkIds[bulkIndex]
    const drafts = { ...bulkDrafts, [curId]: editItem }
    setBulkDrafts(drafts)
    const nid = bulkIds[newIndex]
    setBulkIndex(newIndex)
    setEditItem(drafts[nid] || mapQuestionToEdit(questions.find(q => q.id === nid)))
  }
  const finishBulk = async () => {
    const drafts = { ...bulkDrafts, [bulkIds[bulkIndex]]: editItem }
    for (const id of bulkIds) { if (drafts[id]) { try { await persistQuestion(drafts[id]) } catch {} } }
    setBulkIds(null); setBulkIndex(0); setBulkDrafts({}); setEditItem(null)
    setSelectedQuestions([])
    fetchQuestions(selectedBank?.id)
    toast.success('All selected questions saved')
  }

  if (currentView === 'questions' && (selectedBank || isTutor)) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          {!isTutor && (
          <div className="flex items-center justify-between mb-6">
            <button className="inline-flex items-center text-slate-600 hover:text-indigo-600 transition-colors" onClick={() => { setCurrentView('banks'); setSelectedBank(null) }}>
              <FiArrowLeft className="mr-2" />
              <span>Back to Question Banks</span>
            </button>
          </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              {isTutor && (
                <button className="inline-flex items-center text-slate-600 hover:text-indigo-600 mb-3 transition-colors" onClick={() => router.back()}>
                  <FiArrowLeft className="mr-2" />
                  <span>Back</span>
                </button>
              )}
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2">
                {isTutor
                  ? (filters.subject === 'Math' ? 'Tutor Math Question Bank' : filters.subject === 'Reading and Writing' ? 'Tutor Reading & Writing Question Bank' : 'Tutor Question Bank')
                  : selectedBank.title}
              </h1>
              <p className="text-slate-500">Manage questions for {isTutor ? 'tutors' : 'this question bank'}</p>
            </div>
            {isTutor && (
              <button
                onClick={() => router.push(`/admin/tutor/question-bank/upload?isTutor=true&subject=${filters.subject || 'Math'}`)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center transition-colors"
              >
                <FiPlus className="mr-2" />
                Add Question
              </button>
            )}
          </div>


          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {!isTutor && (!selectedBank || (selectedBank.id !== 'admin-math' && selectedBank.id !== 'admin-rw' && selectedBank.id !== 'admintest-math' && selectedBank.id !== 'admintest-rw')) && false && (
                <div>
                  <label htmlFor="filter-subject" className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                  <select id="filter-subject" value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">All</option>
                    <option value="Math">Math</option>
                    <option value="Reading and Writing">Reading and Writing</option>
                  </select>
                </div>
              )}
              {filters.subject === 'Math' && (
                <>
                  <div>
                    <label htmlFor="filter-mathTopic" className="block text-xs font-medium text-slate-600 mb-1">Math Topic</label>
                    <select id="filter-mathTopic" value={filters.mathTopic} onChange={(e) => handleFilterChange('mathTopic', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="">All</option>
                      {Object.entries(mathSubtopics).map(([key, topic]) => (
                        <option key={key} value={key}>{topic.label}</option>
                      ))}
                    </select>
                  </div>
                  {filters.mathTopic && Object.keys(mathSubtopics[filters.mathTopic]?.subtopics || {}).length > 0 && (
                    <div>
                      <label htmlFor="filter-mathSubtopic" className="block text-xs font-medium text-slate-600 mb-1">Math Subtopic</label>
                      <select id="filter-mathSubtopic" value={filters.mathSubtopic} onChange={(e) => handleFilterChange('mathSubtopic', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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
                  <label htmlFor="filter-rwTopic" className="block text-xs font-medium text-slate-600 mb-1">Topic</label>
                  <select id="filter-rwTopic" value={filters.readingWritingTopic} onChange={(e) => handleFilterChange('readingWritingTopic', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">All</option>
                    {Object.entries(readingWritingTopics).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="filter-difficulty" className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
                <select id="filter-difficulty" value={filters.difficulty} onChange={(e) => handleFilterChange('difficulty', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">All</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-type" className="block text-xs font-medium text-slate-600 mb-1">Question Type</label>
                <select id="filter-type" value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">All</option>
                  <option value="MultipleChoice">MultipleChoice</option>
                  <option value="TrueFalse">TrueFalse</option>
                  <option value="ShortAnswer">ShortAnswer</option>
                  <option value="Essay">Essay</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-tag" className="block text-xs font-medium text-slate-600 mb-1">Custom Tag</label>
                <input id="filter-tag" value={filters.tag} onChange={(e) => handleFilterChange('tag', e.target.value)} placeholder="e.g. algebra" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label htmlFor="filter-remark" className="block text-xs font-medium text-slate-600 mb-1">Remark</label>
                <input id="filter-remark" value={filters.remark} onChange={(e) => handleFilterChange('remark', e.target.value)} placeholder="Search remarks..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label htmlFor="filter-status" className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select id="filter-status" value={filters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Manage Questions</h2>
              <div className="flex flex-wrap items-center gap-3">
                {/* Question Search Input */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <label htmlFor="question-search" className="sr-only">Search questions</label>
                  <input
                    id="question-search"
                    type="text"
                    value={questionSearch}
                    onChange={(e) => { setQuestionSearch(e.target.value); setCurrentPage(1) }}
                    placeholder="Search by Question ID or Remark..."
                    className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={startBulkEdit}
                    className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
                  >
                    <FiEdit className="mr-2" />
                    Bulk Edit ({selectedQuestions.length})
                  </button>
                )}
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <FiTrash className="mr-2" />
                    Delete Selected ({selectedQuestions.length})
                  </button>
                )}
                <div className="text-sm text-slate-500">
                  {qLoading ? 'Loading...' : (() => {
                    const filteredCount = getFilteredQuestions().length
                    return `${filteredCount} result(s)${questionSearch.trim() ? ` (filtered from ${questions.length})` : ''}`
                  })()}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={(() => { const fq = getFilteredQuestions(); return fq.length > 0 && fq.every(q => selectedQuestions.includes(q.id)) })()}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Question ID</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Difficulty</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Question Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Topic/Subtopic</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Remark</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filteredQs = getFilteredQuestions()

                    const totalPages = Math.ceil(filteredQs.length / PAGE_SIZE)
                    const safePage = Math.min(currentPage, totalPages || 1)
                    const paginated = filteredQs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

                    if (qLoading) {
                      return (
                        <tr>
                          <td colSpan={9} className="px-6 py-12">
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                              <span className="text-sm">Loading questions...</span>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="px-6 py-12">
                            <div className="flex flex-col items-center justify-center gap-2 text-center">
                              <FiSearch className="h-10 w-10 text-slate-300" />
                              <h3 className="text-sm font-semibold text-slate-700">No questions found</h3>
                              <p className="text-sm text-slate-400">Try adjusting your filters or search to find questions.</p>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return paginated.map((q, index) => {
                      const serialNumber = q.questionId ? q.questionId.split('-').pop() : ((safePage - 1) * PAGE_SIZE + index + 1)
                      const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (Array.isArray(q.options) ? q.options : [])
                      const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                      return (
                        <tr key={q.id || q._id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.includes(q.id)}
                              onChange={() => handleSelectQuestion(q.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <div className="font-mono text-slate-900">{q.questionId || `Q-${index + 1}`}</div>
                            <div className="text-xs text-slate-500">#{serialNumber}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{q.subject}</td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                              q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' :
                              q.difficulty === 'Hard' ? 'bg-red-50 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{q.type || 'MultipleChoice'}</td>
                          <td className="px-4 py-4 text-sm text-slate-700 max-w-[150px] truncate" title={parsedTags.join(', ')}>{parsedTags.join(', ') || '-'}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 max-w-xs truncate" title={q.remark || ''}>
                            {q.remark || <span className="text-slate-400 italic">-</span>}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${q.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {q.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex items-center gap-1">
                              <button title="Edit" aria-label="Edit" className="rounded-lg p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800" onClick={() => handleOpenEdit(q)}>
                                <FiEdit className="h-4 w-4" />
                              </button>
                              <button title="Preview" aria-label="Preview" className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800" onClick={() => setPreview(q)}>
                                <FiPreview className="h-4 w-4" />
                              </button>
                              <button title={q.isActive ? 'Disable' : 'Enable'} aria-label={q.isActive ? 'Disable' : 'Enable'} className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-800" onClick={() => toggleActive(q)}>
                                {q.isActive ? <FiX className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                              </button>
                              <button title="Delete" aria-label="Delete" className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800" onClick={() => softDelete(q)}>
                                <FiTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
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
                <div className="px-4 py-4 border-t border-slate-100 flex items-center justify-between bg-white sticky bottom-0 z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                  <div className="text-sm text-slate-500">
                    Page {safePage} of {totalPages} &nbsp;·&nbsp; {filteredQs.length} questions
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Previous */}
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>

                    {/* First page + ellipsis */}
                    {pages[0] > 1 && (
                      <>
                        <button onClick={() => setCurrentPage(1)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">1</button>
                        {pages[0] > 2 && <span className="px-2 text-slate-400">…</span>}
                      </>
                    )}

                    {/* Page numbers */}
                    {pages.map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          p === safePage
                            ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    {/* Last page + ellipsis */}
                    {pages[pages.length - 1] < totalPages && (
                      <>
                        {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-slate-400">…</span>}
                        <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">{totalPages}</button>
                      </>
                    )}

                    {/* Next */}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>

          {preview && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Preview Question</h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        preview.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                        preview.difficulty === 'Hard' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
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
                  <button aria-label="Close preview" className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => setPreview(null)}><FiX size={24} /></button>
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
                      <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-500">Explanation (Hidden in Test)</h4>
                      
                      {preview.shortExplanation && (
                        <div className="mb-4">
                          <h5 className="font-semibold text-slate-700 text-xs uppercase mb-1">Short Explanation</h5>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                             <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {renderContent(preview.shortExplanation)}
                             </div>
                          </div>
                        </div>
                      )}

                      {preview.longExplanation && (
                        <div className="mb-4">
                          <h5 className="font-semibold text-slate-700 text-xs uppercase mb-1">Long Explanation</h5>
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                             <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {renderContent(preview.longExplanation)}
                             </div>
                          </div>
                        </div>
                      )}

                      {!preview.shortExplanation && !preview.longExplanation && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                           <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                              {renderContent(preview.explanation || 'No explanation provided.')}
                           </div>
                        </div>
                      )}

                      <div className="mt-4 text-sm text-slate-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 inline-block">
                         <strong>Correct Answer:</strong> <span className="font-bold text-emerald-700">{preview.correctAnswer}</span>
                      </div>

                      {/* Remark Section */}
                      {preview.remark && (
                        <div className="mt-6 pt-6 border-t">
                          <h5 className="font-semibold text-slate-700 text-xs uppercase mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Admin/Tutor Remark
                          </h5>
                          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
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
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => { if (!bulkIds) setEditItem(null) }}>
              <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex flex-shrink-0 items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{bulkIds ? `Bulk Edit — Question ${bulkIndex + 1} of ${bulkIds.length}` : 'Edit Question'}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModalEditing(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50">
                      {modalEditing ? <><FiEye /> View</> : <><FiEdit /> Edit</>}
                    </button>
                    <button aria-label="Close edit dialog" className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => { if (bulkIds) finishBulk(); else setEditItem(null) }}><FiX /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                {modalEditing ? (
                <div className="p-6 space-y-4">
                  {!bulkIds && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                    <select value={editItem.subject} onChange={(e) => setEditItem({ ...editItem, subject: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="Math">Math</option>
                      <option value="Reading and Writing">Reading and Writing</option>
                    </select>
                  </div>

                  {editItem.subject === 'Math' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Math Topic</label>
                        <select value={editItem.mathTopic || ''} onChange={(e) => setEditItem({ ...editItem, mathTopic: e.target.value, mathSubtopic: '' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                          <option value="">Select Topic</option>
                          {Object.entries(mathSubtopics).map(([key, topic]) => (
                            <option key={key} value={key}>{topic.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Math Subtopic</label>
                        <select value={editItem.mathSubtopic || ''} onChange={(e) => setEditItem({ ...editItem, mathSubtopic: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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
                      <label className="block text-xs font-medium text-slate-600 mb-1">R&W Topic</label>
                      <select value={editItem.readingWritingTopic || ''} onChange={(e) => setEditItem({ ...editItem, readingWritingTopic: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="">Select Topic</option>
                        {Object.entries(readingWritingTopics).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Module Type</label>
                    <select value={editItem.testType || 'Base'} onChange={(e) => setEditItem({ ...editItem, testType: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="Base">Base</option>
                      <option value="Adaptive">Adaptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
                    <select value={editItem.difficulty} onChange={(e) => setEditItem({ ...editItem, difficulty: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Question Type</label>
                    <select value={editItem.type} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                      <option value="MultipleChoice">MultipleChoice</option>
                      <option value="TrueFalse">TrueFalse</option>
                      <option value="ShortAnswer">ShortAnswer</option>
                      <option value="Essay">Essay</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Other Tags (comma-separated)</label>
                    <input
                      value={(() => {
                        try {
                           const tags = typeof editItem.tags === 'string' ? JSON.parse(editItem.tags) : (Array.isArray(editItem.tags) ? editItem.tags : [])
                           return tags.join(', ')
                        } catch { return '' }
                      })()}
                      onChange={(e) => setEditItem({ ...editItem, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  </div>
                  )}
                  {/* Title field removed */}
                  
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">Passage (Optional)</label>
                      <div className="flex gap-1">
                        <ImageUploadButton onUpload={(md) => appendToField('questionParagraph', md)} />
                        <TableButton onClick={() => openTable((md) => appendToField('questionParagraph', md))} />
                      </div>
                    </div>
                    <textarea
                      value={editItem.questionParagraph || ''}
                      onChange={(e) => setEditItem({ ...editItem, questionParagraph: e.target.value })}
                      rows={3}
                      placeholder="Enter passage or context here (mainly for Reading/Writing sections)..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <ImagePreview text={editItem.questionParagraph} onRemove={(src) => removeImgFromField('questionParagraph', src)} />
                  </div>
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">Question</label>
                      <div className="flex gap-1">
                        <ImageUploadButton onUpload={(md) => appendToField('content', md)} />
                        <TableButton onClick={() => openTable((md) => appendToField('content', md))} />
                      </div>
                    </div>
                    <textarea
                      value={editItem.content || ''}
                      onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                      rows={4}
                      placeholder="Enter the main question text here..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <ImagePreview text={editItem.content} onRemove={(src) => removeImgFromField('content', src)} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">Explanation</label>
                      <div className="flex gap-1">
                        <ImageUploadButton onUpload={(md) => appendToField('explanation', md)} />
                        <TableButton onClick={() => openTable((md) => appendToField('explanation', md))} />
                      </div>
                    </div>
                    <textarea
                      value={editItem.explanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, explanation: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <ImagePreview text={editItem.explanation} onRemove={(src) => removeImgFromField('explanation', src)} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">Short Explanation</label>
                      <div className="flex gap-1">
                        <ImageUploadButton onUpload={(md) => appendToField('shortExplanation', md)} />
                        <TableButton onClick={() => openTable((md) => appendToField('shortExplanation', md))} />
                      </div>
                    </div>
                    <textarea
                      value={editItem.shortExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, shortExplanation: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <ImagePreview text={editItem.shortExplanation} onRemove={(src) => removeImgFromField('shortExplanation', src)} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">Long Explanation</label>
                      <div className="flex gap-1">
                        <ImageUploadButton onUpload={(md) => appendToField('longExplanation', md)} />
                        <TableButton onClick={() => openTable((md) => appendToField('longExplanation', md))} />
                      </div>
                    </div>
                    <textarea
                      value={editItem.longExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, longExplanation: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <ImagePreview text={editItem.longExplanation} onRemove={(src) => removeImgFromField('longExplanation', src)} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Remark (Admin/Tutor Notes)</label>
                    <textarea
                      value={editItem.remark || ''}
                      onChange={(e) => {
                        setEditItem({ ...editItem, remark: e.target.value })
                      }}
                      rows={2}
                      placeholder="Add notes or remarks about this question..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Answer Options (Multiple Choice)</label>
                    <div className="space-y-3">
                      {(() => {
                        const opts = Array.isArray(editItem.options) ? editItem.options : ['', '', '', '']
                        return opts.map((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx)
                          const isCorrect = (editItem.correctAnswer || 'A') === letter
                          return (
                            <div key={idx} className={`rounded-lg border-2 p-3 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                              <div className="mb-2 flex items-center gap-2">
                                <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>{letter}.</span>
                                {isCorrect ? (
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Correct</span>
                                ) : (
                                  <button type="button" onClick={() => setEditItem({ ...editItem, correctAnswer: letter })} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">Set correct</button>
                                )}
                              </div>
                              <textarea
                                value={String(opt || '')}
                                onChange={(e) => { const next = [...opts]; next[idx] = String(e.target.value); setEditItem({ ...editItem, options: next }) }}
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                              <div className="mt-2 flex gap-2">
                                <ImageUploadButton onUpload={(md) => appendToOption(idx, md)} />
                                <TableButton onClick={() => openTable((md) => appendToOption(idx, md))} />
                              </div>
                              <ImagePreview text={String(opt || '')} onRemove={(src) => removeImgFromOption(idx, src)} />
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Correct Answer</label>
                    <select
                      value={editItem.correctAnswer || 'A'}
                      onChange={(e) => setEditItem({ ...editItem, correctAnswer: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Points</label>
                    <input
                      type="number"
                      value={typeof editItem.points === 'number' ? editItem.points : 1}
                      onChange={(e) => setEditItem({ ...editItem, points: Number(e.target.value || 1) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  </div>
                </div>
                ) : (
                  <div className="p-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${editItem.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{editItem.subject}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${editItem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : editItem.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{editItem.difficulty}</span>
                        <span className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">ID: {editItem.questionId || String(editItem.id || '').slice(-8)}</span>
                        {(Array.isArray(editItem.tags) ? editItem.tags : []).map((t, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{t}</span>)}
                        {editItem.remark && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">💬 {editItem.remark}</span>}
                      </div>
                      {editItem.questionParagraph && (
                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <span className="text-xs font-semibold uppercase text-blue-700">Context Paragraph</span>
                          <div className="mt-2 text-sm text-gray-700">{renderContent(editItem.questionParagraph)}</div>
                        </div>
                      )}
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Question</label>
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900">{renderContent(editItem.content)}</div>
                      </div>
                      {(() => {
                        const opts = Array.isArray(editItem.options) ? editItem.options : []
                        const hasOpts = opts.some(o => String(o || '').trim())
                        if (!hasOpts) return (
                          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Correct Answer: {editItem.correctAnswer}</div>
                        )
                        return (
                          <>
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-gray-700">Answer Options</label>
                              <div className="space-y-2">
                                {opts.map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx)
                                  if (!String(opt || '').trim()) return null
                                  const isCorrect = editItem.correctAnswer === letter
                                  return (
                                    <div key={idx} className={`rounded-lg border-2 p-3 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                      <div className="flex items-start gap-2">
                                        <div className="flex flex-shrink-0 items-center gap-1">
                                          <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>{letter}.</span>
                                          {isCorrect && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Correct</span>}
                                        </div>
                                        <div className="flex-1 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderContent(String(opt || ''))}</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Correct Answer: {editItem.correctAnswer}</div>
                          </>
                        )
                      })()}
                      {editItem.shortExplanation && (
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">Short Explanation</label>
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">{renderContent(editItem.shortExplanation)}</div>
                        </div>
                      )}
                      {editItem.longExplanation && (
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">Long Explanation</label>
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-gray-700">{renderContent(editItem.longExplanation)}</div>
                        </div>
                      )}
                      {!editItem.shortExplanation && !editItem.longExplanation && editItem.explanation && (
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">Explanation</label>
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">{renderContent(editItem.explanation)}</div>
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => setModalEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><FiEdit /> Edit this question</button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
                {bulkIds ? (
                  <div className="p-4 border-t border-slate-100 flex flex-shrink-0 items-center justify-between gap-2">
                    <button disabled={bulkIndex === 0} onClick={() => bulkGoto(bulkIndex - 1)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">← Previous</button>
                    <span className="text-sm font-medium text-slate-500">Question {bulkIndex + 1} of {bulkIds.length}</span>
                    <div className="flex gap-2">
                      <button onClick={finishBulk} className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors">Save All &amp; Close</button>
                      {bulkIndex < bulkIds.length - 1 && (
                        <button onClick={() => bulkGoto(bulkIndex + 1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Next →</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-slate-100 text-right flex flex-shrink-0 gap-2 justify-end">
                    <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setEditItem(null)}>Cancel</button>
                    <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" onClick={saveEdit}>Save</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <TablePasteModal open={!!tableInsertFn} onClose={() => setTableInsertFn(null)} onInsert={(md) => { if (tableInsertFn) tableInsertFn(md) }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {!isTutor ? (
              <>
                <button
                  type="button"
                  onClick={() => router.replace('/admin/sat-question-upload')}
                  className="inline-flex items-center text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <FiArrowLeft className="mr-2" />
                  <span>Back to SAT Question Management</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/admin-tests/question-bank/upload?subject=Math')}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FiUpload className="mr-2" />
                    Upload Math
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/admin-tests/question-bank/upload?subject=Reading and Writing')}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FiUpload className="mr-2" />
                    Upload R&W
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/flagged-questions')}
                    className="inline-flex items-center px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
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
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center transition-colors"
                >
                  <FiUpload className="mr-2" />
                  Upload Math
                </button>
                <button
                  onClick={() => router.push('/admin/tutor/question-bank/upload?isTutor=true&subject=Reading and Writing')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center transition-colors"
                >
                  <FiUpload className="mr-2" />
                  Upload R&W
                </button>
              </div>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2">{isTutor ? 'Tutor Databases' : 'Question Bank Management'}</h1>
          <div className="text-slate-500 text-sm">{loading ? 'Loading...' : `${questionBanks.length} ${isTutor ? 'Databases' : 'Question Banks'}`}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="bank-search" className="block text-sm font-semibold text-slate-600 mb-2">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="bank-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Search question banks..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Question Banks ({filteredBanks.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Active</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Draft</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBanks.map(bank => (
                  <tr key={bank.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{bank.title}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.questionBankType === 'Mathematics' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'}`}>
                        {bank.questionBankType || 'Reading and Writing'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{bank.totalQuestions}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{bank.activeQuestions}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{bank.draftQuestions}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{bank.status}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center px-3 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors" onClick={() => setBankAndView(bank)}>
                          <FiEye className="mr-1" /> View
                        </button>
                        {isTutor && (
                          <button
                            className="inline-flex items-center px-3 py-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            onClick={() => router.push(`/admin/tutor/question-bank/upload?isTutor=true&subject=${bank.title.includes('Math') ? 'Math' : 'Reading and Writing'}`)}
                          >
                            <FiUpload className="mr-1" /> Upload
                          </button>
                        )}
                        {!isTutor && (
                          <>
                            <button className="inline-flex items-center px-3 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => openAccessModal(bank)}>
                              <FiSettings className="mr-1" /> Manage Access
                            </button>
                            <button className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" onClick={() => deleteQuestionBank(bank.id)}>
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
                    <td colSpan={8} className="px-6 py-12">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                          <span className="text-sm">Loading question banks...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <FiSearch className="h-10 w-10 text-slate-300" />
                          <h3 className="text-sm font-semibold text-slate-700">No question banks found</h3>
                          <p className="text-sm text-slate-400">{search ? 'Try a different search term.' : 'No question banks are available yet.'}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access Management Modal */}
        {showAccessModal && selectedBankForAccess && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAccessModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Manage Access - {selectedBankForAccess.title}</h3>
                <button aria-label="Close access dialog" className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => setShowAccessModal(false)}>
                  <FiX size={24} />
                </button>
              </div>

              <div className="p-6">
                {/* Grant Access Section */}
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <FiUserPlus className="mr-2 text-emerald-600" />
                    Grant Access to User
                  </h4>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label htmlFor="access-user-select" className="block text-sm font-medium text-slate-600 mb-2">Select User</label>
                      <select
                        id="access-user-select"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center transition-colors"
                    >
                      <FiUserPlus className="mr-2" />
                      Grant Access
                    </button>
                  </div>
                </div>

                {/* Current Access List */}
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <FiEye className="mr-2 text-indigo-600" />
                    Users with Access ({bankAccess.length})
                  </h4>

                  {accessLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                      <span className="text-sm">Loading access list...</span>
                    </div>
                  ) : bankAccess.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <FiUsers className="h-10 w-10 text-slate-300" />
                      <h3 className="text-sm font-semibold text-slate-700">No access granted yet</h3>
                      <p className="text-sm text-slate-400">No users have access to this question bank yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Access Type</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Granted Date</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bankAccess.map(access => (
                            <tr key={access.userId} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                {access.userName || 'Unknown User'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                                {access.userEmail || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  access.userRole === 'Admin' ? 'bg-rose-50 text-rose-700' :
                                  access.userRole === 'Tutor' ? 'bg-blue-50 text-blue-700' :
                                  'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {access.userRole || 'Student'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  access.accessType === 'stripe' ? 'bg-violet-50 text-violet-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>
                                  {access.accessType === 'stripe' ? 'Stripe Payment' : 'Admin Granted'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                                {access.grantedAt ? new Date(access.grantedAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                {access.accessType !== 'stripe' && (
                                  <button
                                    onClick={() => revokeAccess(access.userId)}
                                    className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <FiUserMinus className="mr-1" />
                                    Revoke
                                  </button>
                                )}
                                {access.accessType === 'stripe' && (
                                  <span className="text-xs text-slate-500">Paid Access</span>
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

              <div className="p-6 border-t border-slate-100 bg-slate-50 text-right">
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-white transition-colors"
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

