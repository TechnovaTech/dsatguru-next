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
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">Loading...</div>
  }

  const mathCount = session.mathQuestions?.length || 0
  const rwCount = session.rwQuestions?.length || 0
  const totalMin = (session.demoTest?.mathDuration || 20) + (session.demoTest?.rwDuration || 20)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Before you begin</h1>
            <p className="text-gray-400">Please read the rules carefully.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <FiClock className="text-cyan-400 mx-auto mb-2" size={28} />
              <div className="text-2xl font-bold text-white">{totalMin}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Total Minutes</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <FiBookOpen className="text-purple-400 mx-auto mb-2" size={28} />
              <div className="text-2xl font-bold text-white">{mathCount + rwCount}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Questions</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><FiMonitor /> Test Structure</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Module 1 — Math</span>
                <span className="text-white font-medium">{mathCount} Qs · {session.demoTest?.mathDuration || 20} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Module 2 — Reading & Writing</span>
                <span className="text-white font-medium">{rwCount} Qs · {session.demoTest?.rwDuration || 20} min</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="text-white font-semibold">Rules</h3>
            {[
              'The test will run in fullscreen mode for a realistic exam feel.',
              'Each module has its own timer — the module auto-submits when time runs out.',
              'You can navigate between questions, mark for review, and change answers within a module.',
              'Do NOT refresh or close the tab during the test — progress will be lost.',
              'Once a module is submitted, you cannot return to it.',
              'After finishing, you will see your scaled score and full question review.'
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <FiCheckCircle className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <FiAlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-100">Once you click Start, the timer begins immediately. Make sure you have {totalMin} minutes free.</p>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded" />
            <span className="text-gray-300 text-sm">I have read the rules and I am ready to begin.</span>
          </label>

          <motion.button whileHover={{ scale: agreed ? 1.02 : 1 }} whileTap={{ scale: agreed ? 0.98 : 1 }} onClick={startTest} disabled={!agreed} className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl shadow-xl hover:shadow-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            Enter Fullscreen & Start Test <FiArrowRight />
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
