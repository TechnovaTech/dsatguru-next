'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
// Maps an answer (letter, "B) 240"-style key, or option text — any casing) to its option letter.
import { resolveAnswerLetter } from '../../../../lib/scoring/satScale'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus, FiCheck, FiUpload, FiGrid, FiDownload } from 'react-icons/fi'
import { useConfirm, useToast } from '../../../components/ui/UIProvider'
import TablePasteModal from '../../../components/admin/TablePasteModal'
import { EditTestJsonModal, EditTestMetaModal } from '../../../components/admin/TestJsonTools'

export default function TutorTestSheets() {
  const confirm = useConfirm()
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all') // all, timed, untimed
  const [activeTab, setActiveTab] = useState('Math') // Math, Reading and Writing, Assign
  
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
  
  // Assign to tutors modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [tutors, setTutors] = useState([])
  const [loadingTutors, setLoadingTutors] = useState(false)
  const [selectedTutorId, setSelectedTutorId] = useState(null)
  const [assignedTests, setAssignedTests] = useState([])
  
  // View students modal
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [selectedTutorStudents, setSelectedTutorStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // View assigned tests modal
  const [showAssignedTestsModal, setShowAssignedTestsModal] = useState(false)
  const [selectedTutorTests, setSelectedTutorTests] = useState([])
  const [selectedTestSubject, setSelectedTestSubject] = useState('')
  const [loadingAssignedTests, setLoadingAssignedTests] = useState(false)
  
  // Checkbox selections
  const [selectedMathTests, setSelectedMathTests] = useState([])
  const [selectedRWTests, setSelectedRWTests] = useState([])

  // Assign test to student modal (from test row)
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false)
  const [assignToStudentTest, setAssignToStudentTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [studentAssignedTests, setStudentAssignedTests] = useState({}) // studentId -> [testIds]
  const [studentExplMap, setStudentExplMap] = useState({}) // studentId -> { testId: showExplanation bool }
  const [studentSearch, setStudentSearch] = useState('')
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  useEffect(() => {
    fetchTests()
  }, [])

  useEffect(() => {
    if (tests.length > 0) {
      fetchTutors()
    }
  }, [tests])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      // no-store: a tutor's just-saved customQuestions edit must be visible on the very
      // next view — a cached list would keep showing the pre-edit override.
      const res = await fetch('/api/admin/tutor/tests/list', {
        cache: 'no-store',
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

  const fetchTutors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Tutor', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        // Fetch assigned tests count for each tutor
        const tutorsWithCounts = await Promise.all(data.map(async (tutor) => {
          try {
            const assignedRes = await fetch(`/api/admin/tutor/tests/assigned?tutorId=${tutor._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (assignedRes.ok) {
              const assignedData = await assignedRes.json()
              const assignedTestIds = assignedData.assignedTests || []
              
              // Count Math and R&W tests
              const mathCount = tests.filter(t => t.subject === 'Math' && assignedTestIds.includes(t._id)).length
              const rwCount = tests.filter(t => t.subject === 'Reading and Writing' && assignedTestIds.includes(t._id)).length
              
              return {
                ...tutor,
                mathTestsCount: mathCount,
                rwTestsCount: rwCount
              }
            }
          } catch (err) {
            console.error('Failed to fetch assigned tests for tutor', err)
          }
          return {
            ...tutor,
            mathTestsCount: 0,
            rwTestsCount: 0
          }
        }))
        setTutors(tutorsWithCounts)
      }
    } catch (err) {
      console.error('Failed to load tutors', err)
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
        // Fetch assigned tests + explanation flags for each student
        const map = {}
        const explMap = {}
        await Promise.all(students.map(async (s) => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (r.ok) {
              const d = await r.json()
              map[s._id] = d.assignedTests || []
              explMap[s._id] = d.showExplanation || {}
            }
          } catch {}
        }))
        setStudentAssignedTests(map)
        setStudentExplMap(explMap)
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
        if (!isAssigned) setStudentExplMap(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [testId.toString()]: assignShowExplanation } }))
        setSuccess(isAssigned ? 'Test unassigned from student' : 'Test assigned to student')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to update assignment')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Toggle "show explanation in analysis" for one student — applies to ALL their sessions for
  // this test (even after completion), so explanations can be revealed without re-assigning.
  const handleToggleExplanationForStudent = async (studentId, testId, value) => {
    const tid = testId.toString()
    setStudentExplMap(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [tid]: value } }))
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, testId, action: 'setExplanation', showExplanation: value })
      })
      if (!res.ok) throw new Error('failed')
      toast.success(value ? 'Explanation enabled in analysis' : 'Explanation hidden in analysis')
    } catch {
      // revert on failure
      setStudentExplMap(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [tid]: !value } }))
      toast.error('Could not update explanation setting')
    }
  }

  const handleViewStudents = async (tutor) => {
    setLoadingStudents(true)
    setShowStudentsModal(true)
    setSelectedTutorStudents([])
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const students = await res.json()
        // Filter students whose assignedTutors (plural array) contains this tutor.
        // Each entry may be a populated object with _id or a raw id string.
        const tutorStudents = students.filter(s =>
          (s.assignedTutors || []).some(t => String(t?._id || t) === String(tutor._id))
        )
        setSelectedTutorStudents(tutorStudents)
      }
    } catch (err) {
      console.error('Failed to load students', err)
      setError('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleViewAssignedTests = async (tutor, subject) => {
    setLoadingAssignedTests(true)
    setShowAssignedTestsModal(true)
    setSelectedTestSubject(subject)
    setSelectedTutorTests([])
    
    try {
      const token = localStorage.getItem('token')
      const assignedRes = await fetch(`/api/admin/tutor/tests/assigned?tutorId=${tutor._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json()
        const assignedTestIds = assignedData.assignedTests || []
        
        // Filter tests by subject and assigned status
        const assignedTests = tests.filter(t => 
          t.subject === subject && assignedTestIds.includes(t._id)
        )
        setSelectedTutorTests(assignedTests)
      }
    } catch (err) {
      console.error('Failed to load assigned tests', err)
      setError('Failed to load assigned tests')
    } finally {
      setLoadingAssignedTests(false)
    }
  }

  const handleOpenAssignModal = async (tutor) => {
    setSelectedTutorId(tutor._id)
    setShowAssignModal(true)
    setLoadingTutors(true)
    setSelectedMathTests([])
    setSelectedRWTests([])
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/tests/assigned?tutorId=${tutor._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setAssignedTests(data.assignedTests || [])
      }
    } catch (err) {
      console.error('Failed to load assigned tests', err)
    } finally {
      setLoadingTutors(false)
    }
  }

  const handleToggleTestAssignment = async (testId) => {
    try {
      const token = localStorage.getItem('token')
      const isAssigned = assignedTests.includes(testId)
      
      const res = await fetch('/api/admin/tutor/tests/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tutorId: selectedTutorId,
          testId,
          action: isAssigned ? 'remove' : 'add'
        })
      })
      
      if (res.ok) {
        if (isAssigned) {
          setAssignedTests(prev => prev.filter(id => id !== testId))
          setSuccess('Test unassigned successfully')
        } else {
          setAssignedTests(prev => [...prev, testId])
          setSuccess('Test assigned successfully')
        }
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update assignment')
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      setError('Failed to update assignment')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleSelectAllMath = () => {
    const mathTests = tests.filter(t => t.subject === 'Math')
    const mathTestIds = mathTests.map(t => t._id)
    
    if (selectedMathTests.length === mathTestIds.length) {
      // Deselect all
      setSelectedMathTests([])
    } else {
      // Select all
      setSelectedMathTests(mathTestIds)
    }
  }

  const handleSelectAllRW = () => {
    const rwTests = tests.filter(t => t.subject === 'Reading and Writing')
    const rwTestIds = rwTests.map(t => t._id)
    
    if (selectedRWTests.length === rwTestIds.length) {
      // Deselect all
      setSelectedRWTests([])
    } else {
      // Select all
      setSelectedRWTests(rwTestIds)
    }
  }

  const handleToggleMathTest = (testId) => {
    setSelectedMathTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const handleToggleRWTest = (testId) => {
    setSelectedRWTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const handleAssignSelected = async (subject) => {
    const selectedTests = subject === 'Math' ? selectedMathTests : selectedRWTests
    
    if (selectedTests.length === 0) {
      setError('Please select tests to assign')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      for (const testId of selectedTests) {
        await fetch('/api/admin/tutor/tests/assign', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            tutorId: selectedTutorId,
            testId,
            action: 'add'
          })
        })
      }
      
      setAssignedTests(prev => [...new Set([...prev, ...selectedTests])])
      
      if (subject === 'Math') {
        setSelectedMathTests([])
      } else {
        setSelectedRWTests([])
      }
      
      setSuccess(`${selectedTests.length} test(s) assigned successfully`)
      setTimeout(() => setSuccess(''), 3000)
      fetchTutors()
    } catch (err) {
      setError('Failed to assign tests')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleUnassignSelected = async (subject) => {
    const selectedTests = subject === 'Math' ? selectedMathTests : selectedRWTests
    
    if (selectedTests.length === 0) {
      setError('Please select tests to unassign')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      for (const testId of selectedTests) {
        await fetch('/api/admin/tutor/tests/assign', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            tutorId: selectedTutorId,
            testId,
            action: 'remove'
          })
        })
      }
      
      setAssignedTests(prev => prev.filter(id => !selectedTests.includes(id)))
      
      if (subject === 'Math') {
        setSelectedMathTests([])
      } else {
        setSelectedRWTests([])
      }
      
      setSuccess(`${selectedTests.length} test(s) unassigned successfully`)
      setTimeout(() => setSuccess(''), 3000)
      fetchTutors()
    } catch (err) {
      setError('Failed to unassign tests')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!(await confirm({ message: 'Are you sure you want to delete this test?', tone: 'danger', confirmText: 'Delete' }))) return
    
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
        cache: 'no-store',
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

  const toast = useToast()
  // Per-row "I've checked this whole sheet" gate. Assign to Student only works once confirmed.
  // Persisted in localStorage so it survives a page refresh.
  const [verifiedTests, setVerifiedTests] = useState({})
  useEffect(() => {
    try { setVerifiedTests(JSON.parse(localStorage.getItem('tutorVerifiedTests') || '{}')) } catch {}
  }, [])
  const persistVerified = (next) => {
    setVerifiedTests(next)
    try { localStorage.setItem('tutorVerifiedTests', JSON.stringify(next)) } catch {}
  }
  const toggleVerified = async (test) => {
    if (verifiedTests[test._id]) { persistVerified({ ...verifiedTests, [test._id]: false }); return }
    const ok = await confirm({ title: 'Confirm sheet', message: 'Have you checked everything in this sheet (questions, answers, images)? Confirm to enable Assign to Student.', confirmText: 'Yes, all checked', cancelText: 'Not yet' })
    if (ok) persistVerified({ ...verifiedTests, [test._id]: true })
  }

  // Download all questions of a sheet as a JSON file in the same format used for bulk upload,
  // so a sheet can be re-uploaded / shared. Tutor edits (customQuestions) are merged in.
  const handleDownloadJson = async (test) => {
    try {
      const token = localStorage.getItem('token')
      const questionIds = (test.questions || []).join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { console.error('Failed to load questions for JSON export'); return }
      let questions = await res.json()
      const cmap = test.customQuestions || {}
      questions = questions.map(q => { const qId = q.id || q._id; return cmap[qId] ? { ...q, ...cmap[qId] } : q })

      const parseTags = (t) => {
        try { const a = typeof t === 'string' ? JSON.parse(t) : t; if (Array.isArray(a)) return a } catch {}
        return typeof t === 'string' ? t.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(t) ? t : [])
      }
      const parseOpts = (q) => {
        let o = null
        try { const r = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; if (Array.isArray(r)) o = { A: r[0] || '', B: r[1] || '', C: r[2] || '', D: r[3] || '' }; else if (r && typeof r === 'object') o = r } catch {}
        if (!o && (q.optionA || q.optionB || q.optionC || q.optionD)) o = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' }
        return o || {}
      }

      const arr = questions.map(q => {
        const o = parseOpts(q)
        const g = (k) => String(o[k] ?? o[k.toLowerCase()] ?? '').trim()
        const A = g('A'), B = g('B'), C = g('C'), D = g('D')
        const hasOpts = !!(A || B || C || D)
        return {
          question: q.content || q.question || '',
          ...(hasOpts ? { 'option a': A, 'option b': B, 'option c': C, 'option d': D } : {}),
          'correct answer': q.correctAnswer || '',
          difficulty: q.difficulty || 'Medium',
          subject: q.subject || 'Math',
          tags: parseTags(q.tags).join(', '),
          shortexplanation: q.shortExplanation || q.explanation || '',
          longexplanation: q.longExplanation || '',
          remark: q.remark || ''
        }
      })

      const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${String(test.title || 'test').replace(/[^a-zA-Z0-9-_]+/g, '_')}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('JSON export failed', e)
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
        cache: 'no-store',
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

  // Persist all pending question edits (customQuestions) to the backend.
  const persistCustomQuestions = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/tutor/tests/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ testId: viewingTest._id, customQuestions: editedQuestionsData })
    })
    return res.ok
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

  const handleEditQuestion = (questionId) => {
    setEditingQuestionId(questionId)
  }

  // Per-question Save now persists immediately (no need to also click "Save All Changes").
  const handleSaveQuestion = async (questionId) => {
    setSavingTest(true)
    try {
      if (await persistCustomQuestions()) {
        setEditingQuestionId(null)
        setSuccess('Question saved')
        setTimeout(() => setSuccess(''), 2000)
      } else {
        setError('Failed to save question')
      }
    } catch (err) {
      setError('Failed to save question')
      console.error(err)
    } finally {
      setSavingTest(false)
    }
  }

  // Remove an uploaded image's markdown from a field/option value.
  const stripImageMarkdown = (text, src) => {
    if (!text) return text
    const esc = String(src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return String(text).replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const removeImageFromField = (qId, field, current, src) =>
    handleQuestionFieldChange(qId, field, stripImageMarkdown(current, src))
  const removeImageFromOption = (qId, letter, current, src) =>
    handleOptionChange(qId, letter, stripImageMarkdown(current, src))

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

  // Pick an image, upload it, and hand back the markdown to insert (used by the edit modal).
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
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        const data = await res.json()
        if (res.ok && data.url) onInsert(`![image](${data.url})`)
        else alert(data.error || 'Image upload failed')
      } catch (e) {
        alert('Image upload failed')
      } finally {
        setUploadingImage(false)
      }
    }
    input.click()
  }

  // Append (on a new line) freshly-uploaded image markdown to a field's current value.
  const appendImageToField = (qId, field, current) =>
    uploadQuestionImage((md) => handleQuestionFieldChange(qId, field, current ? `${current}\n${md}` : md))
  const appendImageToOption = (qId, letter, current) =>
    uploadQuestionImage((md) => handleOptionChange(qId, letter, current ? `${current}\n${md}` : md))

  // Open the paste-to-table modal; on insert, append the table markdown to a field/option.
  const openTableModal = (onInsert) => setTableInsertFn(() => onInsert)
  const appendTableToField = (qId, field, current) =>
    openTableModal((md) => handleQuestionFieldChange(qId, field, current ? `${current}\n${md}` : md))
  const appendTableToOption = (qId, letter, current) =>
    openTableModal((md) => handleOptionChange(qId, letter, current ? `${current}\n${md}` : md))

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


  const filteredTests = tests.filter(test => {
    // Filter out reassigned tests
    if (test.isReassigned === true) return false
    
    // Filter by subject (tab)
    if (test.subject !== activeTab) return false
    
    // Filter by search term
    if (searchTerm && !(test.title || '').toLowerCase().includes(searchTerm.toLowerCase())) {
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
              <button
                onClick={() => setActiveTab('Assign')}
                className={`${
                  activeTab === 'Assign'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Assign Test Sheets
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        {activeTab !== 'Assign' && (
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
        )}

        {/* Tests List */}
        {activeTab !== 'Assign' && (
          <div className="bg-white rounded-lg shadow-sm mb-4">
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
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm align-top">
                        <div className="flex min-w-[240px] flex-col gap-2">
                          {/* Primary actions */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => handleViewTest(test)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <FiEye size={14} /> View
                            </button>
                            <button
                              onClick={() => handleEditTest(test)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                              <FiEdit size={14} /> Edit
                            </button>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white pl-2 pr-2.5 py-1">
                              <input
                                type="checkbox"
                                checked={!!verifiedTests[test._id]}
                                onChange={() => toggleVerified(test)}
                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                title="Confirm you've checked the whole sheet to enable Assign"
                              />
                              <button
                                onClick={() => {
                                  if (!verifiedTests[test._id]) { toast.info('Please check the box first — you can assign only after verifying the sheet.'); return }
                                  handleOpenAssignToStudentModal(test)
                                }}
                                className={`inline-flex items-center gap-1.5 text-sm font-medium ${verifiedTests[test._id] ? 'text-purple-700 hover:text-purple-900' : 'cursor-not-allowed text-gray-400'}`}
                                title={verifiedTests[test._id] ? 'Assign to Student' : 'Check the box first to enable Assign'}
                              >
                                <FiUserPlus size={14} /> Assign
                              </button>
                            </span>
                          </div>
                          {/* Secondary actions (data + delete) */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-0.5 text-xs">
                            <button
                              onClick={() => handleDownloadJson(test)}
                              className="inline-flex items-center gap-1 font-medium text-slate-500 transition-colors hover:text-slate-800"
                              title="Download this sheet as JSON (upload format)"
                            >
                              <FiDownload size={13} /> JSON
                            </button>
                            <EditTestJsonModal test={test} updateUrl="/api/admin/tutor/tests/update" onSaved={fetchTests} className="inline-flex items-center gap-1 font-medium text-indigo-500 transition-colors hover:text-indigo-700" />
                            <EditTestMetaModal test={test} updateUrl="/api/admin/tutor/tests/update" onSaved={fetchTests} className="inline-flex items-center gap-1 font-medium text-slate-500 transition-colors hover:text-slate-700" />
                            <button
                              onClick={() => handleDeleteTest(test._id)}
                              className="ml-auto inline-flex items-center gap-1 font-medium text-red-500 transition-colors hover:text-red-700"
                              title="Delete"
                            >
                              <FiTrash size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Assign Sheets to Tutors Section */}
        {activeTab === 'Assign' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Assign Test Sheets to Tutors</h2>
              <p className="text-sm text-gray-600 mt-1">Manage test sheet assignments for each tutor</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number of Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Math Tests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">R&W Tests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tutors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No tutors found</td>
                    </tr>
                  ) : (
                    tutors.map((tutor) => (
                      <tr key={tutor._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{tutor.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tutor.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewStudents(tutor)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {tutor.studentCount || 0} Students
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewAssignedTests(tutor, 'Math')}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {tutor.mathTestsCount || 0} Tests
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewAssignedTests(tutor, 'Reading and Writing')}
                            className="text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {tutor.rwTestsCount || 0} Tests
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleOpenAssignModal(tutor)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            <FiUserPlus className="mr-2" /> Assign Test Sheet
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                    
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
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200">
                          <span className="text-xs text-gray-500 block mb-2">Image Preview:</span>
                          <div className="flex flex-wrap gap-2">
                            {images.map((img, i) => (
                              <div key={i} className="relative">
                                <img src={img.src} alt={img.alt} title={img.alt} className="h-20 w-auto object-contain rounded border bg-white" />
                                {onRemove && (
                                  <button type="button" onClick={() => onRemove(img.src)} title="Remove image" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs shadow hover:bg-red-700">×</button>
                                )}
                              </div>
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

                              <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded border border-gray-300">
                                ID: {q.questionId || (q.id || q._id || '').toString().slice(-8)}
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

                          {/* Context Paragraph */}
                          {q.questionParagraph && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <span className="text-xs font-semibold text-blue-700 uppercase">Context Paragraph</span>
                              <div className="mt-2 text-sm text-gray-700">{renderWithImages(q.questionParagraph)}</div>
                            </div>
                          )}

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
                                <ImagePreview text={q.content || q.question} onRemove={(src) => removeImageFromField(qId, 'content', q.content || q.question || '', src)} />
                                <button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'content', q.content || q.question || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                  <FiUpload className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}
                                </button>
                                <button type="button" onClick={() => appendTableToField(qId, 'content', q.content || q.question || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="w-3.5 h-3.5" /> Table</button>
                              </>
                            ) : (
                              <div className="text-gray-900 bg-white p-3 rounded-lg border">
                                {renderWithImages(q.content || q.question)}
                              </div>
                            )}
                          </div>

                          {/* Check if question has multiple choice options or is fill-in-the-blank */}
                          {(['A','B','C','D'].filter(k => options && (options[k] || options[k.toLowerCase()]))).length > 0 ? (
                            <>
                              {/* Multiple Choice Options */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options (Multiple Choice)</label>
                                <div className="space-y-2">
                                  {['A', 'B', 'C', 'D'].map((letter) => {
                                    const optText = (options && (options[letter] || options[letter.toLowerCase()])) || ''
                                    if (!optText) return null
                                    return (
                                    <div key={letter} className={`p-3 border-2 rounded-lg ${resolveAnswerLetter(q.correctAnswer, q) === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-start gap-2">
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <span className={`font-bold text-sm ${resolveAnswerLetter(q.correctAnswer, q) === letter ? 'text-green-700' : 'text-gray-600'}`}>{letter}.</span>
                                          {resolveAnswerLetter(q.correctAnswer, q) === letter ? (
                                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Correct</span>
                                          ) : (isEditing && (
                                            <button type="button" onClick={() => handleQuestionFieldChange(qId, 'correctAnswer', letter)} className="text-[10px] font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100" title="Mark this option as the correct answer">Set correct</button>
                                          ))}
                                        </div>
                                        {isEditing ? (
                                          <div className="flex-1">
                                            <textarea
                                              value={optText}
                                              onChange={(e) => handleOptionChange(qId, letter, e.target.value)}
                                              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                              rows={2}
                                            />
                                            <ImagePreview text={optText} onRemove={(src) => removeImageFromOption(qId, letter, optText, src)} />
                                            <button type="button" disabled={uploadingImage} onClick={() => appendImageToOption(qId, letter, optText)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                              <FiUpload className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}
                                            </button>
                                            <button type="button" onClick={() => appendTableToOption(qId, letter, optText)} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="w-3.5 h-3.5" /> Table</button>
                                          </div>
                                        ) : (
                                          <div className="flex-1 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderWithImages(optText)}</div>
                                        )}
                                      </div>
                                    </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Correct Answer for Multiple Choice */}
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
                                    <span className="text-sm font-medium text-green-800">Correct Answer: {renderWithImages(String(q.correctAnswer ?? ''))}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Fill-in-the-Blank Answer */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  <span className="inline-flex items-center gap-2">
                                    Correct Answer (Fill-in-the-Blank)
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Text Input</span>
                                  </span>
                                </label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={q.correctAnswer || ''}
                                    onChange={(e) => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                    placeholder="Enter the correct answer..."
                                  />
                                ) : (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-sm font-medium text-green-800">Correct Answer: {renderWithImages(String(q.correctAnswer ?? ''))}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Short Explanation */}
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
                                <ImagePreview text={q.shortExplanation || ''} onRemove={(src) => removeImageFromField(qId, 'shortExplanation', q.shortExplanation || '', src)} />
                                <button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'shortExplanation', q.shortExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                  <FiUpload className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}
                                </button>
                                <button type="button" onClick={() => appendTableToField(qId, 'shortExplanation', q.shortExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="w-3.5 h-3.5" /> Table</button>
                              </>
                            ) : (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 min-h-[48px]">
                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="text-gray-400 italic">No short explanation added</span>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Long Explanation */}
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
                                <ImagePreview text={q.longExplanation || ''} onRemove={(src) => removeImageFromField(qId, 'longExplanation', q.longExplanation || '', src)} />
                                <button type="button" disabled={uploadingImage} onClick={() => appendImageToField(qId, 'longExplanation', q.longExplanation || '')} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                  <FiUpload className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading…' : 'Upload image'}
                                </button>
                                <button type="button" onClick={() => appendTableToField(qId, 'longExplanation', q.longExplanation || '')} className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiGrid className="w-3.5 h-3.5" /> Table</button>
                              </>
                            ) : (
                              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 min-h-[48px]">
                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {q.longExplanation ? renderWithImages(q.longExplanation) : <span className="text-gray-400 italic">No long explanation added</span>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* General Explanation fallback */}
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

        {/* View Assigned Tests Modal */}
        {showAssignedTestsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assigned {selectedTestSubject} Tests</h2>
                  <p className="text-sm text-gray-600 mt-1">Tests assigned to this tutor</p>
                </div>
                <button onClick={() => setShowAssignedTestsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingAssignedTests ? (
                  <div className="text-center py-8 text-gray-500">Loading tests...</div>
                ) : selectedTutorTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No {selectedTestSubject} tests assigned</div>
                ) : (
                  <div className="space-y-3">
                    {selectedTutorTests.map((test) => (
                      <div key={test._id} className={`p-4 border rounded-lg ${
                        selectedTestSubject === 'Math' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium text-gray-900 flex-1">{test.title}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm text-gray-600">
                              {test.questions?.length || 0} questions
                            </span>
                            <span className="text-gray-300">•</span>
                            {test.isTimed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                <FiClock /> {test.duration} min
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                Untimed
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              selectedTestSubject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {test.subject}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAssignedTestsModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Students Modal */}
        {showStudentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assigned Students</h2>
                  <p className="text-sm text-gray-600 mt-1">Students assigned to this tutor</p>
                </div>
                <button onClick={() => setShowStudentsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : selectedTutorStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No students assigned to this tutor</div>
                ) : (
                  <div className="space-y-3">
                    {selectedTutorStudents.map((student) => (
                      <div key={student._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-600">{student.email}</div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            student.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowStudentsModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Tests to Tutor Modal */}
        {showAssignModal && selectedTutorId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Test Sheets</h2>
                  <p className="text-sm text-gray-600 mt-1">Select tests to assign to this tutor</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingTutors ? (
                  <div className="text-center py-8 text-gray-500">Loading tests...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Math Tests Column */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            Math Tests ({tests.filter(t => t.subject === 'Math' && !t.isReassigned).length})
                          </h3>
                          {tests.filter(t => t.subject === 'Math' && !t.isReassigned).length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedMathTests.length === tests.filter(t => t.subject === 'Math' && !t.isReassigned).length && tests.filter(t => t.subject === 'Math' && !t.isReassigned).length > 0}
                                onChange={handleSelectAllMath}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-blue-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedMathTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Math')}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                            >
                              Assign Selected ({selectedMathTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Math')}
                              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Unassign Selected ({selectedMathTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                        {tests.filter(t => t.subject === 'Math' && !t.isReassigned).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">No Math tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Math' && !t.isReassigned).map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedMathTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`p-3 border rounded-lg transition-colors ${
                                  isAssigned ? 'bg-blue-50 border-blue-200' : 
                                  isSelected ? 'bg-blue-50 border-blue-300' :
                                  'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleMathTest(test._id)}
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-sm">{test.title}</div>
                                      {isAssigned && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration} min` : 'Untimed'}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Reading & Writing Tests Column */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                            Reading & Writing Tests ({tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).length})
                          </h3>
                          {tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRWTests.length === tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).length && tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).length > 0}
                                onChange={handleSelectAllRW}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-purple-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedRWTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Reading and Writing')}
                              className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
                            >
                              Assign Selected ({selectedRWTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Reading and Writing')}
                              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Unassign Selected ({selectedRWTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                        {tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">No Reading & Writing tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Reading and Writing' && !t.isReassigned).map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedRWTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`p-3 border rounded-lg transition-colors ${
                                  isAssigned ? 'bg-purple-50 border-purple-200' : 
                                  isSelected ? 'bg-purple-50 border-purple-300' :
                                  'bg-white border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleRWTest(test._id)}
                                    className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-sm">{test.title}</div>
                                      {isAssigned && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration} min` : 'Untimed'}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Test to Student Modal */}
        {showAssignToStudentModal && assignToStudentTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign to Student</h2>
                  <p className="text-sm text-gray-600 mt-1">{assignToStudentTest.title}</p>
                </div>
                <button onClick={() => setShowAssignToStudentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 border-b">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : allStudents.filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No students found</div>
                ) : (
                  <div className="space-y-2">
                    {allStudents
                      .filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(student => {
                        const assigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id.toString())
                        return (
                          <div key={student._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                              <div className="text-xs text-gray-500">{student.email}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600" title="Show short & long explanation in this student's analysis — works even after they finish the test">
                                <input
                                  type="checkbox"
                                  checked={!!(studentExplMap[student._id]?.[assignToStudentTest._id.toString()])}
                                  onChange={(e) => handleToggleExplanationForStudent(student._id, assignToStudentTest._id, e.target.checked)}
                                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                Explanation
                              </label>
                              <button
                                onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {assigned ? 'Unassign' : 'Assign'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={assignShowExplanation}
                    onChange={e => setAssignShowExplanation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show explanation on analysis page</span>
                </label>
                <button onClick={() => setShowAssignToStudentModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TablePasteModal open={!!tableInsertFn} onClose={() => setTableInsertFn(null)} onInsert={(md) => { if (tableInsertFn) tableInsertFn(md) }} />
    </div>
  )
}
