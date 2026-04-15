'use client'
import { useState, useEffect, useRef } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'
import { FiClock, FiCheckCircle, FiArrowRight, FiArrowLeft, FiX, FiMaximize2, FiMinimize2, FiGrid } from 'react-icons/fi'

const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

export default function RedoQueuePage() {
  const [dateGroups, setDateGroups] = useState([])
  const [allQuestions, setAllQuestions] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [mode, setMode] = useState('list') // list | test | result
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [showStartPopup, setShowStartPopup] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const testContainerRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [datesRes, allRes] = await Promise.all([
          fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } }),
          fetch('/api/redo-queue?mode=all', { headers: { Authorization: `Bearer ${token()}` } })
        ])
        
        const datesData = await datesRes.json()
        const allData = await allRes.json()
        
        setDateGroups(datesData.dates || [])
        setAllQuestions(allData.questions || [])
        
        if (allData.questions?.length > 0) {
          setShowStartPopup(true)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    let timer
    if (mode === 'test' && !submitting) {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [mode, submitting])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRedoByDate = async (date) => {
    setLoading(true)
    setSelectedDate(date)
    try {
      const url = `/api/redo-queue?mode=questions&date=${encodeURIComponent(date)}`
      const qRes = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      const data = await qRes.json()
      const loadedQuestions = data.questions || []

      setQuestions(loadedQuestions)
      setAnswers({})
      setCurrentQuestionIndex(0)
      setResult(null)
      setTimeElapsed(0)
      setMode('test')
      enterFullscreen()
    } catch (error) {
      console.error('Error starting redo:', error)
    } finally {
      setLoading(false)
      setShowStartPopup(false)
    }
  }

  const enterFullscreen = () => {
    if (testContainerRef.current) {
      if (testContainerRef.current.requestFullscreen) {
        testContainerRef.current.requestFullscreen()
      } else if (testContainerRef.current.webkitRequestFullscreen) {
        testContainerRef.current.webkitRequestFullscreen()
      } else if (testContainerRef.current.msRequestFullscreen) {
        testContainerRef.current.msRequestFullscreen()
      }
      setIsFullscreen(true)
    }
  }

  const exitFullscreen = () => {
    const isFull = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!isFull) return;

    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
    setIsFullscreen(false)
  }

  const submitRedo = async () => {
    if (!selectedDate || questions.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/redo-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date: selectedDate, answers })
      })
      const data = await res.json()
      setResult(data)
      setMode('result')
      exitFullscreen()

      const listRes = await fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } })
      const listData = await listRes.json()
      setDateGroups(listData.dates || [])
      
      const allRes = await fetch('/api/redo-queue?mode=all', { headers: { Authorization: `Bearer ${token()}` } })
      const allData = await allRes.json()
      setAllQuestions(allData.questions || [])
    } catch (error) {
      console.error('Error submitting redo:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading redo queue...</div>

  return (
    <div className="p-0 min-h-screen bg-white" ref={testContainerRef}>
      {/* Header for list mode */}
      {mode === 'list' && (
        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🔁 My Redo Queue</h1>
              <p className="text-gray-500 text-sm mt-1">Questions you still need to master.</p>
            </div>
            {allQuestions.length > 0 && (
              <button 
                onClick={() => setShowStartPopup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md"
              >
                Start Redo Session
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Date Logged</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Section</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Topic</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Question Description</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Why I Got It Wrong</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Correct Concept</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Difficulty</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Redo Due</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-10 text-center text-gray-500">No pending questions in your redo queue.</td>
                  </tr>
                ) : (
                  allQuestions.map((q) => (
                    <tr key={q.logId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{q.dateLogged}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${q.section === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {q.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{q.topic || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={q.questionDescription}>{q.questionDescription || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={q.whyWrong}>{q.whyWrong || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={q.correctConcept}>{q.correctConcept || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${q.difficulty === 'H' || q.difficulty === 'Hard' ? 'text-red-600' : q.difficulty === 'M' || q.difficulty === 'Medium' ? 'text-orange-600' : 'text-green-600'}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{q.redoDueDate || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${q.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start Popup */}
      {showStartPopup && mode === 'list' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiClock size={40} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Master?</h2>
              <p className="text-gray-600 mb-8">You have <span className="font-bold text-blue-600">{allQuestions.length}</span> questions waiting in your redo queue. Choose a batch to start your mastery session.</p>
              
              <div className="space-y-3 max-h-60 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                {dateGroups.map(group => (
                  <button
                    key={group.date}
                    onClick={() => startRedoByDate(group.date)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-800 group-hover:text-blue-700">{group.date}</p>
                      <p className="text-xs text-gray-500">{group.totalQuestions} Questions</p>
                    </div>
                    <FiArrowRight className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setShowStartPopup(false)}
                className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Not now, let me browse the list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Exam UI */}
      {mode === 'test' && questions.length > 0 && (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
          {/* Top Bar */}
          <div className="bg-[#1a1a1a] text-white px-6 py-3 flex items-center justify-between shadow-lg z-10">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">REDO MODE</div>
              <h2 className="text-sm font-semibold truncate max-w-xs">{selectedDate} Mastery Session</h2>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
               <div className="bg-[#2a2a2a] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                 <FiClock className="text-blue-400" />
                 <span className="font-mono font-bold text-lg tabular-nums">{formatTime(timeElapsed)}</span>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={submitRedo}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2 rounded transition-all shadow-lg"
              >
                Finish Session
              </button>
              <button 
                onClick={() => { exitFullscreen(); setMode('list'); }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
          </div>

          {/* Main Test Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left side - Content */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-gray-50/30">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <div className="flex gap-1">
                    {questions.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentQuestionIndex ? 'bg-blue-600' : answers[questions[idx].logId] ? 'bg-blue-200' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border p-10 min-h-[400px]">
                  <div className="prose prose-blue max-w-none text-lg leading-relaxed text-gray-800">
                    {renderContent(questions[currentQuestionIndex].content)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Options */}
            <div className="w-[450px] bg-white border-l border-gray-100 flex flex-col shadow-2xl z-10">
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Select Answer</h3>
                <div className="space-y-4">
                  {questions[currentQuestionIndex].options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setAnswers(prev => ({ ...prev, [questions[currentQuestionIndex].logId]: opt.key }))}
                      className={`w-full flex items-center gap-5 p-5 rounded-xl border-2 transition-all text-left group ${
                        answers[questions[currentQuestionIndex].logId] === opt.key
                          ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-100'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-all ${
                        answers[questions[currentQuestionIndex].logId] === opt.key
                          ? 'bg-blue-600 text-white scale-110 rotate-3 shadow-lg'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}>
                        {opt.key}
                      </div>
                      <div className="flex-1 text-gray-700 font-medium">
                        {renderContent(opt.value)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-4">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <FiArrowLeft /> Previous
                </button>
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-black transition-all shadow-lg"
                  >
                    Next Question <FiArrowRight />
                  </button>
                ) : (
                  <button
                    onClick={submitRedo}
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg"
                  >
                    {submitting ? 'Submitting...' : 'Complete Test'} <FiCheckCircle />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Mode */}
      {mode === 'result' && (
        <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-blue-600 p-12 text-center text-white">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                <FiCheckCircle size={48} />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">Session Complete!</h2>
              <p className="text-blue-100 text-lg">Great job on finishing your mastery batch.</p>
            </div>
            
            <div className="p-12 grid grid-cols-3 gap-8 text-center">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Attempted</p>
                <p className="text-3xl font-black text-gray-900">{result?.attempted || 0}</p>
              </div>
              <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Correct</p>
                <p className="text-3xl font-black text-green-600">{result?.correct || 0}</p>
              </div>
              <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Incorrect</p>
                <p className="text-3xl font-black text-red-600">{result?.wrong || 0}</p>
              </div>
            </div>

            <div className="px-12 pb-12 flex gap-4">
              <button 
                onClick={() => setMode('list')} 
                className="flex-1 py-4 px-6 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
              >
                Back to Queue
              </button>
              <button 
                onClick={() => startRedoByDate(selectedDate)} 
                className="flex-1 py-4 px-6 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg"
              >
                Retry Batch
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d1d1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  )
}
