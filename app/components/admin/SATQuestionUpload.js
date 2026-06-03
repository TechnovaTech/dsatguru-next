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
          alert(
            `❌ UPLOAD BLOCKED — WRONG SUBJECT\n\n` +
            `${error.error}\n\n` +
            `${error.details || ''}\n\n` +
            `✔ Fix: Open your file and make sure every row's "subject" column is exactly "${singleQuestion.subject}" (this bank), then upload again.`
          )
        } else {
          alert(`Preview failed: ${error.error || error.message || 'Unknown error'}\n${error.details || ''}`)
        }
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
          isTutor,
          isAdminTest: !isTutor && isAdminTest
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
        alert(`Upload failed: ${uploadData.error || 'Unknown error'}`)
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
          alert(`Conversion failed: ${pollData.error || 'Unknown error'}`)
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

      alert('Conversion timed out. Please try again with a smaller file.')
    } catch (err) {
      alert(`Conversion failed: ${err.message}`)
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
      alert('Failed to download template')
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
              <div className="space-y-6">
                {/* Bulk Upload Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setBulkTab('csv')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${bulkTab === 'csv' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    CSV / Excel Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTab('json')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${bulkTab === 'json' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <span>&#123;&#125;</span> JSON Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTab('mathpix')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${bulkTab === 'mathpix' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <span>📄</span> DOCX / PDF via Mathpix
                  </button>
                </div>

                {bulkTab === 'csv' ? (
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
                ) : bulkTab === 'json' ? (
                  /* JSON Upload Tab */
                  <form onSubmit={handleFileUpload} className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">&#123;&#125;</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-green-900 mb-1">JSON Upload</h3>
                          <p className="text-sm text-green-700 mb-2">Upload a <code>.json</code> file — an array of question objects. Supports the same fields as CSV/Excel.</p>
                          <pre className="bg-white border border-green-200 rounded p-2 text-xs text-gray-700 overflow-x-auto">{`[
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">JSON File *</label>
                      <div className="border-2 border-dashed border-green-300 rounded-md p-6 text-center">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md">
                            <FiUpload className="mr-2" /> Upload JSON
                          </span>
                          <input type="file" accept=".json" onChange={handleCSVFileChange} className="hidden" />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">JSON files only (.json)</p>
                        {file && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
                            <FiFile /> {file.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {bulkUpload.progress > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <FiUpload className="text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-800">Processing JSON...</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded h-2">
                          <div className="h-2 bg-green-600 rounded" style={{ width: `${bulkUpload.progress}%` }}></div>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={!file || (!isTutor && !selectedQuestionBank) || uploading} className="w-full bg-green-600 text-white py-2 rounded-md">
                      {uploading ? 'Processing...' : 'Preview Questions'}
                    </button>
                  </form>
                ) : (
                  /* Mathpix DOCX/PDF Tab */
                  <form onSubmit={handleMathpixConvert} className="space-y-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🔬</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-purple-900 mb-1">Mathpix AI Conversion</h3>
                          <p className="text-sm text-purple-700">Upload a DOCX or PDF containing SAT questions. Mathpix will extract text, math formulas, and structure them automatically — then you review before saving.</p>
                        </div>
                      </div>
                    </div>

                    {/* Template Download */}
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <FiDownload className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-green-900 mb-1">Download PDF Template</h3>
                          <p className="text-sm text-green-700 mb-3">Download a sample PDF showing the exact format your questions should follow — including Topic, Difficulty, Options, Answer, and Explanations.</p>
                          <button
                            type="button"
                            onClick={downloadMathpixTemplate}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                          >
                            <FiDownload className="mr-2" /> Download Template PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select
                          value={mathpixSubject}
                          onChange={e => setMathpixSubject(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="Math">Math</option>
                          <option value="Reading and Writing">Reading and Writing</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload DOCX or PDF *</label>
                      <div className="border-2 border-dashed border-purple-300 rounded-md p-6 text-center">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md">
                            <FiUpload className="mr-2" /> Choose File
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={e => setMathpixFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">PDF or DOCX files. Questions should be numbered (1. 2. 3.) with options labeled A) B) C) D)</p>
                        {mathpixFile && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
                            <FiFile /> {mathpixFile.name} ({(mathpixFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                      <strong>Required PDF format:</strong>
                      <ul className="mt-1 list-disc pl-4 space-y-1">
                        <li>Start each question with <code>## Q1</code>, <code>## Q2</code> etc.</li>
                        <li>Add <code>Topic: geometry</code> (algebra, quadratics, functions, etc.)</li>
                        <li>Add <code>Difficulty: Medium</code> (Easy / Medium / Hard)</li>
                        <li>Label options: <code>A.</code> <code>B.</code> <code>C.</code> <code>D.</code></li>
                        <li>Mark answer: <code>Correct Answer: B</code></li>
                        <li>Add <code>## Short Explanation</code> and <code>## Long Explanation</code></li>
                        <li>Download the template above to see a full example</li>
                      </ul>
                    </div>

                    {mathpixConverting && (
                      <div className="space-y-2 p-4 bg-purple-50 rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent flex-shrink-0"></div>
                          <span className="text-sm text-purple-800 font-medium">{mathpixStatus || 'Processing...'}</span>
                        </div>
                        {mathpixProgress > 0 && (
                          <div className="w-full bg-purple-100 rounded-full h-2">
                            <div
                              className="h-2 bg-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${mathpixProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!mathpixFile || mathpixConverting || (!isTutor && !selectedQuestionBank)}
                      className="w-full bg-purple-600 text-white py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                    >
                      {mathpixConverting ? 'Converting...' : 'Convert & Preview Questions'}
                    </button>
                  </form>
                )}
              </div>
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
