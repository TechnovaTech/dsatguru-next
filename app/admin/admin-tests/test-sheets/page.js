'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
// Maps an answer (letter, "B) 240"-style key, or option text — any casing) to its option letter.
import { resolveAnswerLetter } from '../../../../lib/scoring/satScale'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus, FiCheck, FiAlertCircle, FiClipboard, FiUpload, FiGrid } from 'react-icons/fi'
import TablePasteModal from '../../../components/admin/TablePasteModal'
import { useConfirm } from '../../../components/ui/UIProvider'
import { EditTestJsonModal, DownloadTestJsonButton } from '../../../components/admin/TestJsonTools'

export default function AdminTestSheets() {
  const confirm = useConfirm()
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all') // all, timed, untimed
  
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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [tableInsertFn, setTableInsertFn] = useState(null)

  // Assign test to student modal
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false)
  const [assignToStudentTest, setAssignToStudentTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [studentAssignedTests, setStudentAssignedTests] = useState({}) // studentId -> [testIds]
  const [studentSearch, setStudentSearch] = useState('')
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/admin-tests/list', {
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

  const handleOpenAssignToStudentModal = async (test) => {
    setAssignToStudentTest(test)
    setShowAssignToStudentModal(true)
    setLoadingAllStudents(true)
    setStudentSearch('')
    setAssignShowExplanation(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        const map = {}
        await Promise.all(students.map(async (s) => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (r.ok) {
              const d = await r.json()
              map[s._id] = d.assignedTests || []
            }
          } catch {}
        }))
        setStudentAssignedTests(map)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAllStudents(false)
    }
  }

  const handleToggleTestForStudent = async (studentId, testId) => {
    const token = localStorage.getItem('token')
    const current = studentAssignedTests[studentId] || []
    const isAssigned = current.map(id => id.toString()).includes(testId)
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: assignShowExplanation })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests(prev => ({ ...prev, [studentId]: data.assignedTests }))
        setSuccess(isAssigned ? 'Test unassigned from student' : 'Test assigned to student')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to update assignment')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!(await confirm({ message: 'Are you sure you want to delete this test?', tone: 'danger', confirmText: 'Delete' }))) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/admin-tests/list?id=${testId}`, {
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

  const persistCustomQuestions = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/admin-tests/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ testId: viewingTest._id, customQuestions: editedQuestionsData })
    })
    return res.ok
  }

  // Per-question save persists immediately (no need to also click "Save Changes").
  const handleSaveQuestion = async () => {
    setSavingTest(true)
    try {
      if (await persistCustomQuestions()) { setEditingQuestionId(null); setSuccess('Question saved'); setTimeout(() => setSuccess(''), 2000) }
      else setError('Failed to save question')
    } catch (err) { setError('Failed to save question'); console.error(err) } finally { setSavingTest(false) }
  }

  // Remove an uploaded image's markdown from a field/option value.
  const stripImageMarkdown = (text, src) => {
    if (!text) return text
    const esc = String(src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return String(text).replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const removeImageFromField = (qId, field, current, src) => handleQuestionFieldChange(qId, field, stripImageMarkdown(current, src))
  const removeImageFromOption = (qId, key, current, src) => handleOptionChange(qId, key, stripImageMarkdown(current, src))

  const ImagePreview = ({ text, onRemove }) => {
    if (!text) return null
    const regex = /!\[(.*?)\]\((.*?)\)/g; const images = []; let m
    while ((m = regex.exec(text)) !== null) images.push({ alt: m[1], src: m[2] })
    if (!images.length) return null
    return <div className="mt-2 rounded border border-dashed border-slate-200 bg-slate-50 p-2"><div className="flex flex-wrap gap-2">{images.map((img, i) => <div key={i} className="relative"><img src={img.src} alt={img.alt} className="h-16 w-auto rounded border bg-white object-contain" />{onRemove && <button type="button" onClick={() => onRemove(img.src)} title="Remove image" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow hover:bg-red-700">×</button>}</div>)}</div></div>
  }

  const handleSaveTestEdits = async () => {
    setSavingTest(true)
    try {
      if (await persistCustomQuestions()) {
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

  const handleQuestionFieldChange = (questionId, field, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...currentEdited, [field]: value } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, [field]: value } : q))
  }

  const handleOptionChange = (questionId, optionKey, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    let currentOptions = (() => { try { return typeof currentEdited.options === 'string' ? JSON.parse(currentEdited.options) : (currentEdited.options || {}) } catch(e) { return {} } })()
    if (Array.isArray(currentOptions)) {
      currentOptions = { A: currentOptions[0] || '', B: currentOptions[1] || '', C: currentOptions[2] || '', D: currentOptions[3] || '' }
    }
    const newOptions = { ...currentOptions, [optionKey]: value }
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...currentEdited, options: newOptions } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, options: newOptions } : q))
  }

  // Pick + upload an image and insert the markdown into a field (edit modal).
  const uploadQuestionImage = (onInsert) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files && input.files[0]
      if (!file) return
      setUploadingImage(true)
      try {
        const token = localStorage.getItem('token')
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload-image', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
        const data = await res.json()
        if (res.ok && data.url) onInsert(`![image](${data.url})`)
        else alert(data.error || 'Image upload failed')
      } catch (e) { alert('Image upload failed') } finally { setUploadingImage(false) }
    }
    input.click()
  }
  const appendImageToField = (qId, field, current) =>
    uploadQuestionImage((md) => handleQuestionFieldChange(qId, field, current ? `${current}\n${md}` : md))
  const appendImageToOption = (qId, key, current) =>
    uploadQuestionImage((md) => handleOptionChange(qId, key, current ? `${current}\n${md}` : md))
  const openTableModal = (onInsert) => setTableInsertFn(() => onInsert)
  const appendTableToField = (qId, field, current) =>
    openTableModal((md) => handleQuestionFieldChange(qId, field, current ? `${current}\n${md}` : md))
  const appendTableToOption = (qId, key, current) =>
    openTableModal((md) => handleOptionChange(qId, key, current ? `${current}\n${md}` : md))

  const filteredTests = tests.filter(test => {
    if (test.isReassigned) return false
    if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Admin Test Sheets</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage all custom Admin tests</p>
          </div>
          <button onClick={() => router.push('/admin/admin-tests/create-test')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            <FiEdit /> Create New Test
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 p-4 text-rose-700">
            <FiX /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
            <FiCheck /> {success}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <label htmlFor="test-search" className="sr-only">Search test titles</label>
            <input id="test-search" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search test titles..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="test-filter-mode" className="sr-only">Filter by mode</label>
            <select id="test-filter-mode" value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Modes</option>
              <option value="timed">Timed Only</option>
              <option value="untimed">Untimed Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Title</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Questions</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Created At</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                      <p className="mt-3 text-sm text-slate-500">Loading tests...</p>
                    </div>
                  </td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiClipboard size={22} /></div>
                    <h3 className="text-base font-semibold text-slate-600">No tests found</h3>
                    <p className="mt-1 text-sm text-slate-400">Create a new test to get started.</p>
                  </td></tr>
                ) : (
                  filteredTests.map((test) => (
                    <tr key={test._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{test.title}</td>
                      <td className="px-6 py-4 text-sm">
                        {test.isTimed ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><FiClock /> {test.duration}m</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Untimed</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{test.questions?.length || 0} Qs</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => handleViewTest(test)} className="rounded p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50" title="View"><FiEye /></button>
                          <button onClick={() => handleEditTest(test)} className="rounded p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50" title="Edit"><FiEdit /></button>
                          <DownloadTestJsonButton test={test} label="" className="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-100" />
                          <EditTestJsonModal test={test} updateUrl="/api/admin/admin-tests/update" onSaved={fetchTests} label="" className="rounded p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50" />
                          <button onClick={() => handleOpenAssignToStudentModal(test)} className="rounded p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50" title="Assign"><FiUserPlus /></button>
                          <button onClick={() => handleDeleteTest(test._id)} className="rounded p-1.5 text-rose-600 transition-colors hover:bg-rose-50" title="Delete"><FiTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View/Edit Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{isEditMode ? 'Edit Test' : viewingTest.title}</h3>
                  <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <button onClick={handleSaveTestEdits} disabled={savingTest} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                      <FiSave /> {savingTest ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                  <button onClick={() => setShowViewModal(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><FiX size={20} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading questions...</p>
                  </div>
                ) : (
                  (() => {
                    const q = testQuestions[currentQuestionIndex]
                    if (!q) return null
                    const isEditing = isEditMode && editingQuestionId === (q.id || q._id)
                    let options = null
                    try {
                      const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                      if (Array.isArray(_raw)) {
                        options = { A: _raw[0] || '', B: _raw[1] || '', C: _raw[2] || '', D: _raw[3] || '' }
                      } else if (_raw && typeof _raw === 'object') {
                        options = _raw
                      }
                    } catch(e) {}
                    if (!options && (q.optionA || q.optionB || q.optionC || q.optionD)) {
                      options = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' }
                    }
                    return (
                      <div className="mx-auto max-w-4xl space-y-6">
                        <div className="flex justify-end">
                          {isEditMode && (
                            isEditing
                              ? <button onClick={handleSaveQuestion} disabled={savingTest} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">{savingTest ? 'Saving...' : 'Save Question'}</button>
                              : <button onClick={() => setEditingQuestionId(q.id || q._id)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">Edit Question</button>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                          <div>
                            <span className="text-xs font-semibold uppercase text-slate-500">Difficulty</span>
                            <p className={`mt-1 font-bold ${q.difficulty === 'Easy' ? 'text-emerald-600' : q.difficulty === 'Medium' ? 'text-amber-600' : 'text-rose-600'}`}>{q.difficulty}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase text-slate-500">Subject</span>
                            <p className="mt-1 font-medium text-slate-900">{q.subject}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase text-slate-500">Question ID</span>
                            <p className="mt-1 font-mono text-xs text-slate-900">{q.questionId || (q.id || q._id || '').toString().slice(-8)}</p>
                          </div>
                        </div>

                        {/* Context Paragraph */}
                        {q.questionParagraph && (
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                            <span className="text-xs font-semibold uppercase text-indigo-700">Context Paragraph</span>
                            <div className="mt-2 text-sm text-slate-700">{renderWithImages(q.questionParagraph)}</div>
                          </div>
                        )}

                        {/* Question Content */}
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Question</span>
                          {isEditing
                            ? <><textarea aria-label="Question content" className="w-full rounded-lg border border-slate-300 p-3 font-mono outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={6} value={q.content} onChange={e => handleQuestionFieldChange(q.id || q._id, 'content', e.target.value)} /><ImagePreview text={q.content || ''} onRemove={(src) => removeImageFromField(q.id || q._id, 'content', q.content || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(q.id || q._id, 'content', q.content || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(q.id || q._id, 'content', q.content || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                            : <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900">{renderWithImages(q.content)}</div>
                          }
                        </div>

                        {/* Options or Fill-in-blank */}
                        {(() => {
                          const optKeys = ['A','B','C','D'].filter(k => options && (options[k] || options[k.toLowerCase()]))
                          if (optKeys.length > 0) {
                            return (
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-slate-700">Answer Options</span>
                                {optKeys.map(key => {
                                  const optText = options[key] || options[key.toLowerCase()] || ''
                                  const isCorrect = resolveAnswerLetter(q.correctAnswer, q) === key
                                  return (
                                    <div key={key} className={`rounded-lg border-2 p-3 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>{key}.</span>
                                        {isCorrect ? (
                                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Correct Answer</span>
                                        ) : (isEditing && (
                                          <button type="button" onClick={() => handleQuestionFieldChange(q.id || q._id, 'correctAnswer', key)} className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100" title="Mark this option as the correct answer">Set correct</button>
                                        ))}
                                      </div>
                                      {isEditing
                                        ? <><textarea aria-label={`Option ${key}`} className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={2} value={optText} onChange={e => handleOptionChange(q.id || q._id, key, e.target.value)} /><ImagePreview text={optText} onRemove={(src) => removeImageFromOption(q.id || q._id, key, optText, src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToOption(q.id || q._id, key, optText)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToOption(q.id || q._id, key, optText)} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                                        : <div className="text-sm text-slate-700 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderWithImages(optText)}</div>
                                      }
                                    </div>
                                  )
                                })}
                                {isEditing && (
                                  <div className="mt-2">
                                    <label htmlFor="correct-answer-select" className="text-sm font-semibold text-slate-700">Correct Answer</label>
                                    <select id="correct-answer-select" value={q.correctAnswer || ''} onChange={e => handleQuestionFieldChange(q.id || q._id, 'correctAnswer', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                      <option value="C">C</option>
                                      <option value="D">D</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4">
                              <span className="text-xs font-semibold uppercase text-emerald-700">Correct Answer (Fill-in-the-Blank)</span>
                              {isEditing
                                ? <input type="text" aria-label="Correct answer" value={q.correctAnswer || ''} onChange={e => handleQuestionFieldChange(q.id || q._id, 'correctAnswer', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="Enter correct answer..." />
                                : <p className="mt-1 text-lg font-bold text-emerald-900">{q.correctAnswer}</p>
                              }
                            </div>
                          )
                        })()}

                        {/* Explanations */}
                        <div className="space-y-3">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <span className="text-xs font-semibold uppercase text-amber-700">Short Explanation</span>
                            {isEditing
                              ? <><textarea aria-label="Short explanation" className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={3} value={q.shortExplanation || ''} onChange={e => handleQuestionFieldChange(q.id || q._id, 'shortExplanation', e.target.value)} placeholder="Add short explanation..." /><ImagePreview text={q.shortExplanation || ''} onRemove={(src) => removeImageFromField(q.id || q._id, 'shortExplanation', q.shortExplanation || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(q.id || q._id, 'shortExplanation', q.shortExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(q.id || q._id, 'shortExplanation', q.shortExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                              : <div className="mt-2 min-h-[24px] text-sm text-slate-700">{q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="italic text-slate-400">No short explanation added</span>}</div>
                            }
                          </div>
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                            <span className="text-xs font-semibold uppercase text-indigo-700">Long Explanation</span>
                            {isEditing
                              ? <><textarea aria-label="Long explanation" className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={5} value={q.longExplanation || ''} onChange={e => handleQuestionFieldChange(q.id || q._id, 'longExplanation', e.target.value)} placeholder="Add long explanation..." /><ImagePreview text={q.longExplanation || ''} onRemove={(src) => removeImageFromField(q.id || q._id, 'longExplanation', q.longExplanation || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(q.id || q._id, 'longExplanation', q.longExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(q.id || q._id, 'longExplanation', q.longExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                              : <div className="mt-2 min-h-[24px] text-sm text-slate-700">{q.longExplanation ? renderWithImages(q.longExplanation) : <span className="italic text-slate-400">No long explanation added</span>}</div>
                            }
                          </div>
                          {q.explanation && !q.shortExplanation && !q.longExplanation && !isEditing && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <span className="text-xs font-semibold uppercase text-slate-700">Explanation</span>
                              <div className="mt-2 text-sm text-slate-700">{renderWithImages(q.explanation)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
              <div className="flex justify-between border-t border-slate-100 bg-slate-50 p-4">
                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"><FiArrowLeft /> Previous</button>
                <button disabled={currentQuestionIndex === testQuestions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">Next <FiArrowLeft className="rotate-180" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Student Modal */}
        {showAssignToStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-900">Assign "{assignToStudentTest.title}" to Students</h3>
                <button onClick={() => setShowAssignToStudentModal(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><FiX size={20} /></button>
              </div>
              <div className="flex gap-3 border-b border-slate-100 bg-white p-4">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <label htmlFor="assign-student-search" className="sr-only">Search students</label>
                  <input id="assign-student-search" type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={assignShowExplanation} onChange={e => setAssignShowExplanation(e.target.checked)} className="accent-indigo-600" />
                  Show Explanations
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading students...</p>
                  </div>
                ) : (
                  (() => {
                    const visibleStudents = allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                    if (visibleStudents.length === 0) {
                      return (
                        <div className="py-12 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUserPlus size={22} /></div>
                          <p className="text-sm font-medium text-slate-500">No students found.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-2">
                        {visibleStudents.map(student => {
                          const isAssigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id)
                          return (
                            <div key={student._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-indigo-50/40">
                              <div>
                                <p className="font-medium text-slate-900">{student.name}</p>
                                <p className="text-xs text-slate-400">{student.email}</p>
                              </div>
                              <button onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${isAssigned ? 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {isAssigned ? 'Unassign' : 'Assign'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <TablePasteModal open={!!tableInsertFn} onClose={() => setTableInsertFn(null)} onInsert={(md) => { if (tableInsertFn) tableInsertFn(md) }} />
    </div>
  )
}
