
'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiCheckCircle, FiBook, FiCpu, FiTarget, FiTrendingUp, FiDownload, FiShare2, FiX, FiUser } from 'react-icons/fi'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { useToast } from '../../../components/ui/UIProvider'
// Shared College-Board-aligned topic/subtopic breakdown, identical on every analysis screen.
import SatScoreAnalysis from '../../../components/SatScoreAnalysis'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function StudentAnalysisDetail() {
  const toast = useToast()
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const contentRef = useRef(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTab, setShareTab] = useState('student')
  const [students, setStudents] = useState([])
  const [tutors, setTutors] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [shareMessage, setShareMessage] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sendingPDF, setSendingPDF] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/admin/student-analysis/${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) {
        throw new Error('Failed to load analysis')
      }
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching analysis:', error)
      setError('Failed to load student analysis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id])

  // Close share modal on Escape key
  useEffect(() => {
    if (!showShareModal) return
    const onKey = (e) => { if (e.key === 'Escape') setShowShareModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showShareModal])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem('token')
      const [studentsRes, tutorsRes] = await Promise.all([
        fetch('/api/admin/users?role=Student', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users?role=Tutor', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (studentsRes.ok) setStudents(await studentsRes.json())
      if (tutorsRes.ok) setTutors(await tutorsRes.json())
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
        <p className="text-slate-600">{error || 'Student not found'}</p>
        {error && (
          <button
            onClick={fetchData}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const {
    user = {},
    practiceCounts = {},
    subjectStats = {},
    topicStats = [],
    difficultyStats = {},
    performanceHistory = [],
    scaledScores = {},
    taxonomyRows = []
  } = data

  const mathStats = subjectStats.Math || { score: 0, total: 0, correct: 0 }
  const rwStats = subjectStats['Reading and Writing'] || { score: 0, total: 0, correct: 0 }
  const hasScaled = !!(scaledScores && scaledScores.total)
  const hasScaledTrend = (performanceHistory || []).some(h => h.scaledTotal)

  // Load an image (from /public) into a dataURL + natural size for the PDF
  const loadImage = (src) => new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          c.getContext('2d').drawImage(img, 0, 0)
          resolve({ dataUrl: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = src
    } catch { resolve(null) }
  })

  // Build a proper, branded vector PDF (no screenshot)
  const buildPdf = async () => {
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF('p', 'mm', 'a4')
    const W = 210, H = 297, M = 14

    // palette
    const INDIGO = [79, 70, 229]
    const SLATE900 = [15, 23, 42]
    const SLATE600 = [71, 85, 105]
    const SLATE500 = [100, 116, 139]
    const SLATE200 = [226, 232, 240]
    const SLATE50 = [248, 250, 252]
    const BLUE = [37, 99, 235]
    const PURPLE = [147, 51, 234]
    const EMERALD = [16, 185, 129]
    const AMBER = [217, 119, 6]
    const RED = [220, 38, 38]

    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    // Business details (update `address` here when a postal address is available)
    const BUSINESS = {
      name: 'DSATGURU',
      tagline: 'Score Higher, Dream Bigger',
      email: 'info@dsatguru.com',
      phone: '1-329-239-8577',
      website: 'www.dsatguru.com',
      hours: 'Mon - Sat: 9:00 AM - 8:00 PM',
      address: '', // e.g. '123 Main St, City, State, ZIP'
      maps: 'maps.app.goo.gl/1u9TRFga5tZzcW276',
    }

    let y = 0

    const drawBar = (x, by, w, pct, color) => {
      doc.setFillColor(...SLATE200)
      doc.roundedRect(x, by, w, 3, 1.5, 1.5, 'F')
      const fw = Math.max(0, Math.min(100, pct)) / 100 * w
      if (fw > 0) { doc.setFillColor(...color); doc.roundedRect(x, by, Math.max(2, fw), 3, 1.5, 1.5, 'F') }
    }
    const sectionTitle = (text) => {
      ensure(14)
      doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
      doc.text(text, M, y)
      doc.setDrawColor(...SLATE200); doc.setLineWidth(0.4); doc.line(M, y + 2, W - M, y + 2)
      y += 9
    }
    const ensure = (need) => { if (y + need > H - 20) { doc.addPage(); y = 20 } }

    // ===== Header band =====
    doc.setFillColor(...INDIGO)
    doc.rect(0, 0, W, 34, 'F')
    const logo = await loadImage('/logo-dsg-white.png')
    if (logo && logo.h) {
      const lh = 13, lw = lh * (logo.w / logo.h)
      doc.addImage(logo.dataUrl, 'PNG', M, 10, lw, lh)
    } else {
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
      doc.text('DSATGURU', M, 19)
    }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text('Score Higher, Dream Bigger', M, 28)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('Student Performance Report', W - M, 15, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    doc.text(`Generated: ${todayStr}`, W - M, 22, { align: 'right' })

    y = 44

    // ===== Student info card =====
    doc.setFillColor(...SLATE50); doc.setDrawColor(...SLATE200); doc.setLineWidth(0.3)
    doc.roundedRect(M, y, W - 2 * M, 22, 2.5, 2.5, 'FD')
    doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text(user?.name || 'Student', M + 6, y + 10)
    doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    doc.text(`${user?.email || ''}   •   ${user?.role || 'Student'}`, M + 6, y + 16.5)
    // overall accuracy badge (right)
    const totAtt = (subjectStats?.Math?.total || 0) + (subjectStats?.['Reading and Writing']?.total || 0)
    const totCor = (subjectStats?.Math?.correct || 0) + (subjectStats?.['Reading and Writing']?.correct || 0)
    const overall = totAtt ? Math.round((totCor / totAtt) * 100) : 0
    doc.setTextColor(...INDIGO); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
    doc.text(`${overall}%`, W - M - 6, y + 11, { align: 'right' })
    doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text('Overall Accuracy', W - M - 6, y + 17, { align: 'right' })
    y += 30

    // ===== Practice summary =====
    sectionTitle('Practice Summary')
    const counts = [
      ['Admin Tests', practiceCounts?.adminTest || 0],
      ['Adaptive Tests', practiceCounts?.adaptiveTest || 0],
      ['Tutor Tests', practiceCounts?.tutorTest || 0],
      ['Module Tests', practiceCounts?.tutorModuleTest || 0],
    ]
    const gap = 4
    const bw = (W - 2 * M - 3 * gap) / 4
    counts.forEach(([label, val], i) => {
      const x = M + i * (bw + gap)
      doc.setFillColor(...SLATE50); doc.setDrawColor(...SLATE200); doc.roundedRect(x, y, bw, 19, 2, 2, 'FD')
      doc.setTextColor(...INDIGO); doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
      doc.text(String(val), x + bw / 2, y + 10, { align: 'center' })
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      doc.text(label, x + bw / 2, y + 15.5, { align: 'center' })
    })
    y += 27

    // ===== Subject performance (two columns) =====
    sectionTitle('Subject Performance')
    const subjects = [
      ['Math', subjectStats?.Math, BLUE],
      ['Reading & Writing', subjectStats?.['Reading and Writing'], PURPLE],
    ]
    const scw = (W - 2 * M - 6) / 2
    subjects.forEach(([name, st, color], i) => {
      const s = st || { score: 0, total: 0, correct: 0 }
      const x = M + i * (scw + 6)
      doc.setFillColor(...SLATE50); doc.setDrawColor(...SLATE200); doc.roundedRect(x, y, scw, 22, 2.5, 2.5, 'FD')
      doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text(name, x + 5, y + 8)
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(`${s.correct}/${s.total} correct`, x + scw - 5, y + 8, { align: 'right' })
      drawBar(x + 5, y + 13, scw - 10 - 14, s.score, color)
      doc.setTextColor(...color); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text(`${s.score}%`, x + scw - 5, y + 15.5, { align: 'right' })
    })
    y += 30

    // ===== Difficulty =====
    sectionTitle('Performance by Difficulty')
    const diffs = [['Easy', EMERALD], ['Medium', AMBER], ['Hard', RED]]
    const dbw = (W - 2 * M - 2 * gap) / 3
    diffs.forEach(([lvl, color], i) => {
      const st = difficultyStats?.[lvl] || { total: 0, correct: 0 }
      const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0
      const x = M + i * (dbw + gap)
      doc.setFillColor(...SLATE50); doc.setDrawColor(...SLATE200); doc.roundedRect(x, y, dbw, 26, 2, 2, 'FD')
      doc.setTextColor(...color); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text(lvl.toUpperCase(), x + 5, y + 7)
      doc.setTextColor(...SLATE900); doc.setFontSize(15)
      doc.text(`${pct}%`, x + 5, y + 14.5)
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(`${st.correct}/${st.total} correct`, x + 5, y + 19.5)
      drawBar(x + 5, y + 22, dbw - 10, pct, color)
    })
    y += 30

    // ===== Bottom row: Performance Trend (left) + Topic Mastery (right) =====
    const colGap = 8
    const leftW = 104
    const rightX = M + leftW + colGap
    const rightW = W - M - rightX
    doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('Performance Trend', M, y)
    doc.text('Topic Mastery', rightX, y)
    doc.setDrawColor(...SLATE200); doc.setLineWidth(0.4)
    doc.line(M, y + 2, M + leftW, y + 2)
    doc.line(rightX, y + 2, W - M, y + 2)
    y += 9
    const rowTop = y

    // trend (left column)
    const hist = performanceHistory || []
    if (!hist.length) {
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
      doc.text('No test history yet.', M, rowTop + 8)
    } else {
      const cx = M, cy = rowTop, cw = leftW, ch = 44
      doc.setDrawColor(...SLATE200); doc.setLineWidth(0.2)
      for (let g = 0; g <= 4; g++) {
        const gy = cy + ch - (g / 4) * ch
        doc.line(cx, gy, cx + cw, gy)
        doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
        doc.text(String(g * 25), cx - 2, gy + 1, { align: 'right' })
      }
      const n = hist.length
      const stepX = n > 1 ? cw / (n - 1) : 0
      const pts = hist.map((h, i) => [cx + i * stepX, cy + ch - (Math.max(0, Math.min(100, h.score)) / 100) * ch])
      doc.setDrawColor(...INDIGO); doc.setLineWidth(0.7)
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
      doc.setFillColor(...INDIGO); pts.forEach((p) => doc.circle(p[0], p[1], 0.9, 'F'))
      doc.setTextColor(...SLATE500); doc.setFontSize(6.5)
      doc.text(String(hist[0].date), cx, cy + ch + 4)
      if (n > 2) doc.text(String(hist[Math.floor(n / 2)].date), cx + cw / 2, cy + ch + 4, { align: 'center' })
      doc.text(String(hist[n - 1].date), cx + cw, cy + ch + 4, { align: 'right' })
    }

    // topics (right column)
    const topics = (topicStats || []).slice(0, 6)
    if (!topics.length) {
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
      doc.text('No topic data yet.', rightX, rowTop + 8)
    } else {
      let ty2 = rowTop + 2
      topics.forEach((t) => {
        doc.setTextColor(...SLATE600); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
        doc.text(String(t.name || '').slice(0, 14), rightX, ty2 + 2)
        const bx = rightX + 30, bw2 = rightW - 30 - 9
        drawBar(bx, ty2, bw2, t.score, EMERALD)
        doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
        doc.text(`${t.score}%`, W - M, ty2 + 2, { align: 'right' })
        ty2 += 7
      })
    }
    y = rowTop + 52

    // ===== Page 2: Terms & Disclaimer (pinned to the bottom) =====
    const year = new Date().getFullYear()
    const terms = [
      'This report is auto-generated by the DSATGURU platform from the student’s recorded practice and test activity as of the date shown above.',
      'Scores and analytics are based on attempted questions only and indicate practice performance. They are not official SAT® / PSAT® scores and do not guarantee any future result.',
      'SAT® and PSAT/NMSQT® are trademarks of the College Board, which is not affiliated with and does not endorse DSATGURU.',
      'This document is confidential and intended only for the named student and their authorized parents/guardians and tutors. Please do not redistribute without consent.',
      `For questions about this report, contact ${BUSINESS.email}.  © ${year} ${BUSINESS.name}. All rights reserved.`,
    ]
    doc.addPage()

    // ---- Page 2 header ----
    let py = 20
    doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('Detailed Performance Breakdown', M, py)
    doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`${user?.name || 'Student'}   •   ${user?.email || ''}`, M, py + 6)
    doc.setDrawColor(...SLATE200); doc.setLineWidth(0.4); doc.line(M, py + 9, W - M, py + 9)
    py += 16

    const p2Title = (text) => {
      doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
      doc.text(text, M, py)
      doc.setDrawColor(...SLATE200); doc.setLineWidth(0.4); doc.line(M, py + 2, W - M, py + 2)
      py += 8
    }

    // ---- Test History ----
    p2Title('Test History')
    const histRows = (performanceHistory || []).slice(-6)
    if (!histRows.length) {
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
      doc.text('No test history yet.', M, py + 4); py += 10
    } else {
      doc.setFillColor(...SLATE50); doc.rect(M, py, W - 2 * M, 7, 'F')
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
      doc.text('DATE', M + 3, py + 4.7)
      doc.text('SUBJECT', M + 48, py + 4.7)
      doc.text('ACCURACY', W - M - 3, py + 4.7, { align: 'right' })
      py += 7
      histRows.forEach((h, idx) => {
        if (idx % 2 === 1) { doc.setFillColor(250, 250, 252); doc.rect(M, py, W - 2 * M, 7, 'F') }
        doc.setTextColor(...SLATE600); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        doc.text(String(h.date || '—'), M + 3, py + 4.7)
        doc.text(String(h.subject || '—'), M + 48, py + 4.7)
        const barW = 38
        drawBar(W - M - 3 - 14 - barW, py + 2.6, barW, h.score, INDIGO)
        doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
        doc.text(`${h.score}%`, W - M - 3, py + 4.7, { align: 'right' })
        py += 7
      })
      py += 5
    }

    // ---- Strengths & Focus Areas ----
    p2Title('Strengths & Focus Areas')
    const sortedDesc = [...(topicStats || [])].sort((a, b) => b.score - a.score)
    const strengths = sortedDesc.slice(0, 3)
    const focus = sortedDesc.slice(-3).reverse().filter((t) => !strengths.some((s) => s.name === t.name))
    const colW = (W - 2 * M - 6) / 2
    const fx = M + colW + 6
    doc.setTextColor(...EMERALD); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text('STRENGTHS', M, py + 2)
    doc.setTextColor(...RED); doc.text('FOCUS AREAS', fx, py + 2)
    py += 7
    const rowCount = Math.max(strengths.length, focus.length, 1)
    for (let i = 0; i < rowCount; i++) {
      if (strengths[i]) {
        doc.setTextColor(...SLATE600); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        doc.text('•  ' + String(strengths[i].name).slice(0, 22), M, py + 2)
        doc.setTextColor(...EMERALD); doc.setFont('helvetica', 'bold')
        doc.text(`${strengths[i].score}%`, M + colW - 2, py + 2, { align: 'right' })
      }
      if (focus[i]) {
        doc.setTextColor(...SLATE600); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        doc.text('•  ' + String(focus[i].name).slice(0, 22), fx, py + 2)
        doc.setTextColor(...RED); doc.setFont('helvetica', 'bold')
        doc.text(`${focus[i].score}%`, W - M - 2, py + 2, { align: 'right' })
      }
      py += 6
    }
    py += 4

    // ---- Recommended Next Steps (auto-derived) ----
    p2Title('Recommended Next Steps')
    const subjScore = (k) => subjectStats?.[k]?.score ?? 0
    const weakestSubject = subjScore('Math') <= subjScore('Reading and Writing') ? 'Math' : 'Reading & Writing'
    const weakestSubjectScore = Math.min(subjScore('Math'), subjScore('Reading and Writing'))
    const diffPct = (k) => { const s = difficultyStats?.[k]; return s && s.total ? Math.round((s.correct / s.total) * 100) : null }
    const diffRanked = ['Easy', 'Medium', 'Hard'].map((k) => [k, diffPct(k)]).filter(([, v]) => v !== null).sort((a, b) => a[1] - b[1])
    const weakestTopic = [...(topicStats || [])].sort((a, b) => a.score - b.score)[0]
    const recs = [
      `Focus on ${weakestSubject} — current accuracy is ${weakestSubjectScore}%. Targeted practice here lifts the overall score fastest.`,
    ]
    if (diffRanked[0]) recs.push(`Prioritise ${diffRanked[0][0]}-level questions (${diffRanked[0][1]}% correct) to close the biggest gap.`)
    if (weakestTopic) recs.push(`Revise the topic “${weakestTopic.name}” (${weakestTopic.score}%) with focused drills and a review of past mistakes.`)
    recs.push('Take a full-length practice test regularly to build stamina and track week-over-week improvement.')
    doc.setTextColor(...SLATE600); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    recs.forEach((r) => {
      const lines = doc.splitTextToSize(r, W - 2 * M - 5)
      doc.setFillColor(...INDIGO); doc.circle(M + 1.2, py - 1.2, 0.6, 'F')
      doc.text(lines, M + 5, py)
      py += lines.length * 4.2 + 1.8
    })

    // ---- Terms & Disclaimer (below the content, pinned toward the bottom) ----
    const tFont = 8, tLineH = 4.2, tParaGap = 2.6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tFont)
    const wrapped = terms.map((t) => doc.splitTextToSize(t, W - 2 * M - 5))
    const blockH = 11 + wrapped.reduce((s, lines) => s + lines.length * tLineH + tParaGap, 0)
    let ty = Math.max(py + 6, (H - 26) - blockH)
    doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('Terms & Disclaimer', M, ty)
    doc.setDrawColor(...SLATE200); doc.setLineWidth(0.4); doc.line(M, ty + 2, W - M, ty + 2)
    ty += 9
    wrapped.forEach((lines) => {
      doc.setFillColor(...INDIGO); doc.circle(M + 1.2, ty - 1.4, 0.6, 'F')
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(tFont)
      doc.text(lines, M + 5, ty)
      ty += lines.length * tLineH + tParaGap
    })

    // ===== Footer — contact block only on the second (last) page =====
    const addressLine = BUSINESS.address ? BUSINESS.address : `Location: ${BUSINESS.maps}`
    const contactLine = `${BUSINESS.email}    |    ${BUSINESS.phone}    |    ${BUSINESS.website}`
    const metaLine = `${addressLine}    |    ${BUSINESS.hours}`
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setDrawColor(...SLATE200); doc.setLineWidth(0.3); doc.line(M, H - 20, W - M, H - 20)
      doc.setTextColor(...SLATE900); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text(`${BUSINESS.name} — ${BUSINESS.tagline}`, M, H - 13)
      doc.setTextColor(...SLATE500); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      doc.text(`Page ${p} of ${pages}`, W - M, H - 13, { align: 'right' })
      if (p === pages) {
        doc.text(contactLine, W / 2, H - 8.5, { align: 'center' })
        doc.text(metaLine, W / 2, H - 4.5, { align: 'center' })
      }
    }

    return doc
  }

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const doc = await buildPdf()
      const date = new Date().toISOString().split('T')[0]
      doc.save(`${user.name}_Analysis_Report_${date}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  const generatePDFBlob = async () => {
    const doc = await buildPdf()
    return doc.output('blob')
  }

  const handleSharePDF = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to share with')
      return
    }
    if (!shareMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSendingPDF(true)
    try {
      const pdfBlob = await generatePDFBlob()
      const formData = new FormData()
      const date = new Date().toISOString().split('T')[0]
      formData.append('pdf', pdfBlob, `${user.name}_Analysis_Report_${date}.pdf`)
      formData.append('userIds', JSON.stringify(selectedUsers))
      formData.append('message', shareMessage)
      formData.append('studentName', user.name)
      formData.append('subject', 'Analysis Report')
      formData.append('testDate', date)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/share-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (res.ok) {
        toast.success('PDF shared successfully!')
        setShowShareModal(false)
        setSelectedUsers([])
        setShareMessage('')
      } else {
        toast.error('Failed to share PDF')
      }
    } catch (error) {
      console.error('Error sharing PDF:', error)
      toast.error('Failed to share PDF')
    } finally {
      setSendingPDF(false)
    }
  }

  const handleOpenShareModal = () => {
    setShowShareModal(true)
    fetchUsers()
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    setShareMessage(`Hi,\n\nI'm sharing the comprehensive analysis report for ${user.name}.\n\nReport Date: ${reportDate}\n\nThis report includes:\n• Performance metrics across subjects\n• Topic mastery analysis\n• Difficulty-based performance\n• Progress trends\n\nPlease review the attached PDF.`)
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6" ref={contentRef}>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} aria-label="Go back" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <FiArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{user.name}</h1>
              <p className="text-sm text-slate-500">{user.email} • {user.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              <FiDownload className="w-5 h-5" />
              {downloading ? 'Generating PDF...' : 'Download Report'}
            </button>
            <button
              onClick={handleOpenShareModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              <FiShare2 className="w-5 h-5" />
              Share Report
            </button>
          </div>
        </div>

        {/* Practice Type Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Admin Test</p>
              <h3 className="text-2xl font-bold text-emerald-600">{practiceCounts.adminTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Adaptive Test</p>
              <h3 className="text-2xl font-bold text-teal-600">{practiceCounts.adaptiveTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
              <FiCpu className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Tutor Test</p>
              <h3 className="text-2xl font-bold text-blue-600">{practiceCounts.tutorTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <FiBook className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Tutor Module Test</p>
              <h3 className="text-2xl font-bold text-indigo-600">{practiceCounts.tutorModuleTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <FiBook className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Scaled SAT Scores (200-800 sections / 400-1600 total) */}
        {hasScaled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Scaled Score</p>
                <h3 className="text-3xl font-bold text-indigo-600">
                  {scaledScores.total}<span className="text-base font-medium text-slate-400"> / 1600</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Latest completed test</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <FiTrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Math (Scaled)</p>
              <h3 className="text-3xl font-bold text-blue-600">
                {scaledScores.math || '—'}<span className="text-base font-medium text-slate-400"> / 800</span>
              </h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Reading &amp; Writing (Scaled)</p>
              <h3 className="text-3xl font-bold text-indigo-600">
                {scaledScores.rw || '—'}<span className="text-base font-medium text-slate-400"> / 800</span>
              </h3>
            </div>
          </div>
        )}

        {/* Subject Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Math */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Math Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-slate-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-blue-500"
                                strokeDasharray={`${mathStats.score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-blue-600">{mathStats.score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Questions Attempted: <span className="font-semibold text-slate-800">{mathStats.total}</span></p>
                        <p className="text-sm text-slate-500">Correct: <span className="font-semibold text-emerald-600">{mathStats.correct}</span></p>
                    </div>
                </div>
            </div>

            {/* Reading & Writing */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Reading & Writing Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-slate-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-indigo-500"
                                strokeDasharray={`${rwStats.score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-indigo-600">{rwStats.score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Questions Attempted: <span className="font-semibold text-slate-800">{rwStats.total}</span></p>
                        <p className="text-sm text-slate-500">Correct: <span className="font-semibold text-emerald-600">{rwStats.correct}</span></p>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance History */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FiTrendingUp /> Performance Trend
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceHistory}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="acc" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                            {hasScaledTrend && (
                                <YAxis yAxisId="scaled" orientation="right" domain={[400, 1600]} fontSize={12} tickLine={false} axisLine={false} />
                            )}
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend />
                            <Line yAxisId="acc" type="monotone" dataKey="score" name="Accuracy %" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            {hasScaledTrend && (
                                <Line yAxisId="scaled" type="monotone" dataKey="scaledTotal" name="Scaled Total (/1600)" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Topic Performance */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FiTarget /> Topic Mastery
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topicStats.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={120} fontSize={11} tickLine={false} axisLine={false} />
                            <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="score" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance by Difficulty</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Easy', 'Medium', 'Hard'].map((level) => {
                    const stats = difficultyStats[level] || { total: 0, correct: 0 }
                    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                    const color = level === 'Easy' ? 'text-emerald-600' : level === 'Medium' ? 'text-amber-600' : 'text-red-600'
                    const bg = level === 'Easy' ? 'bg-emerald-50' : level === 'Medium' ? 'bg-amber-50' : 'bg-red-50'

                    return (
                        <div key={level} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                            <div>
                                <span className={`text-sm font-bold px-2 py-1 rounded-full ${bg} ${color}`}>{level}</span>
                                <div className="mt-2 text-2xl font-bold text-slate-800">{percentage}%</div>
                                <div className="text-xs text-slate-500">{stats.correct}/{stats.total} Correct</div>
                            </div>
                            <div className={`h-2 w-full max-w-[60px] rounded-full bg-slate-200 overflow-hidden`}>
                                <div className={`h-full ${level === 'Easy' ? 'bg-emerald-500' : level === 'Medium' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Full Content Domain / Skill breakdown across every question this student answered. */}
        <div className="mt-6">
          <SatScoreAnalysis
            rows={taxonomyRows}
            scores={hasScaled ? { total: scaledScores.total, rw: scaledScores.rw ?? null, math: scaledScores.math ?? null } : null}
            subtitle={`Every question ${user?.name || 'this student'} has answered, by Subject, Content Domain & Skill (College Board aligned)`}
          />
        </div>

      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Share Analysis Report</h2>
              <button onClick={() => setShowShareModal(false)} aria-label="Close dialog" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="border-b border-slate-100">
              <div className="flex">
                <button
                  onClick={() => setShareTab('student')}
                  className={`flex-1 px-6 py-3 font-medium transition-colors border-b-2 ${shareTab === 'student' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                >
                  Students
                </button>
                <button
                  onClick={() => setShareTab('tutor')}
                  className={`flex-1 px-6 py-3 font-medium transition-colors border-b-2 ${shareTab === 'tutor' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                >
                  Tutors
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="text-sm text-slate-500">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(shareTab === 'student' ? students : tutors).map(user => (
                    <label
                      key={user._id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(user._id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleUserSelection(user._id)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </label>
                  ))}
                  {(shareTab === 'student' ? students : tutors).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                        <FiUser size={26} />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No {shareTab}s found</p>
                      <p className="mt-1 text-sm text-slate-400">There are no {shareTab}s available to share with.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="mb-4">
                <label htmlFor="share-message" className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea
                  id="share-message"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Enter a message to send with the PDF..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {selectedUsers.length} user(s) selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSharePDF}
                    disabled={sendingPDF || selectedUsers.length === 0}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {sendingPDF ? 'Sending...' : 'Send PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
