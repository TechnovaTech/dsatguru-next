'use client'
import { useState } from 'react'
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

  const [selectedDomains, setSelectedDomains] = useState({
    // RW Domains
    infoIdeas: false,
    craftStructure: false,
    expressionIdeas: false,
    standardEnglish: false,
    // Math Domains
    algebra: false,
    advancedMath: false,
    problemSolving: false,
    geometry: false
  })

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <div className="bg-blue-500 p-1.5 rounded text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </div>
        <h1 className="text-xl font-normal text-gray-700">Create Practice</h1>
        <div className="ml-auto flex gap-4 text-sm text-blue-600">
          <button className="hover:underline">Free Trial Checklist</button>
          <button className="hover:underline">Test Date</button>
          <button className="hover:underline">My Account</button>
          <button className="hover:underline">Log out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Top Actions */}
        <div className="flex justify-end gap-3 mb-6">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Full Access
          </button>
          <button className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Launch Tutorial
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-t-lg border-b w-fit">
          <button
            onClick={() => setActiveTab('rw')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'rw' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reading and Writing
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'math' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Math
          </button>
        </div>

        <div className="bg-white rounded-b-lg shadow-sm border border-t-0 p-6 space-y-6">
          
          {/* Quick Section */}
          <div className="bg-gray-50 rounded border">
            <button 
              onClick={() => toggleSection('quick')}
              className="w-full px-4 py-2 flex items-center justify-between text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2 font-medium">
                Quick <FiInfo className="text-blue-400" />
              </div>
              {expandedSections.quick ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            
            {expandedSections.quick && (
              <div className="p-4 border-t flex items-center gap-4">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium uppercase tracking-wide">
                  Start Practice
                </button>
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={1} className="w-16 border rounded px-2 py-1.5 text-center text-sm" />
                  <span className="text-sm text-gray-500">Max Questions {currentCounts.unused}</span>
                </div>
              </div>
            )}
          </div>

          {/* Personalize Section */}
          <div className="bg-gray-50 rounded border">
            <button 
              onClick={() => toggleSection('personalize')}
              className="w-full px-4 py-2 flex items-center justify-between text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2 font-medium">
                Personalize <FiInfo className="text-blue-400" />
              </div>
              {expandedSections.personalize ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {expandedSections.personalize && (
              <div className="p-6 border-t space-y-8 bg-white">
                
                {/* Practice Mode */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3">
                    Practice Mode <FiInfo className="text-blue-400" />
                  </div>
                  <div className="flex items-center gap-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${practiceMode === 'tutor' ? 'bg-blue-500' : 'bg-gray-300'}`}
                        onClick={() => setPracticeMode('tutor')}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${practiceMode === 'tutor' ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm text-gray-600">Tutor</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${practiceMode === 'timed' ? 'bg-blue-500' : 'bg-gray-300'}`}
                        onClick={() => setPracticeMode('timed')}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${practiceMode === 'timed' ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm text-gray-600">Timed</span>
                    </label>
                  </div>
                </div>

                {/* Question Mode */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3">
                    Question Mode <FiInfo className="text-blue-400" />
                  </div>
                  <div className="inline-flex bg-gray-100 rounded-full p-1">
                    <button
                      onClick={() => setQuestionMode('standard')}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        questionMode === 'standard' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setQuestionMode('custom')}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        questionMode === 'custom' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Status Filters */}
                <div className="flex flex-wrap gap-6">
                  {[
                    { key: 'unused', label: 'Unused', count: currentCounts.unused, total: 459 },
                    { key: 'incorrect', label: 'Incorrect', count: currentCounts.incorrect, total: 0 },
                    { key: 'marked', label: 'Marked', count: currentCounts.marked, total: 0 },
                    { key: 'omitted', label: 'Omitted', count: currentCounts.omitted, total: 0 },
                    { key: 'correct', label: 'Correct', count: currentCounts.correct, total: 0 },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
                      <div 
                        onClick={() => toggleFilter(item.key)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedFilters[item.key] ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                        }`}
                      >
                        {selectedFilters[item.key] && <FiCheckSquare className="text-white w-3 h-3" />}
                      </div>
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full border text-blue-600 font-medium">
                        {item.count}
                      </span>
                      {item.total > 0 && (
                        <span className="text-xs bg-white px-1.5 py-0.5 rounded-full border text-gray-400">
                          {item.total}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {/* Difficulty Level */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3">
                    Difficulty Level <FiInfo className="text-blue-400" />
                  </div>
                  <div className="flex gap-6">
                    {[
                      { key: 'low', label: 'Low', count: currentCounts.low, total: 150 },
                      { key: 'medium', label: 'Medium', count: currentCounts.medium, total: 213 },
                      { key: 'high', label: 'High', count: currentCounts.high, total: 96 },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
                        <div 
                          onClick={() => toggleFilter(item.key)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedFilters[item.key] ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                          }`}
                        >
                          {selectedFilters[item.key] && <FiCheckSquare className="text-white w-3 h-3" />}
                        </div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full border text-blue-600 font-medium">
                          {item.count}
                        </span>
                        <span className="text-xs bg-white px-1.5 py-0.5 rounded-full border text-gray-400">
                          {item.total}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Domains and Units */}
                <div className="pt-4 border-t">
                   <div 
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => toggleSection('domains')}
                   >
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        {expandedSections.domains ? <FiCheckSquare className="text-blue-500" /> : <FiSquare className="text-gray-400" />} Domains and Units <FiInfo className="text-blue-400" />
                      </div>
                      <button className="text-xs text-blue-500 font-medium hover:underline">
                        — Collapse All
                      </button>
                   </div>

                   {expandedSections.domains && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 ml-1">
                       {activeTab === 'rw' ? (
                         <>
                           {/* RW Domains */}
                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Information and Ideas</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">6</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">131</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Explicit Meaning', 'Main Idea', 'Evidence', 'Inference', 'Graphic Displays'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">1</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Expression of Ideas</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">6</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">60</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Transitions', 'Synthesis'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">2</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Craft and Structure</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">7</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">119</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Vocabulary', 'Purpose', 'Connections'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">3</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Standard English Conventions</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">9</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">149</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Agreement', 'Parts of Speech', 'Punctuation', 'Sentence Structure'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">3</span>
                                 </label>
                               ))}
                             </div>
                           </div>
                         </>
                       ) : (
                         <>
                           {/* Math Domains */}
                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Algebra</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">6</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">376</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Linear Equations', 'Linear Functions: Graphs', 'Linear Functions: Creating', 'Systems of Linear Equations', 'Linear Inequalities'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">1</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Problem-Solving and Data Analysis</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">9</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">296</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Proportional Relationships', 'Percentages', 'Center and Spread', 'Data Representation', 'Two-Variable Data', 'Probability'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">1</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Advanced Math</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">4</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">364</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Equivalent Expressions', 'Quadratic Equations', 'Polynomial Functions', 'Radical and Rational', 'Exponential Functions'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">1</span>
                                 </label>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="flex items-center gap-2 cursor-pointer mb-2">
                               <div className="w-4 h-4 rounded border border-gray-400" />
                               <span className="text-sm text-gray-600">Geometry and Trigonometry</span>
                               <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-blue-600">9</span>
                               <span className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-400">205</span>
                             </label>
                             <div className="pl-6 space-y-1.5">
                               {['Perimeter, Area, Volume', 'Lines, Angles, Polygons', 'Triangle Congruence', 'Right Triangles', 'Circles'].map(sub => (
                                 <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                   <div className="w-3.5 h-3.5 rounded border border-gray-300" />
                                   <span className="text-xs text-gray-500">{sub}</span>
                                   <span className="text-[10px] bg-gray-50 px-1 rounded border text-blue-500">1</span>
                                 </label>
                               ))}
                             </div>
                           </div>
                         </>
                       )}
                     </div>
                   )}
                </div>

                {/* Footer Input */}
                <div className="pt-6 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3">
                    No. of Questions <FiInfo className="text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue={0} className="w-16 border rounded px-2 py-1.5 text-center text-sm bg-gray-50" />
                    <span className="text-sm text-gray-500">Max allowed per practice set <span className="bg-gray-200 px-1 rounded">0</span></span>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-2">
                  <button className="bg-blue-300 text-white px-6 py-2 rounded text-sm font-medium uppercase tracking-wide cursor-not-allowed">
                    Generate Practice
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Action Button (Optional, as per UI design it's usually fixed) */}
      <div className="fixed bottom-6 right-6">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold border border-green-200 shadow-lg">
          1 / 5
        </div>
      </div>
    </div>
  )
}