'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus, FiUsers, FiPlus, FiUpload, FiGrid } from 'react-icons/fi'
import TablePasteModal from '../../../components/admin/TablePasteModal'
import { useConfirm } from '../../../components/ui/UIProvider'
import { EditTestJsonModal, DownloadTestJsonButton } from '../../../components/admin/TestJsonTools'

export default function ModuleTestSheets() {
  const confirm = useConfirm()
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')

  // View/Edit modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentModuleTab, setCurrentModuleTab] = useState(0)
  const [moduleQuestionsMap, setModuleQuestionsMap] = useState({}) // {moduleIdx: questions[]}
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [tableInsertFn, setTableInsertFn] = useState(null)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [editedQuestionsData, setEditedQuestionsData] = useState({})
  const [savingTest, setSavingTest] = useState(false)

  // Assign to student modal
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false)
  const [assignToStudentTest, setAssignToStudentTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [studentAssignedTests, setStudentAssignedTests] = useState({})
  const [studentSearch, setStudentSearch] = useState('')
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  // Assign to tutor modal
  const [showAssignToTutorModal, setShowAssignToTutorModal] = useState(false)
  const [assignToTutorTest, setAssignToTutorTest] = useState(null)
  const [allTutors, setAllTutors] = useState([])
  const [loadingAllTutors, setLoadingAllTutors] = useState(false)
  const [tutorSearch, setTutorSearch] = useState('')
  const [assignedTutorsMap, setAssignedTutorsMap] = useState({}) // testId -> tutorIds[]

  useEffect(() => { fetchTests() }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/list', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setTests(data)
        // Initialize assignedTutorsMap
        const map = {}
        data.forEach(t => { map[t._id] = (t.assignedTutors || []).map(id => id.toString()) })
        setAssignedTutorsMap(map)
      }
      else setError('Failed to load tests')
    } catch { setError('Failed to load tests') } finally { setLoading(false) }
  }

  const handleOpenAssignToTutorModal = async (test) => {
    setAssignToTutorTest(test)
    setShowAssignToTutorModal(true)
    setLoadingAllTutors(true)
    setTutorSearch('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Tutor', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setAllTutors(await res.json())
    } finally { setLoadingAllTutors(false) }
  }

  const handleToggleTutorAssignment = async (tutorId, testId) => {
    const token = localStorage.getItem('token')
    const currentAssigned = assignedTutorsMap[testId] || []
    const isAssigned = currentAssigned.includes(tutorId.toString())
    
    try {
      const res = await fetch('/api/admin/tutor/module-tests/assign-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tutorId, testId, action: isAssigned ? 'remove' : 'add' })
      })
      if (res.ok) {
        const data = await res.json()
        setAssignedTutorsMap(prev => ({ ...prev, [testId]: data.assignedTutors.map(id => id.toString()) }))
        setSuccess(isAssigned ? 'Tutor access removed' : 'Tutor access granted')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { setError('Failed to update tutor assignment'); setTimeout(() => setError(''), 3000) }
  }

  const handleOpenAssignToStudentModal = async (test) => {
    setAssignToStudentTest(test)
    setShowAssignToStudentModal(true)
    setLoadingAllStudents(true)
    setStudentSearch('')
    setAssignShowExplanation(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        const map = {}
        await Promise.all(students.map(async s => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, { headers: { Authorization: `Bearer ${token}` } })
            if (r.ok) { const d = await r.json(); map[s._id] = d.assignedTests || [] }
          } catch {}
        }))
        setStudentAssignedTests(map)
      }
    } finally { setLoadingAllStudents(false) }
  }

  const handleToggleTestForStudent = async (studentId, testId) => {
    const token = localStorage.getItem('token')
    const isAssigned = (studentAssignedTests[studentId] || []).map(id => id.toString()).includes(testId)
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: assignShowExplanation })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests(prev => ({ ...prev, [studentId]: data.assignedTests }))
        setSuccess(isAssigned ? 'Test unassigned' : 'Test assigned')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { setError('Failed to update assignment'); setTimeout(() => setError(''), 3000) }
  }

  const handleDeleteTest = async (testId) => {
    if (!(await confirm({ message: 'Delete this test?', tone: 'danger', confirmText: 'Delete' }))) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/module-tests/list?id=${testId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { setSuccess('Test deleted'); fetchTests(); setTimeout(() => setSuccess(''), 3000) }
      else setError('Failed to delete test')
    } catch { setError('Failed to delete test') }
  }

  const loadTestQuestions = async (test, editMode) => {
    setViewingTest(test)
    setCurrentModuleTab(0)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(editMode)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})

    try {
      const token = localStorage.getItem('token')
      const modules = test.modules && test.modules.length > 0 ? test.modules : [{ questions: test.questions || [], subject: test.subject }]
      const allIds = modules.flatMap(m => m.questions || [])
      const res = await fetch(`/api/questions?ids=${allIds.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const allQuestions = await res.json()
      const qById = {}
      allQuestions.forEach(q => { qById[(q.id || q._id).toString()] = q })

      const customMap = test.customQuestions || {}
      const map = {}
      modules.forEach((m, idx) => {
        map[idx] = (m.questions || []).map(qId => {
          const q = qById[qId.toString()] || {}
          const qKey = (q.id || q._id || '').toString()
          return customMap[qKey] ? { ...q, ...customMap[qKey] } : q
        }).filter(q => q._id || q.id)
      })
      setModuleQuestionsMap(map)
    } catch (err) { console.error(err) } finally { setLoadingQuestions(false) }
  }

  const persistCustomQuestions = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/tutor/module-tests/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ testId: viewingTest._id, customQuestions: editedQuestionsData })
    })
    return res.ok
  }

  const handleSaveTestEdits = async () => {
    setSavingTest(true)
    try {
      if (await persistCustomQuestions()) { setSuccess('Saved'); setIsEditMode(false); setEditingQuestionId(null); fetchTests(); setTimeout(() => setSuccess(''), 3000) }
      else setError('Failed to save')
    } catch { setError('Failed to save') } finally { setSavingTest(false) }
  }

  // Per-question save persists immediately (no need to also click "Save All").
  const handleSaveQuestion = async () => {
    setSavingTest(true)
    try {
      if (await persistCustomQuestions()) { setEditingQuestionId(null); setSuccess('Question saved'); setTimeout(() => setSuccess(''), 2000) }
      else setError('Failed to save')
    } catch { setError('Failed to save') } finally { setSavingTest(false) }
  }

  // Remove an uploaded image's markdown from a field/option value.
  const stripImageMarkdown = (text, src) => {
    if (!text) return text
    const esc = String(src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return String(text).replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const removeImageFromField = (qId, field, current, src) => handleQuestionFieldChange(qId, field, stripImageMarkdown(current, src))
  const removeImageFromOption = (qId, letter, current, src) => handleOptionChange(qId, letter, stripImageMarkdown(current, src))

  const handleQuestionFieldChange = (questionId, field, value) => {
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || {}), [field]: value } }))
    setModuleQuestionsMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(idx => {
        next[idx] = next[idx].map(q => (q.id || q._id).toString() === questionId.toString() ? { ...q, [field]: value } : q)
      })
      return next
    })
  }

  const handleOptionChange = (questionId, optionKey, value) => {
    setModuleQuestionsMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(idx => {
        next[idx] = next[idx].map(q => {
          if ((q.id || q._id).toString() !== questionId.toString()) return q
          let opts = (() => { try { return typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || {}) } catch(e) { return {} } })()
          if (Array.isArray(opts)) opts = { A: opts[0]||'', B: opts[1]||'', C: opts[2]||'', D: opts[3]||'' }
          return { ...q, options: { ...opts, [optionKey]: value } }
        })
      })
      return next
    })
    setEditedQuestionsData(prev => {
      const cur = prev[questionId] || {}
      let opts = (() => { try { return typeof cur.options === 'string' ? JSON.parse(cur.options) : (cur.options || {}) } catch(e) { return {} } })()
      if (Array.isArray(opts)) opts = { A: opts[0]||'', B: opts[1]||'', C: opts[2]||'', D: opts[3]||'' }
      return { ...prev, [questionId]: { ...cur, options: { ...opts, [optionKey]: value } } }
    })
  }

  // Pick + upload an image and hand back the markdown to insert (used by the edit modal).
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
  const appendImageToOption = (qId, letter, current) =>
    uploadQuestionImage((md) => handleOptionChange(qId, letter, current ? `${current}\n${md}` : md))
  const openTableModal = (onInsert) => setTableInsertFn(() => onInsert)
  const appendTableToField = (qId, field, current) =>
    openTableModal((md) => handleQuestionFieldChange(qId, field, current ? `${current}\n${md}` : md))
  const appendTableToOption = (qId, letter, current) =>
    openTableModal((md) => handleOptionChange(qId, letter, current ? `${current}\n${md}` : md))

  const filteredTests = tests.filter(test => {
    if (test.isReassigned === true) return false
    if (searchTerm && !(test.title || '').toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  const currentModuleQuestions = moduleQuestionsMap[currentModuleTab] || []
  const currentModules = viewingTest?.modules && viewingTest.modules.length > 0 ? viewingTest.modules : [{ subject: viewingTest?.subject, questions: viewingTest?.questions || [] }]

  const ImagePreview = ({ text, onRemove }) => {
    if (!text) return null
    const regex = /!\[(.*?)\]\((.*?)\)/g; const images = []; let match
    while ((match = regex.exec(text)) !== null) images.push({ alt: match[1], src: match[2] })
    if (!images.length) return null
    return <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200"><div className="flex flex-wrap gap-2">{images.map((img, i) => <div key={i} className="relative"><img src={img.src} alt={img.alt} className="h-16 w-auto object-contain rounded border bg-white" />{onRemove && <button type="button" onClick={() => onRemove(img.src)} title="Remove image" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs shadow hover:bg-red-700">×</button>}</div>)}</div></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Module Test Sheets</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage all module tests</p>
          </div>
          <button
            onClick={() => router.push('/admin/tutor/module-tests/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <FiPlus className="w-4 h-4" /> Create Module Test
          </button>
        </div>

        {error && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><FiX /> {error}</div>}
        {success && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><FiSave /> {success}</div>}

        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="mt-search" className="mb-1.5 block text-sm font-medium text-slate-700">Search</label>
              <div className="relative"><FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="mt-search" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search test titles..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label htmlFor="mt-mode" className="mb-1.5 block text-sm font-medium text-slate-700">Filter by Mode</label>
              <select id="mt-mode" value={filterMode} onChange={e => setFilterMode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
                <option value="all">All Tests</option><option value="timed">Timed Only</option><option value="untimed">Untimed Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold text-slate-900">Module Tests ({filteredTests.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Modules</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Module Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" /></td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiEdit size={22} /></div>
                    <p className="text-sm font-medium text-slate-500">No tests found</p>
                    <p className="mt-1 text-xs text-slate-400">Create a module test to get started.</p>
                  </td></tr>
                ) : filteredTests.map(test => {
                  const mods = test.modules && test.modules.length > 0 ? test.modules : null
                  const numModules = test.numberOfModules || (mods?.length) || 1
                  return (
                    <tr key={test._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{test.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{numModules} Module{numModules > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {mods ? (
                          <div className="flex flex-wrap gap-1">
                            {mods.map((m, i) => (
                              <span key={i} className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                M{i+1}: {m.subject === 'Reading and Writing' ? 'R&W' : m.subject} • {(m.questions||[]).length}q • {m.isTimed ? `${m.duration}min` : 'Untimed'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Legacy single-module</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{test.questions?.length || 0}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => loadTestQuestions(test, false)} className="inline-flex items-center rounded px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50"><FiEye className="mr-1" /> View</button>
                          <button onClick={() => loadTestQuestions(test, true)} className="inline-flex items-center rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"><FiEdit className="mr-1" /> Edit</button>
                          <DownloadTestJsonButton test={test} className="inline-flex items-center rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100" />
                          <EditTestJsonModal test={test} updateUrl="/api/admin/tutor/module-tests/update" onSaved={fetchTests} className="inline-flex items-center rounded px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50" />
                          <button onClick={() => handleOpenAssignToTutorModal(test)} className="inline-flex items-center rounded px-3 py-1 text-xs text-amber-600 hover:bg-amber-100" title="Assign to Tutor"><FiUsers className="mr-1" /> Tutor</button>
                          <button onClick={() => handleOpenAssignToStudentModal(test)} className="inline-flex items-center rounded px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50"><FiUserPlus className="mr-1" /> Student</button>
                          <button onClick={() => handleDeleteTest(test._id)} className="inline-flex items-center rounded px-3 py-1 text-xs text-rose-600 hover:bg-rose-100"><FiTrash className="mr-1" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* View/Edit Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowViewModal(false)}>
            <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{isEditMode ? 'Edit: ' : ''}{viewingTest.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Module {currentModuleTab + 1} — Question {currentQuestionIndex + 1} of {currentModuleQuestions.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && <button onClick={handleSaveTestEdits} disabled={savingTest} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-slate-400"><FiSave /> {savingTest ? 'Saving...' : 'Save All'}</button>}
                  {isEditMode && <EditTestJsonModal test={viewingTest} updateUrl="/api/admin/tutor/module-tests/update" onSaved={() => { fetchTests(); setShowViewModal(false) }} orderedQuestionIds={currentModules[currentModuleTab]?.questions || []} existingCustomQuestions={editedQuestionsData} scopeLabel={`Module ${currentModuleTab + 1}`} label={`Edit JSON (Module ${currentModuleTab + 1})`} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-indigo-600 hover:bg-slate-50" />}
                  <button onClick={() => setShowViewModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600"><FiX className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Module Tabs */}
              {currentModules.length > 1 && (
                <div className="overflow-x-auto whitespace-nowrap border-b border-slate-200 bg-slate-50 px-5">
                  <nav className="-mb-px flex gap-1">
                    {currentModules.map((m, idx) => (
                      <button key={idx} onClick={() => { setCurrentModuleTab(idx); setCurrentQuestionIndex(0); setEditingQuestionId(null) }} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${currentModuleTab === idx ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        Module {idx + 1}
                        <span className="ml-1 text-xs text-slate-400">({(m.questions||[]).length}q{m.isTimed ? ` • ${m.duration}min` : ' • Untimed'})</span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5">
                {loadingQuestions ? (
                  <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" /></div>
                ) : currentModuleQuestions.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-500">No questions in this module</div>
                ) : (() => {
                  const q = currentModuleQuestions[currentQuestionIndex]
                  if (!q) return null
                  const qId = (q.id || q._id || '').toString()
                  const isEditing = isEditMode && editingQuestionId === qId
                  let options = null
                  try {
                    const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    if (Array.isArray(_raw)) options = { A: _raw[0]||'', B: _raw[1]||'', C: _raw[2]||'', D: _raw[3]||'' }
                    else if (_raw && typeof _raw === 'object') options = _raw
                  } catch(e) {}
                  if (!options && (q.optionA || q.optionB)) options = { A: q.optionA||'', B: q.optionB||'', C: q.optionC||'', D: q.optionD||'' }
                  const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])

                  return (
                    <div className="max-w-4xl mx-auto">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">Question {currentQuestionIndex + 1}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>{q.subject}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : q.difficulty === 'Hard' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{q.difficulty}</span>
                            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{q.questionId || qId.slice(-8)}</span>
                            {tags.map((tag, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{tag}</span>)}
                            {q.remark && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">💬 {q.remark}</span>}
                          </div>
                          {isEditMode && (
                            isEditing
                              ? <button onClick={handleSaveQuestion} disabled={savingTest} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:bg-slate-400"><FiSave /> {savingTest ? 'Saving...' : 'Save'}</button>
                              : <button onClick={() => setEditingQuestionId(qId)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"><FiEdit /> Edit</button>
                          )}
                        </div>

                        {q.questionParagraph && (
                          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                            <span className="text-xs font-semibold uppercase text-indigo-700">Context Paragraph</span>
                            <div className="mt-2 text-sm text-slate-700">{renderWithImages(q.questionParagraph)}</div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Question</label>
                          {isEditing ? (
                            <><textarea value={q.content || q.question || ''} onChange={e => handleQuestionFieldChange(qId, 'content', e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={4} />
                            <ImagePreview text={q.content || q.question} onRemove={(src) => removeImageFromField(qId, 'content', q.content || q.question || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'content', q.content || q.question || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(qId, 'content', q.content || q.question || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                          ) : (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900">{renderWithImages(q.content || q.question)}</div>
                          )}
                        </div>

                        {options && ['A','B','C','D'].filter(k => options[k] || options[k.toLowerCase()]).length > 0 ? (
                          <>
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Answer Options</label>
                              <div className="space-y-2">
                                {['A','B','C','D'].map(letter => {
                                  const optText = (options[letter] || options[letter.toLowerCase()]) || ''; if (!optText) return null
                                  return (
                                    <div key={letter} className={`rounded-lg border-2 p-3 ${q.correctAnswer === letter ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                      <div className="flex items-start gap-2">
                                        <div className="flex flex-shrink-0 items-center gap-1">
                                          <span className={`text-sm font-bold ${q.correctAnswer === letter ? 'text-emerald-700' : 'text-slate-600'}`}>{letter}.</span>
                                          {q.correctAnswer === letter ? <span className="rounded bg-emerald-100 px-1 text-xs font-semibold text-emerald-700">✓</span> : (isEditing && <button type="button" onClick={() => handleQuestionFieldChange(qId, 'correctAnswer', letter)} className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100" title="Mark as correct">Set correct</button>)}
                                        </div>
                                        {isEditing
                                          ? <div className="flex-1"><textarea value={optText} onChange={e => handleOptionChange(qId, letter, e.target.value)} className="w-full rounded border border-slate-300 p-2 font-mono text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={2} /><ImagePreview text={optText} onRemove={(src) => removeImageFromOption(qId, letter, optText, src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToOption(qId, letter, optText)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToOption(qId, letter, optText)} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></div>
                                          : <div className="flex-1 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderWithImages(optText)}</div>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Correct Answer</label>
                              {isEditing
                                ? <select value={q.correctAnswer} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">{['A','B','C','D'].map(l => <option key={l}>{l}</option>)}</select>
                                : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Correct Answer: {q.correctAnswer}</div>}
                            </div>
                          </>
                        ) : (
                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Correct Answer <span className="ml-1 rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Fill-in-the-Blank</span></label>
                            {isEditing
                              ? <input type="text" value={q.correctAnswer || ''} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="Enter correct answer..." />
                              : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Correct Answer: {q.correctAnswer}</div>}
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Short Explanation</label>
                          {isEditing
                            ? <><textarea value={q.shortExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'shortExplanation', e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={3} placeholder="Short explanation..." /><ImagePreview text={q.shortExplanation || ''} onRemove={(src) => removeImageFromField(qId, 'shortExplanation', q.shortExplanation || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'shortExplanation', q.shortExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(qId, 'shortExplanation', q.shortExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                            : <div className="min-h-[44px] rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">{q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="italic text-slate-400">No short explanation</span>}</div>}
                        </div>

                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Long Explanation</label>
                          {isEditing
                            ? <><textarea value={q.longExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'longExplanation', e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" rows={5} placeholder="Long explanation..." /><ImagePreview text={q.longExplanation || ''} onRemove={(src) => removeImageFromField(qId, 'longExplanation', q.longExplanation || '', src)} /><button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'longExplanation', q.longExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><FiUpload className="h-3.5 w-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={() => appendTableToField(qId, 'longExplanation', q.longExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="h-3.5 w-3.5" /> Table</button></>
                            : <div className="min-h-[44px] rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">{q.longExplanation ? renderWithImages(q.longExplanation) : <span className="italic text-slate-400">No long explanation</span>}</div>}
                        </div>

                        {!q.shortExplanation && !q.longExplanation && q.explanation && !isEditing && (
                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Explanation</label>
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">{renderWithImages(q.explanation)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
                <button onClick={() => { setCurrentQuestionIndex(p => Math.max(0, p-1)); setEditingQuestionId(null) }} disabled={currentQuestionIndex === 0} className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  <FiArrowLeft /> Previous
                </button>
                <div className="text-sm text-slate-600">
                  {currentModules.length > 1 && <span className="mr-2 font-medium text-indigo-600">Module {currentModuleTab + 1}</span>}
                  {currentQuestionIndex + 1} / {currentModuleQuestions.length}
                </div>
                <button onClick={() => { setCurrentQuestionIndex(p => Math.min(currentModuleQuestions.length-1, p+1)); setEditingQuestionId(null) }} disabled={currentQuestionIndex >= currentModuleQuestions.length - 1} className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Student Modal */}
        {showAssignToStudentModal && assignToStudentTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign to Student</h2>
                  <p className="text-sm text-gray-600 mt-1">{assignToStudentTest.title}</p>
                </div>
                <button onClick={() => setShowAssignToStudentModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
              </div>
              <div className="p-4 border-b">
                <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : (
                  <div className="space-y-2">
                    {allStudents
                      .filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(student => {
                        const assigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id.toString())
                        return (
                          <div key={student._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div><div className="font-medium text-gray-900 text-sm">{student.name}</div><div className="text-xs text-gray-500">{student.email}</div></div>
                            <button onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                              {assigned ? 'Unassign' : 'Assign'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input type="checkbox" checked={assignShowExplanation} onChange={e => setAssignShowExplanation(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Show explanation on analysis page</span>
                </label>
                <button onClick={() => setShowAssignToStudentModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Tutor Modal */}
        {showAssignToTutorModal && assignToTutorTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Test Access to Tutor</h2>
                  <p className="text-sm text-gray-600 mt-1">{assignToTutorTest.title}</p>
                </div>
                <button onClick={() => setShowAssignToTutorModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
              </div>
              <div className="p-4 border-b">
                <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={tutorSearch} onChange={e => setTutorSearch(e.target.value)} placeholder="Search tutors..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllTutors ? (
                  <div className="text-center py-8 text-gray-500">Loading tutors...</div>
                ) : (
                  <div className="space-y-2">
                    {allTutors
                      .filter(t => !tutorSearch || t.name?.toLowerCase().includes(tutorSearch.toLowerCase()) || t.email?.toLowerCase().includes(tutorSearch.toLowerCase()))
                      .map(tutor => {
                        const assigned = (assignedTutorsMap[assignToTutorTest._id] || []).includes(tutor._id.toString())
                        return (
                          <div key={tutor._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                            <div><div className="font-medium text-gray-900 text-sm">{tutor.name}</div><div className="text-xs text-gray-500">{tutor.email}</div></div>
                            <button onClick={() => handleToggleTutorAssignment(tutor._id, assignToTutorTest._id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                              {assigned ? 'Remove Access' : 'Grant Access'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button onClick={() => setShowAssignToTutorModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TablePasteModal open={!!tableInsertFn} onClose={() => setTableInsertFn(null)} onInsert={(md) => { if (tableInsertFn) tableInsertFn(md) }} />
    </div>
  )
}
