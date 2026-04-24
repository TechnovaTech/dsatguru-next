'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FiClock, FiMonitor, FiCheckCircle, FiAlertTriangle, FiArrowRight, FiBookOpen } from 'react-icons/fi'

export default function DemoTestRules() {
  const router = useRouter()
  const params = useSearchParams()
  const attemptId = params.get('attemptId')
  const [session, setSession] = useState(null)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('demoTestSession')
    if (!raw) {
      router.push('/demo-test')
      return
    }
    try {
      const data = JSON.parse(raw)
      if (attemptId && data.attemptId !== attemptId) {
        router.push('/demo-test')
        return
      }
      setSession(data)
    } catch {
      router.push('/demo-test')
    }
  }, [attemptId, router])

  const startTest = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch {}
    router.push(`/demo-test/take?attemptId=${session.attemptId}`)
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>
  }

  const mathCount = session.mathQuestions?.length || 0
  const rwCount = session.rwQuestions?.length || 0
  const totalMin = (session.demoTest?.mathDuration || 20) + (session.demoTest?.rwDuration || 20)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Before you begin</h1>
            <p className="text-gray-500">Please read the rules carefully.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <FiClock className="text-blue-600 mx-auto mb-2" size={28} />
              <div className="text-2xl font-bold text-gray-900">{totalMin}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Minutes</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <FiBookOpen className="text-blue-600 mx-auto mb-2" size={28} />
              <div className="text-2xl font-bold text-gray-900">{mathCount + rwCount}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Questions</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <h3 className="text-gray-900 font-semibold mb-2 flex items-center gap-2"><FiMonitor className="text-blue-600" /> Test Structure</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Module 1 — Math</span>
                <span className="text-gray-900 font-medium">{mathCount} Qs · {session.demoTest?.mathDuration || 20} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Module 2 — Reading & Writing</span>
                <span className="text-gray-900 font-medium">{rwCount} Qs · {session.demoTest?.rwDuration || 20} min</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="text-gray-900 font-semibold">Rules</h3>
            {[
              'The test will run in fullscreen mode for a realistic exam feel.',
              'Each module has its own timer — the module auto-submits when time runs out.',
              'You can navigate between questions, mark for review, and change answers within a module.',
              'Do NOT refresh or close the tab during the test — progress will be lost.',
              'Once a module is submitted, you cannot return to it.',
              'After finishing, you will see your scaled score and full question review.'
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <FiAlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Once you click Start, the timer begins immediately. Make sure you have {totalMin} minutes free.</p>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded border-gray-300" />
            <span className="text-gray-700 text-sm">I have read the rules and I am ready to begin.</span>
          </label>

          <motion.button whileHover={{ scale: agreed ? 1.02 : 1 }} whileTap={{ scale: agreed ? 0.98 : 1 }} onClick={startTest} disabled={!agreed} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            Enter Fullscreen & Start Test <FiArrowRight />
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
