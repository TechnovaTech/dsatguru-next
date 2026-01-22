'use client'
import { useState, useEffect } from 'react'
import { FiInfo, FiCheckSquare, FiSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi'

export default function CreatePracticePage() {
  const [activeTab, setActiveTab] = useState('rw')
  const [practiceMode, setPracticeMode] = useState('tutor') // tutor or timed
  const [questionMode, setQuestionMode] = useState('standard')
  const [expandedSections, setExpandedSections] = useState({
    quick: true,
    personalize: true,
    domains: true
  })

  const [domainStats, setDomainStats] = useState([])
  const [difficultyStats, setDifficultyStats] = useState({ low: 0, medium: 0, high: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  // Fetch Domain Stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      try {
        const res = await fetch(`/api/questions/stats?subject=${activeTab}`)
        const data = await res.json()
        if (data.domains) {
          setDomainStats(data.domains)
        }
        if (data.difficulties) {
          setDifficultyStats(data.difficulties)
        }
      } catch (error) {
        console.error('Failed to fetch stats', error)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [activeTab])
  
  // Mock Data for Counts
  const counts = {
    rw: {
      unused: 28,
      incorrect: 0,
      marked: 0,
      omitted: 0,
      correct: 0,
      low: 5,
      medium: 14,
      high: 9
    },
    math: {
      unused: 28,
      incorrect: 0,
      marked: 0,
      omitted: 0,
      correct: 0,
      low: 1,
      medium: 12,
      high: 15
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleFilter = (filter) => {
    setSelectedFilters(prev => ({ ...prev, [filter]: !prev[filter] }))
  }

  const toggleDomain = (domain) => {
    setSelectedDomains(prev => ({ ...prev, [domain]: !prev[domain] }))
  }

  const currentCounts = activeTab === 'rw' ? counts.rw : counts.math

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
        <div className="ml-auto flex items-center gap-6 text-sm font-semibold text-gray-600">
          <button className="hover:text-blue-600 transition-colors flex items-center gap-2">
            <FiCheckSquare className="w-4 h-4" /> Checklist
          </button>
          <button className="hover:text-blue-600 transition-colors">Test Date</button>
          <div className="h-6 w-px bg-gray-200"></div>
          <button className="hover:text-blue-600 transition-colors">My Account</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8 space-y-8">
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
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
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
            {/* Quick Section */}
            <div className="border rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-200 hover:shadow-md bg-white">
              <button 
                onClick={() => toggleSection('quick')}
                className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${expandedSections.quick ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-lg text-gray-800">Quick Practice</span>
                    <span className="text-xs text-gray-500 font-medium">Instantly start a session</span>
                  </div>
                </div>
                <div className={`transform transition-transform duration-300 ${expandedSections.quick ? 'rotate-180' : ''}`}>
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </button>
              
              {expandedSections.quick && (
                <div className="p-6 bg-gray-50/50 border-t flex items-center gap-6 animate-in slide-in-from-top-2 duration-200">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 active:scale-95">
                    Start Now
                  </button>
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Count</span>
                    <input 
                      type="number" 
                      defaultValue={1} 
                      className="w-12 border-none bg-transparent font-bold text-center text-lg focus:ring-0 p-0 text-gray-800" 
                    />
                    <span className="text-xs font-medium text-gray-400 border-l pl-3">Max: {currentCounts.unused}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Personalize Section */}
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
                    <span className="block font-bold text-lg text-gray-800">Custom Practice</span>
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
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      {['tutor', 'timed'].map((mode) => (
                        <label key={mode} className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          practiceMode === mode 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                        }`}>
                          <input 
                            type="radio" 
                            name="practiceMode" 
                            className="hidden" 
                            checked={practiceMode === mode}
                            onChange={() => setPracticeMode(mode)} 
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${practiceMode === mode ? 'border-blue-500' : 'border-gray-300'}`}>
                            {practiceMode === mode && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                          </div>
                          <div>
                            <span className="block font-bold text-gray-800 capitalize">{mode}</span>
                            <span className="text-xs text-gray-500 font-medium">
                              {mode === 'tutor' ? 'Untimed, see answers' : 'Simulate test conditions'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Question Mode */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                      <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                      Question Mode
                    </div>
                    <div className="inline-flex bg-gray-100 p-1.5 rounded-xl">
                      {['standard', 'custom'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setQuestionMode(mode)}
                          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                            questionMode === mode 
                              ? 'bg-white text-purple-600 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700 shadow-none'
                          }`}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
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
                        { key: 'unused', label: 'Unused', count: currentCounts.unused, color: 'blue' },
                        { key: 'incorrect', label: 'Incorrect', count: currentCounts.incorrect, color: 'red' },
                        { key: 'marked', label: 'Marked', count: currentCounts.marked, color: 'yellow' },
                        { key: 'omitted', label: 'Omitted', count: currentCounts.omitted, color: 'gray' },
                        { key: 'correct', label: 'Correct', count: currentCounts.correct, color: 'green' },
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
                          <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                            selectedFilters[item.key] ? `bg-white text-${item.color}-600` : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.count}
                          </span>
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
                        { key: 'low', label: 'Easy', count: difficultyStats.low },
                        { key: 'medium', label: 'Medium', count: difficultyStats.medium },
                        { key: 'high', label: 'Hard', count: difficultyStats.high },
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
                          <span className="text-xs bg-white px-2 py-1 rounded-md border font-bold text-gray-500">
                            {item.count}
                          </span>
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
                                 <span className="ml-auto text-xs bg-white px-2 py-1 rounded-md border text-gray-500 font-bold">{domain.count}</span>
                               </label>
                               <div className="space-y-2 pl-8">
                                 {domain.subs.map(sub => (
                                   <label key={sub} className="flex items-center gap-2 cursor-pointer group">
                                     <div className="w-4 h-4 rounded border border-gray-300 bg-white group-hover:border-blue-400 transition-colors" />
                                     <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors">{sub}</span>
                                   </label>
                                 ))}
                               </div>
                             </div>
                           ))
                         )}
                       </div>
                     )}
                  </div>

                  {/* Footer Input */}
                  <div className="pt-8 border-t flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                        Question Limit
                      </div>
                      <p className="text-xs text-gray-400">Max allowed for this set: 0</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        defaultValue={0} 
                        className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 text-center text-lg font-bold text-gray-700 focus:border-blue-500 focus:ring-0 transition-colors" 
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4 flex justify-end">
                    <button className="bg-gray-100 text-gray-400 px-10 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide cursor-not-allowed shadow-none border border-gray-200">
                      Generate Practice Set
                    </button>
                  </div>

                </div>
              )}
            </div>
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