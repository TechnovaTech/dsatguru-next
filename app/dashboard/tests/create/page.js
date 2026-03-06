'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiInfo, FiCheckSquare, FiSquare, FiChevronDown, FiChevronUp, FiLock } from 'react-icons/fi'

export default function CreatePracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('rw')
  const [practiceMode, setPracticeMode] = useState('tutor') // tutor, timed, or untimed
  const [questionMode, setQuestionMode] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    quick: true,
    personalize: true,
    domains: true
  })

  const [domainStats, setDomainStats] = useState([])
  const [difficultyStats, setDifficultyStats] = useState({ 
    low: { available: 0, total: 0 }, 
    medium: { available: 0, total: 0 }, 
    high: { available: 0, total: 0 } 
  })
  const [globalCounts, setGlobalCounts] = useState({ unused: 0, total: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  // Fetch Domain Stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      const token = localStorage.getItem('token')
      try {
        const res = await fetch(`/api/questions/stats?subject=${activeTab}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (data.domains) {
          setDomainStats(data.domains)
        }
        if (data.difficulties) {
          setDifficultyStats(data.difficulties)
        }
        if (data.counts) {
          setGlobalCounts(data.counts)
        }
      } catch (error) {
        console.error('Failed to fetch stats', error)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [activeTab])
  
  // Mock Data for other counts (placeholder)
  const counts = {
    rw: {
      incorrect: 0,
      marked: 0,
      omitted: 0,
      correct: 0
    },
    math: {
      incorrect: 0,
      marked: 0,
      omitted: 0,
      correct: 0
    }
  }

  const [selectedFilters, setSelectedFilters] = useState({
    unused: true,
    incorrect: false,
    marked: false,
    omitted: false,
    correct: false,
    low: true,
    medium: true,
    high: true
  })

  const [selectedDomains, setSelectedDomains] = useState({})
  const [selectedSubtopics, setSelectedSubtopics] = useState({})

  useEffect(() => {
    const subject = searchParams.get('subject')
    const domain = searchParams.get('domain')
    const subtopic = searchParams.get('subtopic')

    if (subject) {
      setActiveTab(subject)
      // If specific topic is requested, switch to custom mode
      if (domain || subtopic) {
        setQuestionMode('custom')
      }
    }

    if (domain) {
      setSelectedDomains(prev => ({ ...prev, [domain]: true }))
      
      // Auto-select subtopics for the domain if stats are available
      if (domainStats.length > 0) {
         const domainData = domainStats.find(d => d.title === domain)
         if (domainData) {
           setSelectedSubtopics(prev => {
             const next = { ...prev }
             domainData.subs.forEach(s => {
               const sName = typeof s === 'string' ? s : s.name
               next[sName] = true
             })
             return next
           })
         }
      }
    }

    if (subtopic) {
      setSelectedSubtopics(prev => ({ ...prev, [subtopic]: true }))
    }
  }, [searchParams, domainStats])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleFilter = (filter) => {
    setSelectedFilters(prev => ({ ...prev, [filter]: !prev[filter] }))
  }

  const toggleDomain = (domainTitle) => {
    const isSelected = !selectedDomains[domainTitle]
    setSelectedDomains(prev => ({ ...prev, [domainTitle]: isSelected }))

    // Auto-select/deselect all subtopics for this domain
    const domainData = domainStats.find(d => d.title === domainTitle)
    if (domainData) {
      const newSubtopics = { ...selectedSubtopics }
      domainData.subs.forEach(sub => {
        const subName = typeof sub === 'string' ? sub : sub.name
        newSubtopics[subName] = isSelected
      })
      setSelectedSubtopics(newSubtopics)
    }
  }

  const toggleSubtopic = (subtopic) => {
    setSelectedSubtopics(prev => ({ ...prev, [subtopic]: !prev[subtopic] }))
  }

  const currentCounts = activeTab === 'rw' ? counts.rw : counts.math

  const handleStartTest = async (source) => {
    setIsGenerating(true)
    try {
      const mode = source === 'quick' ? 'standard' : questionMode
      const token = localStorage.getItem('token')
      
      const domains = Object.keys(selectedDomains).filter(k => selectedDomains[k])
      const subtopics = Object.keys(selectedSubtopics).filter(k => selectedSubtopics[k])

      // Validate: Customize mode requires topic selection
      if (mode === 'custom' && subtopics.length === 0) {
        alert('Please select at least one topic before starting the test.')
        setIsGenerating(false)
        return
      }

      // Standard mode always uses 'timed', customize mode uses selected practiceMode
      const finalPracticeMode = mode === 'standard' ? 'timed' : practiceMode

      console.log('Starting test with:', { mode, practiceMode: finalPracticeMode, activeTab, domains, subtopics })

      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode,
          practiceMode: finalPracticeMode,
          sections: [activeTab],
          domains,
          subtopics
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        console.error('Test generation failed:', data)
        alert(`Failed to create test: ${data.error || 'Unknown error'}\n${data.details || ''}`)
        return
      }
      
      if (data.testId) {
        console.log('Test created successfully, redirecting to:', data.testId)
        router.push(`/dashboard/tests/${data.testId}/start`)
      } else {
        console.error('No testId in response:', data)
        alert('Failed to create practice test - no test ID returned')
      }
    } catch (error) {
      console.error('Error starting test:', error)
      alert(`An error occurred: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm px-8 py-5 flex items-center gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Create Practice</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Customize your learning experience</p>
        </div>
      </header>

      <div className="w-full px-8 py-8 space-y-8">
        {/* Top Actions */}
        <div className="flex justify-end gap-4">
          <button className="group bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2.5">
            <div className="bg-blue-100 p-1 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Tutorial
          </button>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 hover:-translate-y-0.5 flex items-center gap-2.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Full Access
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b bg-gray-50/50 p-2 gap-2">
            {['rw', 'math'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                }`}
              >
                {tab === 'rw' ? 'Reading and Writing' : 'Math'}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-8">
            
            {/* Standard vs Customize Selection */}
            <div className="border rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Test Mode for {activeTab === 'rw' ? 'Reading & Writing' : 'Math'}</h3>
                    <p className="text-sm text-gray-600">Choose between standard SAT format or customize your practice</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Standard Button */}
                  <button
                    onClick={() => setQuestionMode('standard')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      questionMode === 'standard'
                        ? 'border-blue-600 bg-white shadow-lg ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        questionMode === 'standard' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {questionMode === 'standard' && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        questionMode === 'standard' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Recommended
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Standard SAT</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {activeTab === 'rw' 
                        ? '2 modules, 54 questions total (27 per module)'
                        : '2 modules, 44 questions total (22 per module)'}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Adaptive difficulty</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Official SAT format</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{activeTab === 'rw' ? '64 minutes' : '70 minutes'} total</span>
                      </div>
                    </div>
                  </button>

                  {/* Customize Button */}
                  <button
                    onClick={() => setQuestionMode('custom')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      questionMode === 'custom'
                        ? 'border-purple-600 bg-white shadow-lg ring-2 ring-purple-200'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        questionMode === 'custom' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {questionMode === 'custom' && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        questionMode === 'custom' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Flexible
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Customize</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose specific topics and difficulty levels for focused practice
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Select topics</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Choose difficulty</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Targeted practice</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Start Standard Test Button */}
                {questionMode === 'standard' && (
                  <div className="mt-6">
                    {/* Start Button */}
                    <div className="p-4 bg-white rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            Ready to start {activeTab === 'rw' ? 'Reading & Writing' : 'Math'} Standard Test?
                          </p>
                          <p className="text-xs text-gray-600">
                            {activeTab === 'rw' ? '2 modules • 54 questions • 64 minutes' : '2 modules • 44 questions • 70 minutes'}
                          </p>
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Timed test with official SAT conditions
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartTest('standard')}
                          disabled={isGenerating}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                          {isGenerating ? 'Starting...' : 'Start Test'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Personalize Section - Only show in Customize mode */}
            {questionMode === 'custom' && (
            <div className="border rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-200 hover:shadow-md bg-white">
              <button 
                onClick={() => toggleSection('personalize')}
                className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${expandedSections.personalize ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-lg text-gray-800">Customize Settings</span>
                    <span className="text-xs text-gray-500 font-medium">Tailor to your needs</span>
                  </div>
                </div>
                <div className={`transform transition-transform duration-300 ${expandedSections.personalize ? 'rotate-180' : ''}`}>
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </button>

              {expandedSections.personalize && (
                <div className="p-8 border-t space-y-10 bg-white animate-in slide-in-from-top-2 duration-200">
                  
                  {/* Practice Mode */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      Practice Mode
                    </div>
                    <div className="grid grid-cols-3 gap-4 max-w-3xl">
                      {[
                        { mode: 'tutor', label: 'Tutor', desc: 'Untimed, see answers' },
                        { mode: 'timed', label: 'Timed', desc: 'Simulate test conditions' },
                        { mode: 'untimed', label: 'Untimed', desc: 'Test conditions, no timer' }
                      ].map((item) => (
                        <label key={item.mode} className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          practiceMode === item.mode 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                        }`}>
                          <input 
                            type="radio" 
                            name="practiceMode" 
                            className="hidden" 
                            checked={practiceMode === item.mode}
                            onChange={() => setPracticeMode(item.mode)} 
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${practiceMode === item.mode ? 'border-blue-500' : 'border-gray-300'}`}>
                            {practiceMode === item.mode && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                          </div>
                          <div>
                            <span className="block font-bold text-gray-800 capitalize">{item.label}</span>
                            <span className="text-xs text-gray-500 font-medium">
                              {item.desc}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Filters */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                      <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                      Question Status
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'unused', label: 'Unused', available: globalCounts.unused, total: globalCounts.total, color: 'blue' },
                        { key: 'incorrect', label: 'Incorrect', available: currentCounts.incorrect, total: 0, color: 'red' },
                        { key: 'marked', label: 'Marked', available: currentCounts.marked, total: 0, color: 'yellow' },
                        { key: 'omitted', label: 'Omitted', available: currentCounts.omitted, total: 0, color: 'gray' },
                        { key: 'correct', label: 'Correct', available: currentCounts.correct, total: 0, color: 'green' },
                      ].map((item) => (
                        <button 
                          key={item.key}
                          onClick={() => toggleFilter(item.key)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                            selectedFilters[item.key] 
                              ? `border-${item.color}-200 bg-${item.color}-50 ring-1 ring-${item.color}-200` 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                            selectedFilters[item.key] ? `bg-${item.color}-500 text-white` : 'bg-gray-200'
                          }`}>
                            {selectedFilters[item.key] && <FiCheckSquare className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-sm font-medium ${selectedFilters[item.key] ? 'text-gray-900' : 'text-gray-600'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                              selectedFilters[item.key] ? `bg-white text-${item.color}-600` : 'bg-gray-100 text-gray-500'
                            }`}>
                              {item.available}
                            </span>
                            {item.total > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                                ({item.total} <FiLock className="w-2.5 h-2.5" />)
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      Difficulty
                    </div>
                    <div className="flex gap-4">
                      {[
                        { key: 'low', label: 'Easy', available: difficultyStats.low.available, total: difficultyStats.low.total },
                        { key: 'medium', label: 'Medium', available: difficultyStats.medium.available, total: difficultyStats.medium.total },
                        { key: 'high', label: 'Hard', available: difficultyStats.high.available, total: difficultyStats.high.total },
                      ].map((item) => (
                        <button 
                          key={item.key}
                          onClick={() => toggleFilter(item.key)}
                          className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                            selectedFilters[item.key] 
                              ? 'border-orange-200 bg-orange-50 ring-1 ring-orange-200' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                            selectedFilters[item.key] ? 'bg-orange-500 text-white' : 'bg-gray-200'
                          }`}>
                            {selectedFilters[item.key] && <FiCheckSquare className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-bold text-gray-700">{item.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-white px-2 py-1 rounded-md border font-bold text-gray-500">
                              {item.available}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded border">
                              {item.total} <FiLock className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Domains */}
                  <div className="pt-6 border-t border-dashed">
                     <button 
                      className="w-full flex items-center justify-between group"
                      onClick={() => toggleSection('domains')}
                     >
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-800">
                          <div className={`p-1.5 rounded-lg ${expandedSections.domains ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            {expandedSections.domains ? <FiCheckSquare className="w-4 h-4" /> : <FiSquare className="w-4 h-4" />}
                          </div>
                          Domains and Skills
                        </div>
                        <span className="text-xs text-blue-600 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                          {expandedSections.domains ? 'Collapse' : 'Expand'}
                        </span>
                     </button>

                     {expandedSections.domains && (
                       <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
                         {loadingStats ? (
                           <div className="col-span-2 py-8 text-center text-gray-400 italic">Loading domain statistics...</div>
                         ) : (
                           domainStats.map((domain, idx) => (
                             <div key={idx} className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                               <label 
                                 className="flex items-center gap-3 cursor-pointer mb-4"
                                 onClick={(e) => {
                                   e.preventDefault()
                                   toggleDomain(domain.title)
                                 }}
                               >
                                 <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                   selectedDomains[domain.title] 
                                     ? 'bg-blue-500 border-blue-500' 
                                     : 'border-gray-300 bg-white hover:border-blue-400'
                                 }`}>
                                    {selectedDomains[domain.title] && <FiCheckSquare className="w-3.5 h-3.5 text-white" />}
                                 </div>
                                 <span className="text-sm font-bold text-gray-800">{domain.title}</span>
                                 <div className="flex items-center gap-2 ml-auto">
                                   <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-200" title="Available Questions">
                                     {domain.count}
                                   </span>
                                   <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium bg-white px-1.5 py-0.5 rounded border" title="Total Questions">
                                     {domain.total} <FiLock className="w-2.5 h-2.5" />
                                   </span>
                                 </div>
                               </label>
                               <div className="space-y-2 pl-8">
                                {domain.subs.map((sub, sIdx) => {
                                  const subName = typeof sub === 'string' ? sub : sub.name
                                  const subCount = typeof sub === 'string' ? 0 : sub.count
                                  return (
                                    <label 
                                      key={sIdx} 
                                      className="flex items-center gap-2 cursor-pointer group w-full"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        toggleSubtopic(subName)
                                      }}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                        selectedSubtopics[subName]
                                          ? 'bg-blue-500 border-blue-500'
                                          : 'border-gray-300 bg-white group-hover:border-blue-400'
                                      }`}>
                                        {selectedSubtopics[subName] && <FiCheckSquare className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className={`text-xs font-medium transition-colors flex-1 ${
                                        selectedSubtopics[subName] ? 'text-blue-700 font-bold' : 'text-gray-500 group-hover:text-blue-600'
                                      }`}>
                                        {subName}
                                      </span>
                                      {typeof sub !== 'string' && (
                                        <span className="text-[10px] bg-white text-gray-600 px-2 py-0.5 rounded-full font-bold border border-gray-200 group-hover:border-blue-200 group-hover:text-blue-600">
                                          {subCount}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                             </div>
                           ))
                         )}
                       </div>
                     )}
                  </div>



                  {/* Generate Button */}
                  <div className="pt-4 flex flex-col items-end gap-2">
                    <button 
                      onClick={() => handleStartTest('custom')}
                      disabled={isGenerating}
                      className={`px-10 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
                        !isGenerating
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 cursor-pointer active:scale-95' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      }`}
                    >
                      {isGenerating ? 'Starting Test...' : 'Start Practice Test'}
                    </button>
                    {questionMode !== 'standard' && (
                      <p className="text-xs text-blue-500 font-medium">
                        * Custom mode enabled. Selected filters will be applied.
                      </p>
                    )}
                  </div>

                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-green-600 font-bold border-4 border-green-50 shadow-2xl hover:scale-110 hover:-rotate-12 transition-all cursor-pointer group">
          <span className="text-sm group-hover:hidden">1/5</span>
          <FiCheckSquare className="w-6 h-6 hidden group-hover:block" />
        </div>
      </div>
    </div>
  )

}