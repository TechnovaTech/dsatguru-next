'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function CreatePracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)

  const [customSubject, setCustomSubject] = useState('rw')
  const [practiceMode, setPracticeMode] = useState('timed')
  const [selectedDifficulties, setSelectedDifficulties] = useState({ Easy: true, Medium: true, Hard: true })
  const [questionCount, setQuestionCount] = useState(27)
  const [domainStats, setDomainStats] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedSubtopics, setSelectedSubtopics] = useState({})
  const [selectedDomains, setSelectedDomains] = useState({})
  const [expandedDomains, setExpandedDomains] = useState({})

  useEffect(() => {
    if (activeTab !== 'custom') return
    setLoadingStats(true)
    const token = localStorage.getItem('token')
    const subject = customSubject === 'both' ? 'rw' : customSubject
    fetch(`/api/questions/stats?subject=${subject}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.domains) setDomainStats(data.domains) })
      .catch(console.error)
      .finally(() => setLoadingStats(false))
    setSelectedSubtopics({})
    setSelectedDomains({})
  }, [activeTab, customSubject])

  useEffect(() => {
    const subject = searchParams.get('subject')
    const domain = searchParams.get('domain')
    const subtopic = searchParams.get('subtopic')
    if (subject || domain || subtopic) {
      setActiveTab('custom')
      if (subject) setCustomSubject(subject)
      if (domain) setSelectedDomains(p => ({ ...p, [domain]: true }))
      if (subtopic) setSelectedSubtopics(p => ({ ...p, [subtopic]: true }))
    }
  }, [searchParams])

  const toggleDifficulty = d => setSelectedDifficulties(p => ({ ...p, [d]: !p[d] }))

  const toggleDomain = title => {
    const next = !selectedDomains[title]
    setSelectedDomains(p => ({ ...p, [title]: next }))
    const domain = domainStats.find(d => d.title === title)
    if (domain) {
      const subs = {}
      domain.subs.forEach(s => { subs[typeof s === 'string' ? s : s.name] = next })
      setSelectedSubtopics(p => ({ ...p, ...subs }))
    }
  }

  const toggleSubtopic = name => setSelectedSubtopics(p => ({ ...p, [name]: !p[name] }))
  const toggleExpand = title => setExpandedDomains(p => ({ ...p, [title]: p[title] === false ? true : false }))

  const startTest = async mode => {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('token')
      let body = {}
      if (mode === 'standard') {
        body = { mode: 'standard', practiceMode: 'timed', sections: ['rw', 'math'] }
      } else {
        const subtopics = Object.keys(selectedSubtopics).filter(k => selectedSubtopics[k])
        const domains = Object.keys(selectedDomains).filter(k => selectedDomains[k])
        const difficulties = Object.keys(selectedDifficulties).filter(k => selectedDifficulties[k])
        if (subtopics.length === 0 && domains.length === 0) { alert('Please select at least one topic.'); setIsGenerating(false); return }
        if (difficulties.length === 0) { alert('Please select at least one difficulty.'); setIsGenerating(false); return }
        body = { mode: 'custom', practiceMode, sections: customSubject === 'both' ? ['rw', 'math'] : [customSubject], domains, subtopics, difficulties, questionCount }
      }
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to create test'); return }
      if (data.testId) router.push(`/dashboard/tests/${data.testId}/start`)
    } catch (e) { alert(e.message) }
    finally { setIsGenerating(false) }
  }

  const selectedTopicsCount = Object.values(selectedSubtopics).filter(Boolean).length
  const maxQ = customSubject === 'both' ? 98 : customSubject === 'rw' ? 54 : 44

  return (
    <div className="min-h-screen bg-[#f8f9fc]">

      {/* ── TOP HERO HEADER ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-8 py-8 text-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Practice Center</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Create a Practice Test</h1>
          <p className="text-blue-200 text-sm mt-1">Choose Standard DSAT format or build a fully custom session</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── TAB SWITCHER ── */}
        <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 w-fit">
          {[
            { key: 'standard', icon: '📋', label: 'Standard DSAT' },
            { key: 'custom',   icon: '⚙️', label: 'Customize' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === t.key
                  ? t.key === 'standard'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════
            STANDARD TAB
        ════════════════════════════════ */}
        {activeTab === 'standard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left — main card */}
            <div className="lg:col-span-2 space-y-5">

              {/* Hero card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-5 text-white">
                  <h2 className="text-xl font-extrabold">Full Digital SAT Practice</h2>
                  <p className="text-blue-100 text-sm mt-0.5">Mirrors the real DSAT — adaptive, timed, official format</p>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  {/* RW */}
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold">R</div>
                      <span className="font-bold text-blue-800 text-sm">Reading & Writing</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between"><span>Questions</span><span className="font-bold text-gray-800">54 total</span></div>
                      <div className="flex justify-between"><span>Modules</span><span className="font-bold text-gray-800">2 × 27</span></div>
                      <div className="flex justify-between"><span>Time</span><span className="font-bold text-gray-800">64 min</span></div>
                      <div className="flex justify-between"><span>Module 2</span><span className="font-bold text-blue-600">Adaptive</span></div>
                    </div>
                  </div>
                  {/* Math */}
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">M</div>
                      <span className="font-bold text-emerald-800 text-sm">Math</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between"><span>Questions</span><span className="font-bold text-gray-800">44 total</span></div>
                      <div className="flex justify-between"><span>Modules</span><span className="font-bold text-gray-800">2 × 22</span></div>
                      <div className="flex justify-between"><span>Time</span><span className="font-bold text-gray-800">70 min</span></div>
                      <div className="flex justify-between"><span>Module 2</span><span className="font-bold text-emerald-600">Adaptive</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <span className="text-lg leading-none mt-0.5">⚠️</span>
                <p>Test runs in <strong>fullscreen</strong>. Switching tabs, pressing ESC, or exiting fullscreen will <strong>auto-submit</strong> your test immediately.</p>
              </div>
            </div>

            {/* Right — start panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-1">Ready to begin?</h3>
                <p className="text-xs text-gray-500 mb-5">98 questions · 134 minutes · Fully adaptive</p>

                <div className="space-y-2 mb-5">
                  {[
                    { icon: '🎯', text: 'Official SAT format' },
                    { icon: '🔄', text: 'Adaptive difficulty' },
                    { icon: '⏱', text: 'Timed conditions' },
                    { icon: '📊', text: 'Full score analysis' },
                  ].map(f => (
                    <div key={f.text} className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{f.icon}</span> {f.text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => startTest('standard')}
                  disabled={isGenerating}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isGenerating
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Starting...</span>
                    : '🚀 Start Full DSAT'}
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Want more control?</p>
                <button
                  onClick={() => setActiveTab('custom')}
                  className="w-full py-3 border-2 border-violet-200 text-violet-700 font-bold rounded-xl text-sm hover:bg-violet-50 transition-all"
                >
                  ⚙️ Customize Instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            CUSTOMIZE TAB
        ════════════════════════════════ */}
        {activeTab === 'custom' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left — config panels */}
            <div className="lg:col-span-2 space-y-4">

              {/* Subject */}
              <Section title="Subject" icon="📚">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'rw',   label: 'Reading & Writing', icon: '📖' },
                    { key: 'math', label: 'Math',              icon: '🔢' },
                    { key: 'both', label: 'Both',              icon: '📋' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setCustomSubject(s.key)}
                      className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        customSubject === s.key
                          ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50/40'
                      }`}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-xs">{s.label}</span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Practice Mode */}
              <Section title="Practice Mode" icon="🎯">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'timed',   label: 'Timed',   desc: 'Official conditions', icon: '⏱', color: 'orange' },
                    { key: 'untimed', label: 'Untimed', desc: 'No time pressure',    icon: '🕐', color: 'blue'   },
                    { key: 'tutor',   label: 'Tutor',   desc: 'See answers instantly',icon: '📖', color: 'green'  },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => setPracticeMode(m.key)}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                        practiceMode === m.key
                          ? 'border-violet-500 bg-violet-50 shadow-sm'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40'
                      }`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className={`font-bold text-sm ${practiceMode === m.key ? 'text-violet-700' : 'text-gray-800'}`}>{m.label}</span>
                      <span className="text-xs text-gray-500">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Difficulty */}
              <Section title="Difficulty" icon="📊">
                <div className="flex gap-3">
                  {[
                    { key: 'Easy',   emoji: '🟢', active: 'border-green-500 bg-green-50 text-green-700',  inactive: 'border-gray-200 text-gray-500' },
                    { key: 'Medium', emoji: '🟡', active: 'border-yellow-500 bg-yellow-50 text-yellow-700', inactive: 'border-gray-200 text-gray-500' },
                    { key: 'Hard',   emoji: '🔴', active: 'border-red-500 bg-red-50 text-red-700',         inactive: 'border-gray-200 text-gray-500' },
                  ].map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDifficulty(d.key)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        selectedDifficulties[d.key] ? d.active : d.inactive + ' hover:border-gray-300'
                      }`}
                    >
                      <span>{d.emoji}</span> {d.key}
                      {selectedDifficulties[d.key] && <span className="ml-1 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Question Count */}
              <Section title="Number of Questions" icon="🔢" right={
                <span className="text-2xl font-extrabold text-violet-600">{questionCount}</span>
              }>
                <input
                  type="range" min={5} max={maxQ} step={1} value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>5 min</span>
                  <div className="flex gap-4">
                    {[10, 20, 30].filter(v => v < maxQ).map(v => (
                      <button key={v} onClick={() => setQuestionCount(v)} className="hover:text-violet-600 transition-colors">{v}</button>
                    ))}
                  </div>
                  <span>{maxQ} max</span>
                </div>
              </Section>

              {/* Topics */}
              <Section title="Topics from Question Bank" icon="📖" right={
                selectedTopicsCount > 0
                  ? <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2.5 py-1 rounded-full">{selectedTopicsCount} selected</span>
                  : null
              }>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-violet-500 rounded-full animate-spin"></span>
                    <span className="text-sm">Loading topics...</span>
                  </div>
                ) : domainStats.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No topics found in question bank.</p>
                ) : (
                  <div className="space-y-2">
                    {domainStats.map(domain => {
                      const isExpanded = expandedDomains[domain.title] !== false
                      const subs = domain.subs.map(s => typeof s === 'string' ? { name: s, count: 0 } : s)
                      const selectedCount = subs.filter(s => selectedSubtopics[s.name]).length
                      const allSelected = selectedCount === subs.length && subs.length > 0
                      const someSelected = selectedCount > 0 && !allSelected

                      return (
                        <div key={domain.title} className="rounded-xl border border-gray-100 overflow-hidden">
                          {/* Domain row */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleDomain(domain.title)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                allSelected ? 'bg-violet-600 border-violet-600'
                                : someSelected ? 'bg-violet-200 border-violet-400'
                                : 'border-gray-300 bg-white hover:border-violet-400'
                              }`}
                            >
                              {allSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                              {someSelected && <div className="w-2 h-2 bg-violet-600 rounded-sm"></div>}
                            </button>
                            <span className="font-bold text-sm text-gray-800 flex-1">{domain.title}</span>
                            {selectedCount > 0 && (
                              <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{selectedCount}/{subs.length}</span>
                            )}
                            <span className="text-xs text-gray-400 font-medium">{domain.count} q</span>
                            <button onClick={() => toggleExpand(domain.title)} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
                              <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                              </svg>
                            </button>
                          </div>
                          {/* Subtopics */}
                          {isExpanded && (
                            <div className="divide-y divide-gray-50">
                              {subs.map(sub => (
                                <button
                                  key={sub.name}
                                  onClick={() => toggleSubtopic(sub.name)}
                                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all ${
                                    selectedSubtopics[sub.name] ? 'bg-violet-50' : 'bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    selectedSubtopics[sub.name] ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'
                                  }`}>
                                    {selectedSubtopics[sub.name] && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`text-sm flex-1 ${selectedSubtopics[sub.name] ? 'text-violet-700 font-semibold' : 'text-gray-600'}`}>
                                    {sub.name}
                                  </span>
                                  <span className="text-xs text-gray-400">{sub.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Section>
            </div>

            {/* Right — sticky summary + start */}
            <div className="space-y-4 lg:sticky lg:top-6 self-start">

              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Test Summary</h3>
                <div className="space-y-3">
                  <SummaryRow icon="📚" label="Subject" value={
                    customSubject === 'both' ? 'Both Sections' : customSubject === 'rw' ? 'Reading & Writing' : 'Math'
                  } />
                  <SummaryRow icon="🎯" label="Mode" value={
                    practiceMode === 'timed' ? '⏱ Timed' : practiceMode === 'tutor' ? '📖 Tutor' : '🕐 Untimed'
                  } />
                  <SummaryRow icon="📊" label="Difficulty" value={
                    Object.keys(selectedDifficulties).filter(k => selectedDifficulties[k]).join(', ') || 'None'
                  } />
                  <SummaryRow icon="🔢" label="Questions" value={`${questionCount}`} highlight />
                  <SummaryRow icon="📖" label="Topics" value={
                    selectedTopicsCount > 0 ? `${selectedTopicsCount} selected` : <span className="text-red-500 text-xs">None selected</span>
                  } />
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={() => startTest('custom')}
                disabled={isGenerating || selectedTopicsCount === 0}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isGenerating
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Starting...</span>
                  : selectedTopicsCount === 0
                    ? 'Select topics to start'
                    : '🚀 Start Custom Practice'}
              </button>

              {selectedTopicsCount === 0 && (
                <p className="text-xs text-center text-gray-400">← Select at least one topic from the list</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, right, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function SummaryRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 flex items-center gap-1.5"><span>{icon}</span>{label}</span>
      <span className={`font-semibold ${highlight ? 'text-violet-600 text-base' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}
