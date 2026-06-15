
'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiCheckCircle, FiBook, FiCpu, FiTarget, FiTrendingUp, FiDownload, FiShare2, FiX } from 'react-icons/fi'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function StudentAnalysisDetail() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/student-analysis/${params.id}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (error) {
        console.error('Error fetching analysis:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center">Student not found</div>

  const { user, practiceCounts, subjectStats, topicStats, difficultyStats, performanceHistory } = data

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      const element = contentRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      
      const date = new Date().toISOString().split('T')[0]
      pdf.save(`${user.name}_Analysis_Report_${date}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  const generatePDFBlob = async () => {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default
    
    const element = contentRef.current
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f9fafb'
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgX = (pdfWidth - imgWidth * ratio) / 2
    const imgY = 10
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
    return pdf.output('blob')
  }

  const handleSharePDF = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to share with')
      return
    }
    if (!shareMessage.trim()) {
      alert('Please enter a message')
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
        alert('PDF shared successfully!')
        setShowShareModal(false)
        setSelectedUsers([])
        setShareMessage('')
      } else {
        alert('Failed to share PDF')
      }
    } catch (error) {
      console.error('Error sharing PDF:', error)
      alert('Failed to share PDF')
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
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6" ref={contentRef}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500">{user.email} • {user.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              <FiDownload className="w-5 h-5" />
              {downloading ? 'Generating PDF...' : 'Download Report'}
            </button>
            <button
              onClick={handleOpenShareModal}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
            >
              <FiShare2 className="w-5 h-5" />
              Share Report
            </button>
          </div>
        </div>

        {/* Practice Type Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Admin Test</p>
              <h3 className="text-2xl font-bold text-green-600">{practiceCounts.adminTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Adaptive Test</p>
              <h3 className="text-2xl font-bold text-teal-600">{practiceCounts.adaptiveTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
              <FiCpu className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tutor Test</p>
              <h3 className="text-2xl font-bold text-blue-600">{practiceCounts.tutorTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <FiBook className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tutor Module Test</p>
              <h3 className="text-2xl font-bold text-purple-600">{practiceCounts.tutorModuleTest || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <FiBook className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Math */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Math Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-blue-500"
                                strokeDasharray={`${subjectStats.Math.score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-blue-600">{subjectStats.Math.score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Questions Attempted: <span className="font-semibold text-gray-800">{subjectStats.Math.total}</span></p>
                        <p className="text-sm text-gray-500">Correct: <span className="font-semibold text-green-600">{subjectStats.Math.correct}</span></p>
                    </div>
                </div>
            </div>

            {/* Reading & Writing */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Reading & Writing Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-purple-500"
                                strokeDasharray={`${subjectStats['Reading and Writing'].score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-purple-600">{subjectStats['Reading and Writing'].score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Questions Attempted: <span className="font-semibold text-gray-800">{subjectStats['Reading and Writing'].total}</span></p>
                        <p className="text-sm text-gray-500">Correct: <span className="font-semibold text-green-600">{subjectStats['Reading and Writing'].correct}</span></p>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance History */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTrendingUp /> Performance Trend
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceHistory}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Topic Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Performance by Difficulty</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Easy', 'Medium', 'Hard'].map((level) => {
                    const stats = difficultyStats[level] || { total: 0, correct: 0 }
                    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                    const color = level === 'Easy' ? 'text-green-600' : level === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                    const bg = level === 'Easy' ? 'bg-green-100' : level === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
                    
                    return (
                        <div key={level} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                            <div>
                                <span className={`text-sm font-bold px-2 py-1 rounded ${bg} ${color}`}>{level}</span>
                                <div className="mt-2 text-2xl font-bold text-gray-800">{percentage}%</div>
                                <div className="text-xs text-gray-500">{stats.correct}/{stats.total} Correct</div>
                            </div>
                            <div className={`h-2 w-full max-w-[60px] rounded-full bg-gray-200 overflow-hidden`}>
                                <div className={`h-full ${level === 'Easy' ? 'bg-green-500' : level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Share Analysis Report</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setShareTab('student')}
                  className={`flex-1 px-6 py-3 font-medium transition-colors ${shareTab === 'student' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Students
                </button>
                <button
                  onClick={() => setShareTab('tutor')}
                  className={`flex-1 px-6 py-3 font-medium transition-colors ${shareTab === 'tutor' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tutors
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : (
                <div className="space-y-2">
                  {(shareTab === 'student' ? students : tutors).map(user => (
                    <label
                      key={user._id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(user._id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleUserSelection(user._id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </label>
                  ))}
                  {(shareTab === 'student' ? students : tutors).length === 0 && (
                    <div className="text-center py-8 text-gray-500">No {shareTab}s found</div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Enter a message to send with the PDF..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows="3"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedUsers.length} user(s) selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSharePDF}
                    disabled={sendingPDF || selectedUsers.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
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
