'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FiUpload, FiFile, FiCheck, FiX, FiDownload, FiPlus, FiSearch, FiEdit, FiImage, FiArrowLeft } from 'react-icons/fi'
import BulkQuestionPreview from './BulkQuestionPreview'

export default function SATQuestionUpload({ isTutor: propIsTutor = false, managePath = '/admin/question-bank' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isTutor = propIsTutor || searchParams?.get('isTutor') === 'true'
  const urlSubject = searchParams?.get('subject')
  const [view, setView] = useState('landing')
  const initialModeParam = searchParams?.get('mode')
  const initialMode = initialModeParam === 'single' ? 'single' : initialModeParam === 'bulk' ? 'bulk' : null
  const [uploadType, setUploadType] = useState(initialMode || 'bulk')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [questionBanks, setQuestionBanks] = useState([])
  const [selectedQuestionBank, setSelectedQuestionBank] = useState('')
  const [singleQuestion, setSingleQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
    shortExplanation: '',
    longExplanation: '',
    difficulty: 'Medium',
    subject: urlSubject || 'Math',
    questionType: 'single',
    passageText: '',
    questionImage: null,
    mathTopic: '',
    mathSubtopic: '',
    readingWritingTopic: '',
    title: '',
    questionParagraph: '',
    tags: ''
  })
  const [bulkUpload, setBulkUpload] = useState({ csvRecords: [], images: [], imagePreviews: [], mapping: null, progress: 0 })
  const [previewQuestions, setPreviewQuestions] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
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
    if (initialMode) {
      setView('forms')
    }
    if (urlSubject === 'Math') setSelectedQuestionBank('MATH_DIRECT')
    else if (urlSubject === 'Reading and Writing') setSelectedQuestionBank('RW_DIRECT')

    fetchUploadHistory()
    fetchQuestionBanks()
  }, [])

  const fetchUploadHistory = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/admin/question-uploads', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (response.ok) {
        const data = await response.json()
        setUploadHistory(data)
      }
    } catch (error) {
      console.error('Error fetching upload history:', error)
    }
  }

  const fetchQuestionBanks = async () => {
    if (isTutor) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/admin/question-banks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        const mapped = Array.isArray(data)
          ? data.map(b => ({ _id: b._id, name: b.title }))
          : Array.isArray(data?.courses)
            ? data.courses.map(c => ({ _id: c.id, name: c.title }))
            : []
        
        const staticOptions = [
          { _id: 'MATH_DIRECT', name: 'Direct Upload - Math' },
          { _id: 'RW_DIRECT', name: 'Direct Upload - Reading & Writing' }
        ]
        setQuestionBanks([...staticOptions, ...mapped])
      }
    } catch (error) {
      console.error('Error fetching question banks:', error)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!file || (!isTutor && !selectedQuestionBank)) return

    setUploading(true)
    setBulkUpload(prev => ({ ...prev, progress: 10 }))
    const formData = new FormData()
    formData.append('file', file)
    
    if (!isTutor) {
      if (selectedQuestionBank === 'MATH_DIRECT' || selectedQuestionBank === 'RW_DIRECT') {
        const subject = selectedQuestionBank === 'MATH_DIRECT' ? 'Math' : 'Reading and Writing'
        formData.append('defaultSubject', subject)
      }
    }
    
    if (isTutor) formData.append('defaultSubject', singleQuestion.subject)
    ;(bulkUpload.images || []).forEach(img => formData.append('images', img))
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    let progressInterval = null
    progressInterval = setInterval(() => {
      setBulkUpload(prev => ({ ...prev, progress: Math.min(prev.progress + 10, 85) }))
    }, 200)

    try {
      const response = await fetch('/api/admin/questions/bulk-preview', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setPreviewQuestions(result.questions)
        setShowPreview(true)
        setBulkUpload(prev => ({ ...prev, progress: 100 }))
      } else {
        const error = await response.json()
        console.error('Preview error response:', JSON.stringify(error, null, 2))
        alert(`Preview failed: ${error.error || error.message || 'Unknown error'}\n${error.details || ''}`)
      }
    } catch (error) {
      console.error('Preview error:', error.message || error)
      alert(`Preview failed: ${error.message || 'Network error'}`)
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setUploading(false)
      setTimeout(() => setBulkUpload(prev => ({ ...prev, progress: 0 })), 600)
    }
  }

  const handleApproveQuestions = async (questions) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/admin/questions/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questions,
          questionBankId: (isTutor || selectedQuestionBank === 'MATH_DIRECT' || selectedQuestionBank === 'RW_DIRECT') ? null : selectedQuestionBank,
          isTutor
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully saved ${result.count} questions to database`)
        setShowPreview(false)
        setPreviewQuestions(null)
        setFile(null)
        fetchUploadHistory()
        setBulkUpload({ csvRecords: [], images: [], imagePreviews: [], mapping: null, progress: 0 })
      } else {
        const error = await response.json()
        alert(`Failed to save questions: ${error.error || error.message}`)
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert(`Failed to save questions: ${error.message}`)
    }
  }

  const handleCancelPreview = () => {
    setShowPreview(false)
    setPreviewQuestions(null)
  }

  const handleSingleQuestionSubmit = async (e) => {
    e.preventDefault()
    if (!isTutor && !selectedQuestionBank) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const answerLetter = typeof singleQuestion.correctAnswer === 'number'
        ? (['A', 'B', 'C', 'D'][singleQuestion.correctAnswer] || 'A')
        : (String(singleQuestion.correctAnswer).toUpperCase() || 'A')
      const topicTags =
        singleQuestion.subject === 'Math'
          ? [singleQuestion.mathTopic, singleQuestion.mathSubtopic].filter(Boolean)
          : singleQuestion.subject === 'Reading and Writing'
          ? [singleQuestion.readingWritingTopic].filter(Boolean)
          : []
      const freeTags = (singleQuestion.tags || '').split(',').map(t => t.trim()).filter(Boolean)
      const tags = [...topicTags, ...freeTags]
      let content = ''
      if (singleQuestion.questionParagraph?.trim()) {
        content += singleQuestion.questionParagraph.trim() + '\n\n'
      }
      if (singleQuestion.questionType === 'passage-based' && singleQuestion.passageText?.trim()) {
        content += singleQuestion.passageText.trim() + '\n\n'
      }
      content += (singleQuestion.questionText || '').trim()
      const payload = {
        title: singleQuestion.title || '',
        content,
        explanation: singleQuestion.explanation,
        subject: singleQuestion.subject,
        difficulty: singleQuestion.difficulty,
        type: 'MultipleChoice',
        correctAnswer: answerLetter,
        options: singleQuestion.options,
        tags,
        questionBankId: (isTutor || selectedQuestionBank === 'MATH_DIRECT' || selectedQuestionBank === 'RW_DIRECT') ? null : selectedQuestionBank,
        isTutor,
        questionParagraph: singleQuestion.questionParagraph || ''
      }
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        alert('Question added successfully')
        setSingleQuestion({
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 'A',
          explanation: '',
          shortExplanation: '',
          longExplanation: '',
          difficulty: 'Medium',
          subject: 'Math',
          questionType: 'single',
          passageText: '',
          questionImage: null,
          mathTopic: '',
          mathSubtopic: '',
          readingWritingTopic: '',
          title: '',
          questionParagraph: '',
          tags: ''
        })
      }
    } catch (error) {
      console.error('Error adding question:', error)
      alert('Failed to add question')
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/questions/template')
      if (!res.ok) throw new Error('Failed to download template')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bulk_question_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Template download error:', err)
      alert('Failed to download template')
    }
  }

  const handleCSVFileChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result?.toString() || ''
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      const rows = []
      
      for (const line of lines) {
        const row = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"' && !inQuotes) {
            inQuotes = true
          } else if (char === '"' && inQuotes) {
            if (line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = false
            }
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        row.push(current.trim())
        if (row.some(cell => cell.length > 0)) {
          rows.push(row)
        }
      }
      if (rows.length === 0) {
        setBulkUpload(prev => ({ ...prev, csvRecords: [], mapping: null }))
        return
      }
      const header = rows[0].map(h => (h || '').trim().toLowerCase())
      const idxImage = header.findIndex(h => h === 'imagefilename')
      const idxTitle = header.findIndex(h => h === 'title')
      const idxContent = header.findIndex(h => h === 'content')
      const idxSubject = header.findIndex(h => h === 'subject')
      const idxDifficulty = header.findIndex(h => h === 'difficulty')
      const records = []
      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r]
        if (!cols || cols.length === 0) continue
        const imageName = (idxImage >= 0 ? (cols[idxImage] || '').trim() : '')
        const title = (idxTitle >= 0 ? (cols[idxTitle] || '').trim() : '')
        const content = (idxContent >= 0 ? (cols[idxContent] || '').trim() : '')
        const subject = (idxSubject >= 0 ? (cols[idxSubject] || '').trim() : '')
        const difficulty = (idxDifficulty >= 0 ? (cols[idxDifficulty] || '').trim() : '')
        
        // Create better preview label
        let labelSource = content || title
        if (labelSource && labelSource.length > 60) {
          labelSource = labelSource.slice(0, 57) + '...'
        }
        const subjectPrefix = subject ? `[${subject}] ` : ''
        const difficultyPrefix = difficulty ? `(${difficulty}) ` : ''
        const label = labelSource ? `${subjectPrefix}${difficultyPrefix}${labelSource}` : `Row ${r}`
        
        records.push({ row: r, imageFileName: imageName, label })
      }
      const mapping = computeImageMapping(records, bulkUpload.images)
      setBulkUpload(prev => ({ ...prev, csvRecords: records, mapping }))
    }
    reader.readAsText(f)
  }

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || [])
    const validImages = files.filter(f => f.type && f.type.startsWith('image/'))
    const previews = validImages.map(file => ({ file, url: URL.createObjectURL(file), name: file.name }))
    ;(bulkUpload.imagePreviews || []).forEach(p => { try { URL.revokeObjectURL(p.url) } catch {} })
    const mapping = computeImageMapping(bulkUpload.csvRecords, validImages)
    setBulkUpload(prev => ({ ...prev, images: validImages, imagePreviews: previews, mapping }))
  }

  const removeImageAt = (index) => {
    const prevPreviews = bulkUpload.imagePreviews || []
    const prevImages = bulkUpload.images || []
    const toRemove = prevPreviews[index]
    if (toRemove?.url) { try { URL.revokeObjectURL(toRemove.url) } catch {} }
    const newPreviews = prevPreviews.filter((_, i) => i !== index)
    const newImages = prevImages.filter((_, i) => i !== index)
    const mapping = computeImageMapping(bulkUpload.csvRecords, newImages)
    setBulkUpload(prev => ({ ...prev, images: newImages, imagePreviews: newPreviews, mapping }))
  }

  const computeImageMapping = (records, images) => {
    if (!records || records.length === 0) return null
    const fileMap = new Map()
    ;(images || []).forEach(f => {
      if (f && f.name) {
        fileMap.set((f.name || '').toLowerCase(), f.name)
      }
    })
    const entries = records
      .filter(rec => rec.imageFileName !== '')
      .map(rec => {
        const key = (rec.imageFileName || '').toLowerCase()
        const found = fileMap.get(key)
        return { csvRow: rec.row, csvImageName: rec.imageFileName, label: rec.label, foundImage: found || null, status: found ? 'matched' : 'missing' }
      })
    const totalWithImages = entries.length
    const matched = entries.filter(e => e.status === 'matched').length
    const missing = totalWithImages - matched
    return { entries, summary: { totalWithImages, matched, missing } }
  }

  const setModeAndView = (mode) => {
    setUploadType(mode)
    setView('forms')
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    params.set('mode', mode)
    if (isTutor) params.set('isTutor', 'true')
    if (singleQuestion.subject) params.set('subject', singleQuestion.subject)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const navigationCards = [
    {
      id: 'single',
      title: 'Single Question Upload',
      description: 'Upload individual SAT questions with detailed options and explanations',
      icon: FiPlus,
      action: () => setModeAndView('single'),
      color: 'blue',
      features: [
        'Individual question creation',
        'Rich text formatting',
        'Math and Reading/Writing topics',
        'Passage-based support',
        'Image upload'
      ]
    },
    {
      id: 'bulk',
      title: 'Bulk Upload',
      description: 'Upload multiple questions at once using CSV files with optional images',
      icon: FiUpload,
      action: () => setModeAndView('bulk'),
      color: 'green',
      features: [
        'CSV file upload',
        'Template download',
        'Upload progress',
        'Error validation',
        'Batch processing'
      ]
    },
    {
      id: 'manage',
      title: 'Manage Questions',
      description: 'View, edit, and delete existing questions from your question banks',
      icon: FiSearch,
      action: () => router.push(managePath),
      color: 'purple',
      features: [
        'Search and filter',
        'Edit questions',
        'Delete questions',
        'Pagination',
        'Question bank overview'
      ]
    }
  ]

  const getColorClasses = (color) => {
    const colorMap = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
      green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', button: 'bg-purple-600 hover:bg-purple-700' }
    }
    return colorMap[color] || colorMap.blue
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{isTutor ? 'Tutor Question Bank' : 'SAT Question Management'}</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isTutor ? 'Upload questions specifically for Tutor Mode. These will be kept separate from the main SAT question bank.' : 'Choose how you\'d like to work with SAT questions. Upload individual questions, bulk upload from CSV files, or manage your existing question library.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {navigationCards.map((card) => {
              // Hide "Manage Questions" card if in Tutor mode, since we have a dedicated page for that
              if (isTutor && card.id === 'manage') return null

              const Icon = card.icon
              const colors = getColorClasses(card.color)
              return (
                <div
                  key={card.id}
                  className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer`}
                  onClick={card.action}
                >
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${colors.bg} rounded-full mb-4`}>
                      <Icon className={`w-8 h-8 ${colors.icon}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                    <p className="text-gray-600">{card.description}</p>
                  </div>
                  <div className="space-y-2 mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Features:</h4>
                    {card.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <div className={`w-1.5 h-1.5 ${colors.button.split(' ')[0]} rounded-full mr-2`}></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <button
                    className={`w-full ${colors.button} text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center`}
                    onClick={(e) => { e.stopPropagation(); card.action() }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    Get Started
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Question Management Tips</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FiPlus className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Single Upload</h3>
                  <p className="text-sm text-gray-600">Perfect for creating detailed questions with rich formatting and immediate preview.</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FiUpload className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bulk Upload</h3>
                  <p className="text-sm text-gray-600">Ideal for importing large question sets from existing materials or databases.</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FiEdit className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Manage</h3>
                  <p className="text-sm text-gray-600">Organize, edit, and maintain your question library with powerful search and filtering.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showPreview && previewQuestions && (
        <BulkQuestionPreview
          questions={previewQuestions}
          onApprove={handleApproveQuestions}
          onCancel={handleCancelPreview}
          questionBankId={selectedQuestionBank}
          isTutor={isTutor}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => { setView('landing'); router.replace(pathname) }}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <FiArrowLeft className="mr-2" />
              <span>Back to {isTutor ? 'Tutor' : 'SAT'} Question Management</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {uploadType === 'bulk' ? 'Bulk Question Upload' : 'Single Question Upload'}
          </h1>
          <p className="text-gray-600">
            {uploadType === 'bulk'
              ? 'Upload multiple SAT questions at once using a CSV file with optional images'
              : 'Upload individual SAT questions with detailed options and explanations'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Question Bank</h2>
            {!isTutor ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Choose Destination Bank
                  </label>
                  <select
                    value={selectedQuestionBank}
                    onChange={(e) => setSelectedQuestionBank(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select a question bank...</option>
                    {questionBanks.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 border border-blue-200 rounded-md">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Tutor Question Bank</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Subject Database
                    </label>
                    <div className="flex space-x-4">
                      <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${singleQuestion.subject === 'Math' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                        <input
                          type="radio"
                          name="tutorSubject"
                          value="Math"
                          checked={singleQuestion.subject === 'Math'}
                          onChange={(e) => setSingleQuestion(prev => ({ ...prev, subject: e.target.value }))}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">Math</span>
                      </label>
                      <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${singleQuestion.subject === 'Reading and Writing' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                        <input
                          type="radio"
                          name="tutorSubject"
                          value="Reading and Writing"
                          checked={singleQuestion.subject === 'Reading and Writing'}
                          onChange={(e) => setSingleQuestion(prev => ({ ...prev, subject: e.target.value }))}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">Reading & Writing</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Questions will be saved to the <strong>{singleQuestion.subject}</strong> section of the Tutor Question Bank.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-6">

            {uploadType === 'bulk' ? (
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start">
                    <FiDownload className="text-blue-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 mb-1">Download CSV Template</h3>
                      <p className="text-sm text-blue-600 mb-3">Use our template to ensure your CSV file has the correct format and required columns.</p>
                      <button type="button" onClick={downloadTemplate} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Download Template</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CSV/Excel File *</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">
                        <FiUpload className="mr-2" /> Upload CSV/Excel
                      </span>
                      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVFileChange} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">CSV or Excel files only. Maximum file size: 10MB</p>
                    {file && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
                        <FiFile />
                        {file.name}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images (required if placeholders used)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <input id="images-upload" type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                    <label htmlFor="images-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md"><FiImage className="mr-2" /> Upload Images</label>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Note:</strong> Images embedded directly inside Excel cells will be automatically extracted.
                      <br />If you prefer using <code>[filename.png]</code> placeholders, upload the matching files here.
                    </p>
                    {bulkUpload.images.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {bulkUpload.imagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img src={preview.url} alt={preview.name} className="w-full h-20 object-cover rounded-md border" />
                              <button
                                type="button"
                                onClick={() => removeImageAt(index)}
                                className="absolute top-1 right-1 bg-white/90 hover:bg-white text-red-600 hover:text-red-700 rounded-full p-1 shadow"
                                aria-label="Remove image"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-md truncate">
                                {preview.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {bulkUpload.csvRecords.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Preview</h3>
                    <p className="text-sm text-gray-600 mb-4">Found {bulkUpload.csvRecords.length} question(s) in your CSV file.</p>
                    {bulkUpload.mapping && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Image Mapping Summary:</h4>
                        <div className="bg-white rounded border p-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Total with Images:</span>
                              <span className="ml-2">{bulkUpload.mapping.summary.totalWithImages}</span>
                            </div>
                            <div className="text-green-600">
                              <span className="font-medium">Matched:</span>
                              <span className="ml-2">{bulkUpload.mapping.summary.matched}</span>
                            </div>
                            <div className="text-red-600">
                              <span className="font-medium">Missing:</span>
                              <span className="ml-2">{bulkUpload.mapping.summary.missing}</span>
                            </div>
                          </div>
                          {bulkUpload.mapping.summary.missing > 0 && (
                            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                              <p className="text-sm text-amber-800">Some questions reference images that were not found. These questions will be created without images.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="border rounded-md">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question Preview</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {bulkUpload.csvRecords.map((record, index) => {
                              const mappingEntry = bulkUpload.mapping?.entries.find(e => e.csvRow === record.row)
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{record.row}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate" title={record.label}>{record.label}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500">{record.imageFileName || '-'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {mappingEntry ? (
                                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${mappingEntry.status === 'matched' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {mappingEntry.status === 'matched' ? 'Matched' : 'Missing'}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">No image</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
                        Total: {bulkUpload.csvRecords.length} questions
                      </div>
                    </div>
                  </div>
                )}

                {bulkUpload.progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <FiUpload className="text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">Uploading Questions...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="h-2 bg-blue-600 rounded" style={{ width: `${bulkUpload.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={!file || (!isTutor && !selectedQuestionBank) || uploading} className="w-full bg-blue-600 text-white py-2 rounded-md">
                  {uploading ? 'Processing...' : 'Preview Questions'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSingleQuestionSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select
                      value={singleQuestion.subject}
                      onChange={(e) => {
                        const val = e.target.value
                        setSingleQuestion({ ...singleQuestion, subject: val, mathTopic: '', mathSubtopic: '', readingWritingTopic: '' })
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="Math">Math</option>
                      <option value="Reading and Writing">Reading and Writing</option>
                    </select>
                  </div>
                </div>

                {singleQuestion.subject === 'Math' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Math Topic</label>
                      <select
                        value={singleQuestion.mathTopic}
                        onChange={(e) => {
                          const v = e.target.value
                          setSingleQuestion({ ...singleQuestion, mathTopic: v, mathSubtopic: '' })
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select Math Topic</option>
                        {Object.entries(mathSubtopics).map(([key, topic]) => (
                          <option key={key} value={key}>{topic.label}</option>
                        ))}
                      </select>
                    </div>
                    {singleQuestion.mathTopic && Object.keys(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Math Subtopic</label>
                        <select
                          value={singleQuestion.mathSubtopic}
                          onChange={(e) => setSingleQuestion({ ...singleQuestion, mathSubtopic: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select Math Subtopic</option>
                          {Object.entries(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).map(([key, sub]) => (
                            <option key={key} value={key}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {singleQuestion.subject === 'Reading and Writing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                      <select
                        value={singleQuestion.readingWritingTopic}
                        onChange={(e) => setSingleQuestion({ ...singleQuestion, readingWritingTopic: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select Topic</option>
                        {Object.entries(readingWritingTopics).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty *</label>
                    <select
                      value={singleQuestion.difficulty}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, difficulty: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
                    <select
                      value={singleQuestion.questionType}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, questionType: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="single">Single Question</option>
                      <option value="passage-based">Passage-based</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Title (Optional)</label>
                  <input
                    type="text"
                    value={singleQuestion.title}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                {singleQuestion.questionType === 'passage-based' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passage Text *</label>
                    <textarea
                      value={singleQuestion.passageText}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, passageText: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={6}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Paragraph (Optional)</label>
                  <textarea
                    value={singleQuestion.questionParagraph}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, questionParagraph: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea
                    value={singleQuestion.questionText}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, questionText: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Image (optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setSingleQuestion({ ...singleQuestion, questionImage: e.target.files?.[0] || null })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {singleQuestion.options.map((option, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option {String.fromCharCode(65 + index)}</label>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...singleQuestion.options]
                          newOptions[index] = e.target.value
                          setSingleQuestion({ ...singleQuestion, options: newOptions })
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select
                      value={singleQuestion.correctAnswer}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, correctAnswer: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={singleQuestion.tags}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, tags: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                  <textarea
                    value={singleQuestion.explanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, explanation: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Explanation</label>
                  <textarea
                    value={singleQuestion.shortExplanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, shortExplanation: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Explanation</label>
                  <textarea
                    value={singleQuestion.longExplanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, longExplanation: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={4}
                  />
                </div>

                <button type="submit" disabled={!isTutor && !selectedQuestionBank} className="w-full bg-blue-600 text-white py-2 rounded-md">Add Question</button>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mt-6">
          <div className="p-6 border-b"><h2 className="text-xl font-semibold">Upload History</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {uploadHistory.map((upload, index) => (
                  <tr key={upload.id || upload._id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(upload.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{upload.fileName || upload.title || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{upload.questionCount || 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${upload.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {upload.status === 'success' ? <FiCheck className="inline mr-1" /> : <FiX className="inline mr-1" />}
                        {upload.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
