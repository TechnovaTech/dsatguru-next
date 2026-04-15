'use client'
import { useState, useEffect } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'

const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

export default function RedoQueuePage() {
  const [dateGroups, setDateGroups] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [mode, setMode] = useState('list') // list | test | result
  const [showPendingList, setShowPendingList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setDateGroups(d.dates || []))
      .finally(() => setLoading(false))
  }, [])

  const startRedoByDate = async (date) => {
    setLoading(true)
    setSelectedDate(date)
    const url = `/api/redo-queue?mode=questions&date=${encodeURIComponent(date)}`
    const qRes = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await qRes.json()
    const loadedQuestions = data.questions || []

    setQuestions(loadedQuestions)
    setAnswers({})
    setResult(null)
    setMode('test')
    setLoading(false)
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

      const listRes = await fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } })
      const listData = await listRes.json()
      setDateGroups(listData.dates || [])
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading redo queue...</div>

  const totalPending = dateGroups.reduce((sum, g) => sum + (g.totalQuestions || 0), 0)

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔁 My Redo Queue</h1>
            <p className="text-gray-500 text-sm mt-1">Questions you still need to master.</p>
          </div>
          {mode === 'list' && (
            <button
              onClick={() => setShowPendingList(prev => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {showPendingList ? 'Hide Pending List' : 'Start Redo Test'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Date Buckets</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{dateGroups.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Questions</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Selected Date</p>
          <p className="text-base font-bold text-gray-800 mt-2">{selectedDate || '-'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Mini-test Questions</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{questions.length}</p>
        </div>
      </div>

      {mode === 'list' && (
        <div className="space-y-3">
          {!showPendingList && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
              Click <span className="font-semibold">Start Redo Test</span> to view pending questions date-wise and start mini-test.
            </div>
          )}
          {showPendingList && dateGroups.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
              No pending redo questions.
            </div>
          )}
          {showPendingList && dateGroups.map(group => (
            <div key={group.date} className="bg-white rounded-xl p-4 shadow-sm border flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-800">{group.date}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Questions: <span className="font-semibold">{group.totalQuestions}</span> • Pending: <span className="font-semibold">{group.pending}</span> • Failed: <span className="font-semibold">{group.failed}</span>
                </p>
                {Array.isArray(group.sections) && group.sections.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.sections.map(s => (
                      <span key={`${group.date}-${s.name}`} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {s.name}: {s.count}
                      </span>
                    ))}
                  </div>
                )}
                {group.redoDueDate ? (
                  <p className="text-xs text-gray-400 mt-1">Redo Due Date: {group.redoDueDate}</p>
                ) : null}
              </div>
              <button
                onClick={() => startRedoByDate(group.date)}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Start Redo
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'test' && (
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Redo Mini-test: {selectedDate}</h2>
            <button
              onClick={() => setMode('list')}
              className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
            >
              Back
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No questions found for this date.</div>
          ) : (
            <div className="space-y-5">
              {questions.map((q, i) => (
                <div key={q.logId} className="border rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Q{i + 1}. {q.questionLabel ? `${q.questionLabel} • ` : ''}{q.subject} • {q.skill || '-'}
                  </p>
                  <div className="text-sm text-gray-700 mb-3">{renderContent(q.content)}</div>
                  <div className="space-y-2">
                    {q.options.map(opt => (
                      <label key={`${q.logId}-${opt.key}`} className={`flex items-start gap-2 border rounded-lg p-2 cursor-pointer ${answers[q.logId] === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name={`q-${q.logId}`}
                          checked={answers[q.logId] === opt.key}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.logId]: opt.key }))}
                        />
                        <span className="text-xs font-semibold mt-0.5">{opt.key}.</span>
                        <span className="text-sm">{renderContent(opt.value)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  onClick={submitRedo}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Redo Test'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'result' && (
        <div className="bg-white rounded-xl p-6 border shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Redo Result: {selectedDate}</h2>
          <p className="text-gray-600">Attempted: <span className="font-semibold">{result?.attempted || 0}</span></p>
          <p className="text-green-600">Correct: <span className="font-semibold">{result?.correct || 0}</span></p>
          <p className="text-red-600">Wrong: <span className="font-semibold">{result?.wrong || 0}</span></p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setMode('list')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Back to Date List</button>
            <button onClick={() => startRedoByDate(selectedDate)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry Same Date</button>
          </div>
        </div>
      )}
    </div>
  )
}
