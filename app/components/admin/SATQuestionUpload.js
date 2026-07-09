'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FiUpload, FiFile, FiCheck, FiX, FiDownload, FiPlus, FiSearch, FiEdit, FiImage, FiArrowLeft } from 'react-icons/fi'
import BulkQuestionPreview from './BulkQuestionPreview'
import { useToast } from '../ui/UIProvider'

export default function SATQuestionUpload({ isTutor: propIsTutor = false, managePath = '/admin/question-bank' }) {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isTutor = propIsTutor || searchParams?.get('isTutor') === 'true'
  const isAdminTest = managePath.includes('admin-tests')
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
  const [bulkTab, setBulkTab] = useState('csv') // 'csv' | 'json' | 'mathpix'
  const [mathpixFile, setMathpixFile] = useState(null)
  const [mathpixConverting, setMathpixConverting] = useState(false)
  const [mathpixSubject, setMathpixSubject] = useState(urlSubject || 'Math')
  const [mathpixDifficulty, setMathpixDifficulty] = useState('Medium')
  const [mathpixTags, setMathpixTags] = useState('')
  const [mathpixProgress, setMathpixProgress] = useState(0)
  const [mathpixStatus, setMathpixStatus] = useState('')
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
        const isSubjectErr = (error.error || '').toLowerCase().includes('subject mismatch')
        if (isSubjectErr) {
          const expectedSubject = isTutor
            ? singleQuestion.subject
            : selectedQuestionBank === 'MATH_DIRECT'
              ? 'Math'
              : selectedQuestionBank === 'RW_DIRECT'
                ? 'Reading and Writing'
                : ''
          toast.error(
            `❌ UPLOAD BLOCKED — WRONG SUBJECT\n\n` +
            `${error.error}\n\n` +
            `${error.details || ''}\n\n` +
            (expectedSubject
              ? `✔ Fix: Open your file and make sure every row's "subject" column is exactly "${expectedSubject}" (this bank), then upload again.`
              : `✔ Fix: Open your file and make sure the "subject" column matches this bank, then upload again.`)
          )
        } else {
          toast.error(`Preview failed: ${error.error || error.message || 'Unknown error'}\n${error.details || ''}`)
        }
      }
    } catch (error) {
      console.error('Preview error:', error.message || error)
      toast.error(`Preview failed: ${error.message || 'Network error'}`)
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
          isTutor,
          isAdminTest: !isTutor && isAdminTest
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Successfully saved ${result.count} questions to database`)
        setShowPreview(false)
        setPreviewQuestions(null)
        setFile(null)
        fetchUploadHistory()
        setBulkUpload({ csvRecords: [], images: [], imagePreviews: [], mapping: null, progress: 0 })
      } else {
        const error = await response.json()
        toast.error(`Failed to save questions: ${error.error || error.message}`)
      }
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(`Failed to save questions: ${error.message}`)
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
        isAdminTest: !isTutor && isAdminTest,
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
        toast.success('Question added successfully')
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
      toast.error('Failed to add question')
    }
  }

  const handleMathpixConvert = async (e) => {
    e.preventDefault()
    if (!mathpixFile) return
    setMathpixConverting(true)
    setMathpixProgress(0)
    setMathpixStatus('Uploading file to Mathpix...')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      // Step 1: Upload file — returns pdfId immediately
      const formData = new FormData()
      formData.append('file', mathpixFile)
      formData.append('subject', mathpixSubject)
      formData.append('difficulty', mathpixDifficulty)
      formData.append('tags', mathpixTags)

      const uploadRes = await fetch('/api/admin/questions/mathpix-convert', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.pdfId) {
        toast.error(`Upload failed: ${uploadData.error || 'Unknown error'}`)
        return
      }

      const { pdfId } = uploadData
      setMathpixStatus('File uploaded. Mathpix is converting...')
      setMathpixProgress(10)

      // Step 2: Poll GET until done
      const params = new URLSearchParams({
        pdfId,
        subject: mathpixSubject,
        difficulty: mathpixDifficulty,
        tags: mathpixTags
      })

      let attempts = 0
      const maxAttempts = 40 // 40 × 3s = 120s max
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000))
        attempts++

        const pollRes = await fetch(`/api/admin/questions/mathpix-convert?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        const pollData = await pollRes.json()

        if (pollData.status === 'processing') {
          const pct = pollData.percent || 0
          setMathpixProgress(Math.max(10, Math.min(90, pct)))
          setMathpixStatus(`Converting... ${pct ? pct + '%' : ''}`)
          continue
        }

        if (pollData.status === 'error') {
          toast.error(`Conversion failed: ${pollData.error || 'Unknown error'}`)
          return
        }

        if (pollData.status === 'done' && pollData.questions) {
          setMathpixProgress(100)
          setMathpixStatus('Done!')
          setPreviewQuestions(pollData.questions)
          setShowPreview(true)
          return
        }
      }

      toast.error('Conversion timed out. Please try again with a smaller file.')
    } catch (err) {
      toast.error(`Conversion failed: ${err.message}`)
    } finally {
      setMathpixConverting(false)
      setMathpixProgress(0)
      setMathpixStatus('')
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
      toast.error('Failed to download template')
    }
  }

  const downloadMathpixTemplate = async () => {
    const qs = [
      { num: 1, topic: 'Radian measure and degree conversion', difficulty: 'Medium', text: 'The measure of angle R is 2π/3 radians. The measure of angle T is 23π/18 radians greater than the measure of angle R. What is the measure of angle T, in degrees?', options: ['120', '230', '350', '700'], answer: 'C', short: 'Shortcut: add the radian measures first, then convert once. Since 2π/3 = 12π/18, T = 12π/18 + 23π/18 = 35π/18. Then 35π/18 × 180/π = 350°. Pattern: same-denominator radian addition followed by a clean degree conversion.', long: 'Step 1: Convert 2π/3 to eighteenths: 2π/3 = 12π/18.\nStep 2: Add the increase: 12π/18 + 23π/18 = 35π/18.\nStep 3: Convert radians to degrees using π radians = 180°.\nStep 4: 35π/18 × 180/π = 35 × 10 = 350.\nShortcut placement: The shortcut fits at the beginning: combine the fractions first, so you only convert one angle.' },
      { num: 2, topic: 'algebra', difficulty: 'Medium', text: 'In the xy-plane, the point (p, r) lies on the line 4x + 3y = c. The point (7p, 11r) lies on x + y = c. Which expression must be equivalent to p/r?', options: ['-8/3', '-3/8', '3/8', '8/3'], answer: 'A', short: 'Substitute both points: 4p+3r=c and 7p+11r=c, so 4p+3r=7p+11r. This gives -3p=8r, so p/r = -8/3.', long: 'Step 1: 4p+3r=c.\nStep 2: 7p+11r=c.\nStep 3: Set equal: 4p+3r=7p+11r.\nStep 4: -3p=8r.\nStep 5: p/r = -8/3.' },
      { num: 3, topic: 'geometry', difficulty: 'Medium', text: 'The height of a right circular cylinder is 36 inches, and the circumference of its base is 360 inches. Which expression represents the total surface area, in square inches?', options: ['(36)(360) + 2π(180/π)²', '(36)(360) + π(180/π)²', 'π(180/π)² × 36', '(36)(360)'], answer: 'A', short: 'Lateral area = C×h = 360×36. Since 2πr=360, r=180/π. Total = (36)(360) + 2π(180/π)².', long: 'Step 1: Lateral area = Ch = (360)(36).\nStep 2: r = 180/π.\nStep 3: Two bases = 2π(180/π)².\nStep 4: Add lateral + bases.' },
      { num: 4, topic: 'geometry', difficulty: 'Medium', text: 'In triangle ABC, angle A = 62° and AC = 24. In triangle PQR, angle P = 62° and PR = 72. Which additional piece of information proves triangle ABC similar to PQR?', options: ['AB=18 and PQ=18', 'AB=18 and QR=54', 'Angle B=50° and angle R=68°', 'Angle B=62° and angle Q=50°'], answer: 'C', short: 'Choice C gives B=50°, so C=68°. Also R=68°. Since A=P=62°, two angles match — AA similarity.', long: 'Step 1: A=P=62° already.\nStep 2: B=50° → C=68°.\nStep 3: R=68°.\nStep 4: Both triangles: 62°,50°,68°.\nStep 5: AA similarity proven.' },
      { num: 5, topic: 'geometry', difficulty: 'Medium', text: 'A circle has center G, and MH and NH are tangent at M and N. Radius = 160 mm, perimeter of GMHN = 3840 mm. What is the distance GH?', options: ['1767', '1776', '1760', '160'], answer: 'A', short: 'MH=NH=x. 160+x+x+160=3840, x=1760. GH=√(160²+1760²)≈1767.', long: 'Step 1: GM=GN=160.\nStep 2: MH=NH=x.\nStep 3: 320+2x=3840, x=1760.\nStep 4: Right triangle: GH=√(160²+1760²)≈1767.' },
      { num: 6, topic: 'exponents', difficulty: 'Medium', text: 'If ⁵√(x^(7a+3)) = x / ⁵√(x^17), what is the value of a?', options: ['-15/7', '-7/15', '7/15', '15/7'], answer: 'A', short: 'Left = x^((7a+3)/5). Right = x^(1-17/5) = x^(-12/5). So (7a+3)/5 = -12/5, giving a = -15/7.', long: 'Step 1: Left = x^((7a+3)/5).\nStep 2: Right denominator = x^(17/5).\nStep 3: x/x^(17/5) = x^(-12/5).\nStep 4: 7a+3 = -12.\nStep 5: a = -15/7.' },
      { num: 7, topic: 'geometry', difficulty: 'Medium', text: 'A circle has center (-5,5). Line t is tangent at (6,-1). Which point also lies on line t?', options: ['(0, 11/6)', '(1, 16)', '(12, 10)', '(17, 5)'], answer: 'C', short: 'Radius slope = -6/11. Tangent slope = 11/6. From (6,-1): +6x → +11y → (12,10).', long: 'Step 1: Slope of radius = (-1-5)/(6+5) = -6/11.\nStep 2: Tangent slope = 11/6.\nStep 3: From (6,-1), Δx=6, Δy=11.\nStep 4: Point = (12,10).' },
      { num: 8, topic: 'geometry', difficulty: 'Medium', text: 'In triangle JKL, angle J=90b°, angle K=66a°, angle L=24a°. Which must be true?', options: ['cosL > sinK', 'cosL = sinK', 'cosL < sinK', 'Not enough information'], answer: 'D', short: '90b+90a=180, so a+b=2. This does not fix a single value of a, so K and L are not determined.', long: 'Step 1: 90b+66a+24a=180.\nStep 2: 90a+90b=180, a+b=2.\nStep 3: a is not fixed.\nStep 4: K and L can vary.\nStep 5: Cannot compare cosL and sinK.' },
      { num: 9, topic: 'ratios', difficulty: 'Medium', text: 'Jordan opened an account with $900. After 6 months: +0.8% of original. After that: +0.3% every 2 months. Which equation represents B(x)?', options: ['B(x)=907.2(1.003)^(x/2-3)', 'B(x)=907.2(1.003)^(x/2-6)', 'B(x)=907.2(1.003)^(2x-12)', 'B(x)=907.2(1.003)^(2x-6)'], answer: 'A', short: 'Balance at 6 months = 907.2. Growth 0.3% per 2 months. Periods = (x-6)/2 = x/2-3.', long: 'Step 1: 900×0.008=7.2, balance=907.2.\nStep 2: Factor=1.003 per 2 months.\nStep 3: Periods=(x-6)/2.\nStep 4: B(x)=907.2(1.003)^((x-6)/2).' },
      { num: 10, topic: 'algebra', difficulty: 'Medium', text: '6x⁴+17x²+5 = (3x²+a)(2x²+b) with a,b positive integers, or (3x²+c)(2x²+d) with c,d positive non-integers. What is a+c?', options: ['8.5', '17.5', '7.5', '1'], answer: 'A', short: 'ab=5, 3b+2a=17 → a=1,b=5. For non-integers: cd=5, 3d+2c=17 → c=7.5. a+c=8.5.', long: 'Step 1: ab=5, 3b+2a=17.\nStep 2: a=1,b=5 works.\nStep 3: cd=5, 3d+2c=17.\nStep 4: 3d²-17d+10=0, d=2/3.\nStep 5: c=7.5, a+c=8.5.' },
      { num: 11, topic: 'functions', difficulty: 'Medium', text: 'For polynomial f(x), when divided by x-3 the remainder is 4. Which must be true about y=f(x)?', options: ['Passes through (3,-4)', 'Passes through (-3,4)', 'Passes through (4,3)', 'Passes through (3,4)'], answer: 'D', short: 'Remainder Theorem: f(3)=4. So graph passes through (3,4).', long: 'Step 1: Remainder Theorem: f(a) = remainder when divided by x-a.\nStep 2: Divisor x-3, so a=3.\nStep 3: f(3)=4.\nStep 4: Point is (3,4).' },
      { num: 12, topic: 'algebra', difficulty: 'Medium', text: '0.14x + 0.28y = 0.20(x+y). What volume y of 28% solution mixes with 30 gallons of 14% to produce 20%?', options: ['10.5', '60', '22.5', '45'], answer: 'C', short: 'Plug x=30: 4.2+0.28y=6+0.20y → 0.08y=1.8 → y=22.5.', long: 'Step 1: x=30.\nStep 2: 0.14(30)+0.28y=0.20(30+y).\nStep 3: 4.2+0.28y=6+0.20y.\nStep 4: 0.08y=1.8.\nStep 5: y=22.5.' },
      { num: 13, topic: 'quadratics', difficulty: 'Medium', text: 'f(x) = x²+6x-135. Which form displays the minimum value as a constant?', options: ['f(x)=(x+3)²-144', 'f(x)=(x-3)²-126', 'f(x)=x(x+6)-135', 'f(x)=x²+6x-45'], answer: 'A', short: 'Complete the square: x²+6x=(x+3)²-9. So f(x)=(x+3)²-144. Minimum = -144.', long: 'Step 1: f(x)=x²+6x-135.\nStep 2: Half of 6 = 3.\nStep 3: x²+6x=(x+3)²-9.\nStep 4: f(x)=(x+3)²-144.\nStep 5: Minimum = -144.' },
      { num: 14, topic: 'ratios', difficulty: 'Medium', text: "An object's speed increases at 7.9 m/s². What is this in miles per minute²? (1 mile = 1609 m)", options: ['12711', '17.67', '3.53', '211.85'], answer: 'B', short: '7.9 × (1/1609) × 60² ≈ 17.67. Square the time conversion for acceleration.', long: 'Step 1: 7.9 m/s².\nStep 2: ×(1/1609) for miles.\nStep 3: ×60²=3600 for min².\nStep 4: 7.9×3600/1609≈17.67.' },
      { num: 15, topic: 'quadratics', difficulty: 'Medium', text: '4x²-px+w=-83 has exactly one real solution. p,w are integers. Which is NOT a possible value of w?', options: ['-19', '17', '36', '317'], answer: 'C', short: 'Discriminant=0: p²=16(w+83). w+83 must be perfect square. 36+83=119 — not a perfect square.', long: 'Step 1: 4x²-px+(w+83)=0.\nStep 2: p²-16(w+83)=0.\nStep 3: w+83 must be perfect square.\nStep 4: -19+83=64✓, 17+83=100✓, 36+83=119✗, 317+83=400✓.\nStep 5: w=36 is NOT possible.' },
      { num: 16, topic: 'functions', difficulty: 'Medium', text: 'Graph of y=f(x)-2 shown: decreasing exponential, asymptote y=4, crosses x-axis at (2,0). f(x)=ab^x+c, a,b,c integers, c≥0. Which defines f?', options: ['f(x)=-(2^x)+4', 'f(x)=-(2^x)+5', 'f(x)=-(2^x)+6', 'f(x)=-(3^x)+6'], answer: 'C', short: 'Asymptote of f(x)-2 is y=4, so f has asymptote y=6. f(2)=2. Choice C: -(2²)+6=2. ✓', long: 'Step 1: Graph is f(x)-2.\nStep 2: Asymptote y=4 → f asymptote y=6.\nStep 3: Eliminates A,B.\nStep 4: f(2)-2=0 → f(2)=2.\nStep 5: C: -(4)+6=2 ✓' },
      { num: 17, topic: 'statistics', difficulty: 'Medium', text: 'Graph in t,d-plane with positive linear trend. Line passes near (230,403) and (270,483), slope≈2. Which is the best linear model?', options: ['d=-62.1+2.02t', 'd=162.1+2.02t', 'd=357.8+2.02t', 'd=392.8+2.02t'], answer: 'A', short: 'All have slope 2.02. At t=230: A gives -62.1+464.6=402.5≈403. ✓', long: 'Step 1: All slopes = 2.02.\nStep 2: Use point (230,403).\nStep 3: A: -62.1+2.02(230)=402.5≈403.\nStep 4: Others give too-high values.\nStep 5: A is correct.' },
      { num: 18, topic: 'ratios', difficulty: 'Medium', text: '1 gallon of sealant costs $19, covers 350 sq ft. Deck area = d sq ft. Which equation gives cost c to cover deck TWICE?', options: ['c=350d/19', 'c=700d/19', 'c=19·d/175', 'c=19·d/350'], answer: 'C', short: 'Two coats = 2d sq ft. Gallons = 2d/350 = d/175. Cost = 19·d/175.', long: 'Step 1: Two coats = 2d sq ft.\nStep 2: Gallons = 2d/350.\nStep 3: Simplify = d/175.\nStep 4: Cost = 19×d/175.' },
      { num: 19, topic: 'functions', difficulty: 'Medium', text: 'f(x)=(x-a)(x-b)(x+53), f(-50)>0, f(-48)<0. f(x)÷(x+45) remainder=0. f passes through (c,0), c integer. Largest possible c?', options: ['-52', '-45', '-53', '-54'], answer: 'B', short: 'x+45 remainder 0 → -45 is root. x+53 → -53 root. Sign change between -50,-48 → root at -49. Largest = -45.', long: 'Step 1: f(-45)=0, so -45 is root.\nStep 2: -53 is root.\nStep 3: Sign change → root between -50,-48.\nStep 4: Integer root = -49.\nStep 5: Roots: -53,-49,-45. Largest = -45.' },
      { num: 20, topic: 'geometry', difficulty: 'Medium', text: 'Circle center C=(h,k). A=(h+1,k+√222), angle ACB=90°. What is length AB?', options: ['√446', '2√222', '223√2', '223√3'], answer: 'A', short: 'CA=√(1²+(√222)²)=√223. Angle ACB=90° → AB=r√2=√223·√2=√446.', long: 'Step 1: CA=√(1+222)=√223.\nStep 2: CA=CB=radii.\nStep 3: Angle ACB=90°.\nStep 4: AB=r√2=√223·√2=√446.' }
    ]

    const letters = ['A', 'B', 'C', 'D']
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const margin = 20
    const maxW = 210 - margin * 2

    qs.forEach((q, idx) => {
      if (idx > 0) doc.addPage()
      let y = 20

      const writeLine = (text, size = 11, style = 'normal') => {
        doc.setFontSize(size)
        doc.setFont('helvetica', style)
        doc.setTextColor(0, 0, 0)
        const lines = doc.splitTextToSize(String(text), maxW)
        // Check if we need a new page
        if (y + lines.length * (size * 0.42) > 275) {
          doc.addPage()
          y = 20
        }
        doc.text(lines, margin, y)
        y += lines.length * (size * 0.42) + 1.5
      }

      const blankLine = () => { y += 4 }

      // ## Q1
      writeLine(`## Q${q.num}`, 14, 'bold')
      blankLine()

      // Question text
      writeLine(q.text, 11, 'normal')
      blankLine()

      // ## Options
      writeLine('## Options', 11, 'bold')
      q.options.forEach((opt, i) => writeLine(`${letters[i]}. ${opt}`, 11, 'normal'))
      blankLine()

      // Correct Answer: C
      writeLine(`Correct Answer: ${q.answer}`, 11, 'normal')
      blankLine()

      // Topic: geometry
      writeLine(`Topic: ${q.topic}`, 11, 'normal')
      // Difficulty: Medium
      writeLine(`Difficulty: ${q.difficulty}`, 11, 'normal')
      blankLine()

      // ## Short Explanation
      writeLine('## Short Explanation', 11, 'bold')
      writeLine(q.short, 11, 'normal')
      blankLine()

      // ## Long Explanation
      writeLine('## Long Explanation', 11, 'bold')
      writeLine(q.long, 11, 'normal')

      // Page footer
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`SAT Question Template - Page ${idx + 1}`, 105, 290, { align: 'center' })
    })

    doc.save('mathpix_question_template_20q.pdf')
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
      whenToUse: 'Best when you want to add one carefully crafted question at a time.',
      icon: FiPlus,
      action: () => setModeAndView('single'),
      cta: 'Add a question',
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
      description: 'Upload multiple questions at once using CSV, JSON, or PDF/DOCX files',
      whenToUse: 'Best when importing many questions from a file (CSV, JSON, or PDF/DOCX).',
      icon: FiUpload,
      action: () => setModeAndView('bulk'),
      cta: 'Start bulk upload',
      features: [
        'CSV / JSON / Mathpix import',
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
      whenToUse: 'Best when reviewing, editing, or cleaning up questions you already added.',
      icon: FiSearch,
      action: () => router.push(managePath),
      cta: 'Open library',
      features: [
        'Search and filter',
        'Edit questions',
        'Delete questions',
        'Pagination',
        'Question bank overview'
      ]
    }
  ]

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">{isTutor ? 'Tutor Question Bank' : 'SAT Question Management'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {isTutor ? 'Upload questions specifically for Tutor Mode. These will be kept separate from the main SAT question bank.' : 'Choose how you’d like to work with SAT questions. Upload individual questions, bulk upload from a file, or manage your existing question library.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {navigationCards.map((card) => {
              // Hide "Manage Questions" card if in Tutor mode, since we have a dedicated page for that
              if (isTutor && card.id === 'manage') return null

              const Icon = card.icon
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.action}
                  className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{card.description}</p>
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{card.whenToUse}</p>
                  <ul className="mt-4 space-y-1.5">
                    {card.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-slate-600">
                        <FiCheck className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                    {card.cta}
                    <span aria-hidden="true">&rarr;</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-lg font-bold text-slate-900">Question Management Tips</h2>
            <p className="mt-1 text-sm text-slate-500">A quick guide to choosing the right tool for the job.</p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { icon: FiPlus, title: 'Single Upload', text: 'Perfect for creating detailed questions with rich formatting and immediate preview.' },
                { icon: FiUpload, title: 'Bulk Upload', text: 'Ideal for importing large question sets from existing materials or databases.' },
                { icon: FiEdit, title: 'Manage', text: 'Organize, edit, and maintain your question library with powerful search and filtering.' }
              ].map((tip, i) => {
                const TipIcon = tip.icon
                return (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <TipIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{tip.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const bankSelected = isTutor || !!selectedQuestionBank

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
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
        <div className="mb-6">
          <button
            type="button"
            onClick={() => { setView('landing'); router.replace(pathname) }}
            className="mb-3 inline-flex items-center text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            <FiArrowLeft className="mr-2" />
            <span>Back to {isTutor ? 'Tutor' : 'SAT'} Question Management</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
            {uploadType === 'bulk' ? 'Bulk Question Upload' : 'Single Question Upload'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {uploadType === 'bulk'
              ? 'Import multiple SAT questions at once from a CSV, JSON, or PDF/DOCX file. Follow the steps below.'
              : 'Add an individual SAT question with detailed options and explanations. Follow the steps below.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm mb-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">1</span>
              <h2 className="text-lg font-bold text-slate-900">Select Question Bank <span className="text-rose-500">*</span></h2>
            </div>
            {!isTutor ? (
              <div className="space-y-2">
                <label htmlFor="destination-bank" className="block text-sm font-medium text-slate-600">
                  Choose Destination Bank <span className="text-rose-500">*</span>
                </label>
                <select
                  id="destination-bank"
                  value={selectedQuestionBank}
                  onChange={(e) => setSelectedQuestionBank(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500 ${selectedQuestionBank ? 'border-slate-300' : 'border-rose-300'}`}
                  required
                >
                  <option value="">Select a question bank...</option>
                  {questionBanks.map((bank) => (
                    <option key={bank._id} value={bank._id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {selectedQuestionBank ? (
                  <p className="text-xs text-slate-500">Questions you add below will be saved to this bank.</p>
                ) : (
                  <p className="text-xs text-rose-600" role="alert">Required — pick a bank before uploading questions.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Tutor Question Bank</h3>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-600">
                    Select Subject Database <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className={`flex flex-1 cursor-pointer items-center rounded-lg border p-3 transition-colors ${singleQuestion.subject === 'Math' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="tutorSubject"
                        value="Math"
                        checked={singleQuestion.subject === 'Math'}
                        onChange={(e) => setSingleQuestion(prev => ({ ...prev, subject: e.target.value }))}
                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm font-medium text-slate-900">Math</span>
                    </label>
                    <label className={`flex flex-1 cursor-pointer items-center rounded-lg border p-3 transition-colors ${singleQuestion.subject === 'Reading and Writing' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="tutorSubject"
                        value="Reading and Writing"
                        checked={singleQuestion.subject === 'Reading and Writing'}
                        onChange={(e) => setSingleQuestion(prev => ({ ...prev, subject: e.target.value }))}
                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm font-medium text-slate-900">Reading &amp; Writing</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    Questions will be saved to the <strong className="text-slate-700">{singleQuestion.subject}</strong> section of the Tutor Question Bank.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-6">

            {uploadType === 'bulk' ? (
              <div className="space-y-6">
                {/* Step 2: Choose method */}
                <div>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">2</span>
                    <h2 className="text-lg font-bold text-slate-900">Choose Upload Method</h2>
                  </div>
                  {/* Bulk Upload Tabs */}
                  <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1">
                    <button
                      type="button"
                      onClick={() => setBulkTab('csv')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${bulkTab === 'csv' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      CSV / Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTab('json')}
                      className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${bulkTab === 'json' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <span>&#123;&#125;</span> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTab('mathpix')}
                      className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${bulkTab === 'mathpix' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <FiFile className="h-4 w-4" /> PDF / DOCX (Mathpix)
                    </button>
                  </div>
                </div>

                {bulkTab === 'csv' ? (
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <FiDownload className="mt-0.5 flex-shrink-0 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Download CSV Template</h3>
                      <p className="text-sm text-slate-500">Not sure of the format? Download a template with the correct columns.</p>
                    </div>
                  </div>
                  <button type="button" onClick={downloadTemplate} className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white">
                    <FiDownload /> Download template
                  </button>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">3</span>
                    <h3 className="text-base font-bold text-slate-900">Upload your file</h3>
                  </div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">CSV / Excel File <span className="text-rose-500">*</span></label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                    <FiUpload className="mb-2 h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Click to choose a file or drag it here</span>
                    <span className="mt-1 text-xs text-slate-500">CSV or Excel files only. Maximum file size: 10MB</span>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVFileChange} className="hidden" />
                    {file && (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                        <FiFile className="text-indigo-600" /> {file.name}
                      </span>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Images <span className="text-xs font-normal text-slate-400">(required only if placeholders are used)</span></label>
                  <label htmlFor="images-upload" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                    <input id="images-upload" type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                    <FiImage className="mb-2 h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Click to choose images or drag them here</span>
                    <span className="mt-1 text-xs text-slate-500">
                      Images embedded directly inside Excel cells are extracted automatically.
                      <br />For <code className="rounded bg-slate-200 px-1">[filename.png]</code> placeholders, upload the matching files here.
                    </span>
                  </label>
                  {bulkUpload.images.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-medium text-slate-600">Selected Images ({bulkUpload.images.length}):</h4>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                        {bulkUpload.imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview.url} alt={preview.name} className="h-20 w-full rounded-lg border border-slate-200 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImageAt(index)}
                              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-600 shadow hover:bg-white hover:text-rose-700"
                              aria-label="Remove image"
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                            <div className="absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-slate-900/75 p-1 text-xs text-white">
                              {preview.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {bulkUpload.csvRecords.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">4</span>
                      <h3 className="text-base font-bold text-slate-900">Review parsed questions</h3>
                    </div>
                    <p className="mb-4 text-sm text-slate-500"><strong className="text-slate-700">{bulkUpload.csvRecords.length}</strong> question(s) parsed from your file.</p>
                    {bulkUpload.mapping && (
                      <div className="mb-4">
                        <h4 className="mb-2 text-sm font-medium text-slate-600">Image Mapping Summary</h4>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-slate-600">
                              <span className="font-medium">Total with Images:</span>
                              <span className="ml-2 font-semibold text-slate-900">{bulkUpload.mapping.summary.totalWithImages}</span>
                            </div>
                            <div className="text-emerald-600">
                              <span className="font-medium">Matched:</span>
                              <span className="ml-2 font-semibold">{bulkUpload.mapping.summary.matched}</span>
                            </div>
                            <div className="text-rose-600">
                              <span className="font-medium">Missing:</span>
                              <span className="ml-2 font-semibold">{bulkUpload.mapping.summary.missing}</span>
                            </div>
                          </div>
                          {bulkUpload.mapping.summary.missing > 0 && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2" role="alert">
                              <p className="text-sm text-amber-800">Some questions reference images that were not found. These questions will be created without images.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      <div className="max-h-64 overflow-y-auto overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Row</th>
                              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Question Preview</th>
                              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Image</th>
                              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {bulkUpload.csvRecords.map((record, index) => {
                              const mappingEntry = bulkUpload.mapping?.entries.find(e => e.csvRow === record.row)
                              return (
                                <tr key={index} className="transition-colors hover:bg-indigo-50/40">
                                  <td className="px-4 py-2 text-sm text-slate-700">{record.row}</td>
                                  <td className="max-w-xs truncate px-4 py-2 text-sm text-slate-900" title={record.label}>{record.label}</td>
                                  <td className="px-4 py-2 text-sm text-slate-500">{record.imageFileName || '-'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {mappingEntry ? (
                                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${mappingEntry.status === 'matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {mappingEntry.status === 'matched' ? 'Matched' : 'Missing'}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">No image</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                        Total: {bulkUpload.csvRecords.length} questions
                      </div>
                    </div>
                  </div>
                )}

                {bulkUpload.progress > 0 && (
                  <div className="space-y-2" role="alert">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        Uploading questions...
                      </span>
                      <span className="text-sm font-semibold text-indigo-700">{bulkUpload.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${bulkUpload.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <div>
                  {!bankSelected && <p className="mb-2 text-xs text-rose-600" role="alert">Select a question bank above before previewing.</p>}
                  {!file && <p className="mb-2 text-xs text-slate-500">Choose a CSV/Excel file to enable preview.</p>}
                  <button type="submit" disabled={!file || (!isTutor && !selectedQuestionBank) || uploading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {uploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {uploading ? 'Processing...' : 'Preview Questions'}
                  </button>
                </div>
              </form>
                ) : bulkTab === 'json' ? (
                  /* JSON Upload Tab */
                  <form onSubmit={handleFileUpload} className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl text-indigo-600">&#123;&#125;</span>
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">JSON Upload</h3>
                          <p className="mb-2 text-sm text-slate-500">Upload a <code className="rounded bg-slate-200 px-1">.json</code> file — an array of question objects. Supports the same fields as CSV/Excel.</p>
                          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">{`[
  {
    "question": "Question text here",
    "option a": "...", "option b": "...",
    "option c": "...", "option d": "...",
    "correct answer": "A",
    "difficulty": "Medium",
    "subject": "Math",
    "tags": "algebra",
    "shortexplanation": "...",
    "longexplanation": "..."
  }
]`}</pre>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">3</span>
                        <h3 className="text-base font-bold text-slate-900">Upload your file</h3>
                      </div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">JSON File <span className="text-rose-500">*</span></label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                        <FiUpload className="mb-2 h-8 w-8 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Click to choose a file or drag it here</span>
                        <span className="mt-1 text-xs text-slate-500">JSON files only (.json)</span>
                        <input type="file" accept=".json" onChange={handleCSVFileChange} className="hidden" />
                        {file && (
                          <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                            <FiFile className="text-indigo-600" /> {file.name}
                          </span>
                        )}
                      </label>
                    </div>

                    {bulkUpload.progress > 0 && (
                      <div className="space-y-2" role="alert">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            Processing JSON...
                          </span>
                          <span className="text-sm font-semibold text-indigo-700">{bulkUpload.progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${bulkUpload.progress}%` }}></div>
                        </div>
                      </div>
                    )}

                    <div>
                      {!bankSelected && <p className="mb-2 text-xs text-rose-600" role="alert">Select a question bank above before previewing.</p>}
                      {!file && <p className="mb-2 text-xs text-slate-500">Choose a JSON file to enable preview.</p>}
                      <button type="submit" disabled={!file || (!isTutor && !selectedQuestionBank) || uploading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {uploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        {uploading ? 'Processing...' : 'Preview Questions'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Mathpix DOCX/PDF Tab */
                  <form onSubmit={handleMathpixConvert} className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <FiFile className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" />
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">Mathpix AI Conversion</h3>
                          <p className="text-sm text-slate-500">Upload a DOCX or PDF containing SAT questions. Mathpix will extract text, math formulas, and structure them automatically — then you review before saving.</p>
                        </div>
                      </div>
                    </div>

                    {/* Template Download */}
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <FiDownload className="mt-0.5 flex-shrink-0 text-indigo-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Download PDF Template</h3>
                          <p className="text-sm text-slate-500">Not sure of the format? Download a sample PDF showing Topic, Difficulty, Options, Answer, and Explanations.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={downloadMathpixTemplate}
                        className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                      >
                        <FiDownload /> Download template PDF
                      </button>
                    </div>

                    <div>
                      <label htmlFor="mathpix-subject" className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
                      <select
                        id="mathpix-subject"
                        value={mathpixSubject}
                        onChange={e => setMathpixSubject(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Math">Math</option>
                        <option value="Reading and Writing">Reading and Writing</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">3</span>
                        <h3 className="text-base font-bold text-slate-900">Upload your file</h3>
                      </div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Upload DOCX or PDF <span className="text-rose-500">*</span></label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                        <FiUpload className="mb-2 h-8 w-8 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Click to choose a file or drag it here</span>
                        <span className="mt-1 text-xs text-slate-500">PDF or DOCX files. Questions should be numbered (1. 2. 3.) with options labeled A) B) C) D)</span>
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={e => setMathpixFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        {mathpixFile && (
                          <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                            <FiFile className="text-indigo-600" /> {mathpixFile.name} ({(mathpixFile.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <strong>Required PDF format:</strong>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        <li>Start each question with <code className="rounded bg-amber-100 px-1">## Q1</code>, <code className="rounded bg-amber-100 px-1">## Q2</code> etc.</li>
                        <li>Add <code className="rounded bg-amber-100 px-1">Topic: geometry</code> (algebra, quadratics, functions, etc.)</li>
                        <li>Add <code className="rounded bg-amber-100 px-1">Difficulty: Medium</code> (Easy / Medium / Hard)</li>
                        <li>Label options: <code className="rounded bg-amber-100 px-1">A.</code> <code className="rounded bg-amber-100 px-1">B.</code> <code className="rounded bg-amber-100 px-1">C.</code> <code className="rounded bg-amber-100 px-1">D.</code></li>
                        <li>Mark answer: <code className="rounded bg-amber-100 px-1">Correct Answer: B</code></li>
                        <li>Add <code className="rounded bg-amber-100 px-1">## Short Explanation</code> and <code className="rounded bg-amber-100 px-1">## Long Explanation</code></li>
                        <li>Download the template above to see a full example</li>
                      </ul>
                    </div>

                    {mathpixConverting && (
                      <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50 p-4" role="alert">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3 text-sm font-medium text-indigo-800">
                            <span className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            {mathpixStatus || 'Processing...'}
                          </span>
                          {mathpixProgress > 0 && <span className="text-sm font-semibold text-indigo-700">{mathpixProgress}%</span>}
                        </div>
                        {mathpixProgress > 0 && (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                            <div
                              className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${mathpixProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      {!bankSelected && <p className="mb-2 text-xs text-rose-600" role="alert">Select a question bank above before converting.</p>}
                      {!mathpixFile && <p className="mb-2 text-xs text-slate-500">Choose a PDF or DOCX file to enable conversion.</p>}
                      <button
                        type="submit"
                        disabled={!mathpixFile || mathpixConverting || (!isTutor && !selectedQuestionBank)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mathpixConverting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        {mathpixConverting ? 'Converting...' : 'Convert & Preview Questions'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleSingleQuestionSubmit} className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">2</span>
                  <h2 className="text-lg font-bold text-slate-900">Fill in the Question Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sq-subject" className="block text-sm font-medium text-slate-600 mb-1">Subject <span className="text-rose-500">*</span></label>
                    <select
                      id="sq-subject"
                      value={singleQuestion.subject}
                      onChange={(e) => {
                        const val = e.target.value
                        setSingleQuestion({ ...singleQuestion, subject: val, mathTopic: '', mathSubtopic: '', readingWritingTopic: '' })
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Math">Math</option>
                      <option value="Reading and Writing">Reading and Writing</option>
                    </select>
                  </div>
                </div>

                {singleQuestion.subject === 'Math' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sq-math-topic" className="block text-sm font-medium text-slate-600 mb-1">Math Topic</label>
                      <select
                        id="sq-math-topic"
                        value={singleQuestion.mathTopic}
                        onChange={(e) => {
                          const v = e.target.value
                          setSingleQuestion({ ...singleQuestion, mathTopic: v, mathSubtopic: '' })
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Math Topic</option>
                        {Object.entries(mathSubtopics).map(([key, topic]) => (
                          <option key={key} value={key}>{topic.label}</option>
                        ))}
                      </select>
                    </div>
                    {singleQuestion.mathTopic && Object.keys(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).length > 0 && (
                      <div>
                        <label htmlFor="sq-math-subtopic" className="block text-sm font-medium text-slate-600 mb-1">Math Subtopic</label>
                        <select
                          id="sq-math-subtopic"
                          value={singleQuestion.mathSubtopic}
                          onChange={(e) => setSingleQuestion({ ...singleQuestion, mathSubtopic: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sq-rw-topic" className="block text-sm font-medium text-slate-600 mb-1">Topic</label>
                      <select
                        id="sq-rw-topic"
                        value={singleQuestion.readingWritingTopic}
                        onChange={(e) => setSingleQuestion({ ...singleQuestion, readingWritingTopic: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Topic</option>
                        {Object.entries(readingWritingTopics).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sq-difficulty" className="block text-sm font-medium text-slate-600 mb-1">Difficulty <span className="text-rose-500">*</span></label>
                    <select
                      id="sq-difficulty"
                      value={singleQuestion.difficulty}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, difficulty: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sq-type" className="block text-sm font-medium text-slate-600 mb-1">Question Type <span className="text-rose-500">*</span></label>
                    <select
                      id="sq-type"
                      value={singleQuestion.questionType}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, questionType: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="single">Single Question</option>
                      <option value="passage-based">Passage-based</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="sq-title" className="block text-sm font-medium text-slate-600 mb-1">Question Title <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                  <input
                    id="sq-title"
                    type="text"
                    value={singleQuestion.title}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {singleQuestion.questionType === 'passage-based' && (
                  <div>
                    <label htmlFor="sq-passage" className="block text-sm font-medium text-slate-600 mb-1">Passage Text <span className="text-rose-500">*</span></label>
                    <textarea
                      id="sq-passage"
                      value={singleQuestion.passageText}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, passageText: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      rows={6}
                    />
                    <p className="mt-1 text-xs text-slate-500">The reading passage students will see before the question.</p>
                  </div>
                )}

                <div>
                  <label htmlFor="sq-paragraph" className="block text-sm font-medium text-slate-600 mb-1">Question Paragraph <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                  <textarea
                    id="sq-paragraph"
                    value={singleQuestion.questionParagraph}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, questionParagraph: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="sq-text" className="block text-sm font-medium text-slate-600 mb-1">Question Text <span className="text-rose-500">*</span></label>
                  <textarea
                    id="sq-text"
                    value={singleQuestion.questionText}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, questionText: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sq-image" className="block text-sm font-medium text-slate-600 mb-2">Question Image <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                  <label htmlFor="sq-image" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                    <FiImage className="mb-2 h-7 w-7 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Click to choose an image or drag it here</span>
                    <input id="sq-image" type="file" accept="image/*" onChange={(e) => setSingleQuestion({ ...singleQuestion, questionImage: e.target.files?.[0] || null })} className="hidden" />
                    {singleQuestion.questionImage && (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                        <FiFile className="text-indigo-600" /> {singleQuestion.questionImage.name}
                      </span>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Answer Options <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {singleQuestion.options.map((option, index) => (
                      <div key={index}>
                        <label htmlFor={`sq-option-${index}`} className="mb-1 block text-xs font-medium text-slate-500">Option {String.fromCharCode(65 + index)} <span className="text-rose-500">*</span></label>
                        <input
                          id={`sq-option-${index}`}
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...singleQuestion.options]
                            newOptions[index] = e.target.value
                            setSingleQuestion({ ...singleQuestion, options: newOptions })
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sq-answer" className="block text-sm font-medium text-slate-600 mb-1">Correct Answer <span className="text-rose-500">*</span></label>
                    <select
                      id="sq-answer"
                      value={singleQuestion.correctAnswer}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, correctAnswer: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sq-tags" className="block text-sm font-medium text-slate-600 mb-1">Tags <span className="text-xs font-normal text-slate-400">(comma-separated)</span></label>
                    <input
                      id="sq-tags"
                      type="text"
                      value={singleQuestion.tags}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, tags: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">e.g. algebra, linear-equations</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="sq-explanation" className="block text-sm font-medium text-slate-600 mb-1">Explanation</label>
                  <textarea
                    id="sq-explanation"
                    value={singleQuestion.explanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, explanation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="sq-short" className="block text-sm font-medium text-slate-600 mb-1">Short Explanation</label>
                  <textarea
                    id="sq-short"
                    value={singleQuestion.shortExplanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, shortExplanation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label htmlFor="sq-long" className="block text-sm font-medium text-slate-600 mb-1">Long Explanation</label>
                  <textarea
                    id="sq-long"
                    value={singleQuestion.longExplanation}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, longExplanation: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  {!bankSelected && <p className="mb-2 text-xs text-rose-600" role="alert">Select a question bank above before adding the question.</p>}
                  <button type="submit" disabled={!isTutor && !selectedQuestionBank} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <FiPlus /> Add Question
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">Upload History</h2>
            <p className="mt-1 text-sm text-slate-500">A record of your recent uploads.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">File</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploadHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <FiFile className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No uploads yet</p>
                      <p className="mt-1 text-xs text-slate-400">Your uploaded files and questions will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  uploadHistory.map((upload, index) => (
                    <tr key={upload.id || upload._id || index} className="transition-colors hover:bg-indigo-50/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">{upload.fileName || upload.title || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{upload.questionCount || 1}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${upload.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {upload.status === 'success' ? <FiCheck className="mr-1 inline" /> : <FiX className="mr-1 inline" />}
                          {upload.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
