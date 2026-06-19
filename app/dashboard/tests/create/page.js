'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FiEdit3, FiClipboard, FiSettings, FiBookOpen, FiHash, FiBarChart2,
  FiTarget, FiClock, FiPlay, FiChevronDown, FiCheck, FiAlertTriangle,
  FiRefreshCw, FiZap, FiLayers, FiDatabase, FiInbox
} from 'react-icons/fi'
import { useToast } from '../../../components/ui/UIProvider'

export default function CreatePracticePage() {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)

  const [customSubject, setCustomSubject] = useState('rw')
  const [practiceMode, setPracticeMode] = useState('timed')
  const [selectedDifficulties, setSelectedDifficulties] = useState({ Easy: true, Medium: true, Hard: true })
  const [questionCount, setQuestionCount] = useState(27)
  const [domainStats, setDomainStats] = useState([])
  const [bankCounts, setBankCounts] = useState(null)
  const [bankDifficulties, setBankDifficulties] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [selectedSubtopics, setSelectedSubtopics] = useState({})
  const [selectedDomains, setSelectedDomains] = useState({})
  const [expandedDomains, setExpandedDomains] = useState({})

  const fetchStats = () => {
    setLoadingStats(true)
    setStatsError('')
    const token = localStorage.getItem('token')
    const subject = customSubject === 'both' ? 'rw' : customSubject
    fetch(`/api/questions/stats?subject=${subject}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.domains) setDomainStats(data.domains)
        setBankCounts(data.counts || null)
        setBankDifficulties(data.difficulties || null)
      })
      .catch(err => { console.error(err); setStatsError("Couldn't load topics from the question bank.") })
      .finally(() => setLoadingStats(false))
  }

  useEffect(() => {
    if (activeTab !== 'custom') return
    fetchStats()
    setSelectedSubtopics({})
    setSelectedDomains({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (subtopics.length === 0 && domains.length === 0) { toast.info('Please select at least one topic.'); setIsGenerating(false); return }
        if (difficulties.length === 0) { toast.info('Please select at least one difficulty.'); setIsGenerating(false); return }
        body = { mode: 'custom', practiceMode, sections: customSubject === 'both' ? ['rw', 'math'] : [customSubject], domains, subtopics, difficulties, questionCount }
      }
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create test'); return }
      if (data.testId) router.push(`/dashboard/tests/${data.testId}/start`)
    } catch (e) { toast.error(e.message) }
    finally { setIsGenerating(false) }
  }

  const selectedTopicsCount = Object.values(selectedSubtopics).filter(Boolean).length
  const maxQ = customSubject === 'both' ? 98 : customSubject === 'rw' ? 54 : 44

  const TABS = [
    { key: 'standard', icon: FiClipboard, label: 'Standard DSAT' },
    { key: 'custom', icon: FiSettings, label: 'Customize' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* ── HEADER ── */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiEdit3 className="h-5 w-5" />
            </span>
            Create a Practice Test
          </h1>
          <p className="mt-1 text-sm text-slate-500">Choose the Standard Digital SAT format or build a fully custom session.</p>
        </div>

        {/* ── TAB SWITCHER ── */}
        <div className="mb-6 flex w-fit gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
          {TABS.map(t => {
            const Icon = t.icon
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ════════════════════════════════ STANDARD TAB ════════════════════════════════ */}
        {activeTab === 'standard' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Left — main card */}
            <div className="space-y-5 lg:col-span-2">

              {/* Hero card */}
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
                      <FiLayers className="h-4 w-4" />
                    </span>
                    Full Digital SAT Practice
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Mirrors the real DSAT — adaptive, timed, official format.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                  {/* RW */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">R</div>
                      <span className="text-sm font-bold text-indigo-800">Reading &amp; Writing</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between"><span>Questions</span><span className="font-bold text-slate-800">54 total</span></div>
                      <div className="flex justify-between"><span>Modules</span><span className="font-bold text-slate-800">2 × 27</span></div>
                      <div className="flex justify-between"><span>Time</span><span className="font-bold text-slate-800">64 min</span></div>
                      <div className="flex justify-between"><span>Module 2</span><span className="font-bold text-indigo-600">Adaptive</span></div>
                    </div>
                  </div>
                  {/* Math */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">M</div>
                      <span className="text-sm font-bold text-emerald-800">Math</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between"><span>Questions</span><span className="font-bold text-slate-800">44 total</span></div>
                      <div className="flex justify-between"><span>Modules</span><span className="font-bold text-slate-800">2 × 22</span></div>
                      <div className="flex justify-between"><span>Time</span><span className="font-bold text-slate-800">70 min</span></div>
                      <div className="flex justify-between"><span>Module 2</span><span className="font-bold text-emerald-600">Adaptive</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <FiAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <p>Test runs in <strong>fullscreen</strong>. Switching tabs, pressing ESC, or exiting fullscreen will <strong>auto-submit</strong> your test immediately.</p>
              </div>
            </div>

            {/* Right — start panel */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Ready to begin?</h3>
                <p className="mt-0.5 mb-5 text-xs text-slate-500">98 questions · 134 minutes · Fully adaptive</p>

                <div className="mb-5 space-y-2.5">
                  {[
                    { icon: FiTarget, text: 'Official SAT format' },
                    { icon: FiRefreshCw, text: 'Adaptive difficulty' },
                    { icon: FiClock, text: 'Timed conditions' },
                    { icon: FiBarChart2, text: 'Full score analysis' },
                  ].map(f => {
                    const Icon = f.icon
                    return (
                      <div key={f.text} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <Icon className="h-4 w-4 text-indigo-500" /> {f.text}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => startTest('standard')}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isGenerating
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting...</>
                    : <><FiPlay className="h-4 w-4" /> Start Full DSAT</>}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Want more control?</p>
                <button
                  onClick={() => setActiveTab('custom')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <FiSettings className="h-4 w-4" /> Customize Instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ CUSTOMIZE TAB ════════════════════════════════ */}
        {activeTab === 'custom' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Left — config panels */}
            <div className="space-y-4 lg:col-span-2">

              {/* Question bank overview (surfaced from API counts) */}
              {bankCounts && (
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    icon={FiInbox}
                    color="bg-emerald-500"
                    value={bankCounts.unused ?? '—'}
                    label="Unused questions"
                  />
                  <StatCard
                    icon={FiDatabase}
                    color="bg-indigo-500"
                    value={bankCounts.total ?? '—'}
                    label="Total in bank"
                  />
                </div>
              )}

              {/* Subject */}
              <Section title="Subject" icon={FiBookOpen}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'rw', label: 'Reading & Writing' },
                    { key: 'math', label: 'Math' },
                    { key: 'both', label: 'Both' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setCustomSubject(s.key)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 text-xs font-semibold transition-colors ${
                        customSubject === s.key
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Practice Mode */}
              <Section title="Practice Mode" icon={FiTarget}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { key: 'timed', label: 'Timed', desc: 'Official conditions', icon: FiClock },
                    { key: 'untimed', label: 'Untimed', desc: 'No time pressure', icon: FiRefreshCw },
                    { key: 'tutor', label: 'Tutor', desc: 'See answers instantly', icon: FiBookOpen },
                  ].map(m => {
                    const Icon = m.icon
                    const active = practiceMode === m.key
                    return (
                      <button
                        key={m.key}
                        onClick={() => setPracticeMode(m.key)}
                        className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors ${
                          active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{m.label}</span>
                        <span className="text-xs text-slate-500">{m.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* Difficulty */}
              <Section title="Difficulty" icon={FiBarChart2}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {[
                    { key: 'Easy', diffKey: 'low', dot: 'bg-emerald-500', active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                    { key: 'Medium', diffKey: 'medium', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-50 text-amber-700' },
                    { key: 'Hard', diffKey: 'high', dot: 'bg-rose-500', active: 'border-rose-500 bg-rose-50 text-rose-700' },
                  ].map(d => {
                    const on = selectedDifficulties[d.key]
                    const avail = bankDifficulties?.[d.diffKey]
                    return (
                      <button
                        key={d.key}
                        onClick={() => toggleDifficulty(d.key)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                          on ? d.active : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} />
                        {d.key}
                        {avail != null && (
                          <span className="text-xs font-medium text-slate-400">{avail.available}/{avail.total}</span>
                        )}
                        {on && <FiCheck className="h-3.5 w-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* Question Count */}
              <Section
                title="Number of Questions"
                icon={FiHash}
                right={<span className="text-2xl font-extrabold text-indigo-600">{questionCount}</span>}
              >
                <input
                  type="range" min={5} max={maxQ} step={1} value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-full accent-indigo-600"
                />
                <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                  <span>5 min</span>
                  <div className="flex gap-4">
                    {[10, 20, 30].filter(v => v < maxQ).map(v => (
                      <button key={v} onClick={() => setQuestionCount(v)} className="transition-colors hover:text-indigo-600">{v}</button>
                    ))}
                  </div>
                  <span>{maxQ} max</span>
                </div>
              </Section>

              {/* Topics */}
              <Section
                title="Topics from Question Bank"
                icon={FiBookOpen}
                right={
                  selectedTopicsCount > 0
                    ? <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">{selectedTopicsCount} selected</span>
                    : null
                }
              >
                {loadingStats ? (
                  <div className="flex justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                  </div>
                ) : statsError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                    <p className="text-sm text-rose-700">{statsError}</p>
                    <button
                      onClick={fetchStats}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiRefreshCw className="h-4 w-4" /> Retry
                    </button>
                  </div>
                ) : domainStats.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <FiInbox className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">No topics found</p>
                    <p className="text-xs text-slate-400">There are no questions in the bank for this subject yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {domainStats.map(domain => {
                      const isExpanded = expandedDomains[domain.title] !== false
                      const subs = domain.subs.map(s => typeof s === 'string' ? { name: s, count: 0, total: 0 } : s)
                      const selectedCount = subs.filter(s => selectedSubtopics[s.name]).length
                      const allSelected = selectedCount === subs.length && subs.length > 0
                      const someSelected = selectedCount > 0 && !allSelected

                      return (
                        <div key={domain.title} className="overflow-hidden rounded-xl border border-slate-100">
                          {/* Domain row */}
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleDomain(domain.title)}
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                allSelected ? 'border-indigo-600 bg-indigo-600'
                                : someSelected ? 'border-indigo-400 bg-indigo-200'
                                : 'border-slate-300 bg-white hover:border-indigo-400'
                              }`}
                            >
                              {allSelected && <FiCheck className="h-3 w-3 text-white" strokeWidth={3} />}
                              {someSelected && <span className="h-2 w-2 rounded-sm bg-indigo-600" />}
                            </button>
                            <span className="flex-1 text-sm font-bold text-slate-800">{domain.title}</span>
                            {selectedCount > 0 && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{selectedCount}/{subs.length}</span>
                            )}
                            <span className="text-xs font-medium text-slate-400">
                              {domain.count}{domain.total != null ? `/${domain.total}` : ''} q
                            </span>
                            <button onClick={() => toggleExpand(domain.title)} className="ml-1 text-slate-400 transition-colors hover:text-slate-600">
                              <FiChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          {/* Subtopics */}
                          {isExpanded && (
                            <div className="divide-y divide-slate-50">
                              {subs.map(sub => {
                                const on = selectedSubtopics[sub.name]
                                return (
                                  <button
                                    key={sub.name}
                                    onClick={() => toggleSubtopic(sub.name)}
                                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                      on ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                      on ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {on && <FiCheck className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                    </div>
                                    <span className={`flex-1 text-sm ${on ? 'font-semibold text-indigo-700' : 'text-slate-600'}`}>
                                      {sub.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {sub.count}{sub.total != null && sub.total !== sub.count ? `/${sub.total}` : ''}
                                    </span>
                                  </button>
                                )
                              })}
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
            <div className="space-y-4 self-start lg:sticky lg:top-6">

              {/* Summary card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">Test Summary</h3>
                <div className="space-y-3">
                  <SummaryRow icon={FiBookOpen} label="Subject" value={
                    customSubject === 'both' ? 'Both Sections' : customSubject === 'rw' ? 'Reading & Writing' : 'Math'
                  } />
                  <SummaryRow icon={FiTarget} label="Mode" value={
                    practiceMode === 'timed' ? 'Timed' : practiceMode === 'tutor' ? 'Tutor' : 'Untimed'
                  } />
                  <SummaryRow icon={FiBarChart2} label="Difficulty" value={
                    Object.keys(selectedDifficulties).filter(k => selectedDifficulties[k]).join(', ') || 'None'
                  } />
                  <SummaryRow icon={FiHash} label="Questions" value={`${questionCount}`} highlight />
                  <SummaryRow icon={FiBookOpen} label="Topics" value={
                    selectedTopicsCount > 0 ? `${selectedTopicsCount} selected` : <span className="text-xs text-rose-500">None selected</span>
                  } />
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={() => startTest('custom')}
                disabled={isGenerating || selectedTopicsCount === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isGenerating
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting...</>
                  : selectedTopicsCount === 0
                    ? 'Select topics to start'
                    : <><FiPlay className="h-4 w-4" /> Start Custom Practice</>}
              </button>

              {selectedTopicsCount === 0 && (
                <p className="text-center text-xs text-slate-400">Select at least one topic from the list to begin.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, color, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xl font-extrabold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-slate-500">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}{label}
      </span>
      <span className={`font-semibold ${highlight ? 'text-base text-indigo-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
