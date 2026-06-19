'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { FiAward, FiCheckCircle, FiXCircle, FiBook, FiShoppingCart, FiArrowRight, FiClock, FiTrendingUp, FiStar, FiTarget } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi'

function AnimatedNumber({ value, duration = 1.8, delay = 0 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = Date.now() + delay * 1000
    let raf
    const tick = () => {
      const now = Date.now()
      if (now < start) { raf = requestAnimationFrame(tick); return }
      const elapsed = (now - start) / 1000
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay])
  return <span>{display}</span>
}

export default function DemoTestResult() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [banks, setBanks] = useState([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [activeReviewIdx, setActiveReviewIdx] = useState(0)

  useEffect(() => {
    if (!id) return
    axios.get(`/api/demo-test/result/${id}`).then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false))
    axios.get('/api/courses').then(r => setCourses(r.data.data || r.data.courses || [])).catch(() => {})
    axios.get('/api/questions?question-banks=true').then(r => setBanks((r.data.data || []).filter(b => b.id !== 'admin-math' && b.id !== 'admin-rw' && b.id !== 'admintest-math' && b.id !== 'admintest-rw' && b.id !== 'tutor-math' && b.id !== 'tutor-rw'))).catch(() => {})
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading your results...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Result not found.</div>

  const totalCorrect = (data.mathCorrect || 0) + (data.rwCorrect || 0)
  const totalQuestions = (data.mathTotal || 0) + (data.rwTotal || 0)
  const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const reviewed = (data.review || []).filter(r => {
    if (reviewFilter === 'correct') return r.isCorrect
    if (reviewFilter === 'wrong') return !r.isCorrect
    return true
  })
  const currentReview = reviewed[activeReviewIdx] || null

  const performanceLabel = pct >= 85 ? 'Outstanding' : pct >= 70 ? 'Strong' : pct >= 50 ? 'Good Start' : 'Keep Practicing'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero score */}
      <div className="relative overflow-hidden bg-white border-b border-gray-200">
        <motion.div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-50 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-blue-50 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-12 md:pt-20 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-4">
            <HiSparkles className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Your Demo Test Results</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Great job, {data.name}!
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-gray-500">
            Here's how you did on {data.testTitle || 'the DSATGuru demo test'}.
          </motion.p>

          {/* Total score */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="mt-8 relative inline-block">
            <motion.div className="absolute -inset-4 bg-blue-100 rounded-full blur-2xl opacity-60" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative bg-white border border-gray-200 rounded-3xl px-10 py-8 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">Total Scaled Score</div>
              <div className="text-7xl md:text-8xl font-bold text-blue-600">
                <AnimatedNumber value={data.totalScore} delay={0.6} />
              </div>
              <div className="text-gray-400 text-sm mt-2">out of 1600</div>
              <div className="mt-3 inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
                {performanceLabel}
              </div>
            </div>
          </motion.div>

          {/* Section scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {[
              { label: 'Math', value: data.mathScore, correct: data.mathCorrect, total: data.mathTotal, icon: <FiTarget />, delay: 0.8 },
              { label: 'Reading & Writing', value: data.rwScore, correct: data.rwCorrect, total: data.rwTotal, icon: <FiBook />, delay: 1.0 },
              { label: 'Accuracy', value: pct, suffix: '%', correct: totalCorrect, total: totalQuestions, icon: <FiTrendingUp />, delay: 1.2 }
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="inline-flex w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 items-center justify-center text-blue-600 mb-3">{s.icon}</div>
                <div className="text-xs uppercase tracking-wider text-gray-400">{s.label}</div>
                <div className="text-4xl font-bold text-blue-600 mt-1">
                  <AnimatedNumber value={s.value || 0} delay={s.delay + 0.2} />{s.suffix || ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">{s.correct}/{s.total} correct</div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
            <span className="flex items-center gap-2"><FiClock /> {Math.floor((data.timeSpent || 0) / 60)}m {(data.timeSpent || 0) % 60}s total</span>
            <span className="flex items-center gap-2"><FiAward /> {totalCorrect}/{totalQuestions} correct</span>
          </motion.div>

          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setReviewOpen(true)} className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 shadow">
            <FiBook /> Review every question
          </motion.button>
        </div>
      </div>

      {/* Course / question bank CTA */}
      <div className="max-w-6xl mx-auto px-6 mt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ready to score higher?</h2>
          <p className="text-gray-500">Unlock the full platform with our prep courses and question banks.</p>
        </motion.div>

        {(courses.length > 0 || banks.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...courses, ...banks].slice(0, 6).map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group relative">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  {item.bannerImageUrl && (
                    <img src={item.bannerImageUrl} alt={item.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white"><FiStar size={14} /></div>
                    <span className="text-xs uppercase tracking-wider text-gray-400">{item.questionBankType ? 'Question Bank' : (item.type || 'Course')}</span>
                  </div>
                  <h3 className="text-gray-900 font-bold mb-2 line-clamp-2">{item.title || item.name}</h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{item.description || item.questionBankType || ''}</p>
                  <div className="flex items-center justify-between">
                    {typeof item.price !== 'undefined' && item.price !== null ? (
                      <div>
                        {item.discountedPrice ? (
                          <>
                            <span className="text-gray-900 font-bold text-lg">${item.discountedPrice}</span>
                            <span className="text-gray-400 text-sm line-through ml-2">${item.price}</span>
                          </>
                        ) : (
                          <span className="text-gray-900 font-bold text-lg">{item.price > 0 ? `$${item.price}` : 'Free'}</span>
                        )}
                      </div>
                    ) : <span className="text-gray-400 text-sm">{item.totalQuestions || 0} questions</span>}
                    <Link href={`/enrollment/${item.id}`} className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                      <FiShoppingCart size={14} /> Buy
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">More courses coming soon.</div>
        )}

        <div className="text-center mt-10">
          <Link href="/#programs" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            Browse all programs <FiArrowRight />
          </Link>
        </div>
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {reviewOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900">Question Review</h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {['all', 'correct', 'wrong'].map(f => (
                      <button key={f} onClick={() => { setReviewFilter(f); setActiveReviewIdx(0) }} className={`px-3 py-1 text-sm rounded capitalize ${reviewFilter === f ? 'bg-white shadow font-semibold text-gray-900' : 'text-gray-500'}`}>{f}</button>
                    ))}
                  </div>
                  <button onClick={() => setReviewOpen(false)} className="p-2 hover:bg-gray-100 rounded text-gray-500">✕</button>
                </div>
              </div>

              {currentReview ? (
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-16 border-r overflow-y-auto p-2 space-y-1 bg-gray-50">
                    {reviewed.map((r, i) => (
                      <button key={i} onClick={() => setActiveReviewIdx(i)} className={`w-full h-10 rounded text-sm font-medium ${i === activeReviewIdx ? 'ring-2 ring-blue-500' : ''} ${r.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentReview.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {currentReview.isCorrect ? <><FiCheckCircle className="inline mr-1" /> Correct</> : <><FiXCircle className="inline mr-1" /> Incorrect</>}
                      </span>
                      <span className="text-xs text-gray-500">{currentReview.module === 'math' ? 'Math' : 'Reading & Writing'}</span>
                      <span className="text-xs text-gray-500">· {currentReview.timeSpent}s</span>
                    </div>
                    {currentReview.question?.questionParagraph && (
                      <div className="bg-gray-50 border rounded-lg p-4 mb-4 text-sm text-gray-700 whitespace-pre-line">{currentReview.question.questionParagraph}</div>
                    )}
                    <div className="mb-4 text-gray-900 whitespace-pre-line">{currentReview.question?.content || '(question unavailable)'}</div>
                    {currentReview.question?.imageUrl && <img src={currentReview.question.imageUrl} alt="" className="max-w-full rounded border mb-4" />}
                    <div className="space-y-2 mb-4">
                      {(currentReview.question?.options || []).map((opt, i) => {
                        const letter = String.fromCharCode(65 + i)
                        const isCorrect = letter === currentReview.correctAnswer
                        const isSelected = letter === currentReview.selectedAnswer
                        return (
                          <div key={i} className={`border-2 rounded-lg p-3 flex items-start gap-3 ${isCorrect ? 'border-green-500 bg-green-50' : isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{letter}</div>
                            <div className="flex-1 text-sm pt-0.5 text-gray-800">{opt}</div>
                            {isCorrect && <FiCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />}
                            {!isCorrect && isSelected && <FiXCircle className="text-red-600 flex-shrink-0 mt-0.5" />}
                          </div>
                        )
                      })}
                    </div>
                    {currentReview.question?.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="font-semibold text-blue-900 mb-2 text-sm">Explanation</div>
                        <div className="text-sm text-gray-800 whitespace-pre-line">{currentReview.question.explanation}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">No questions match this filter.</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
