import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay, FiSettings, FiClock, FiBook, FiTarget, FiFilter, FiRefreshCw, FiInfo, FiHelpCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getPracticeOptions, startPracticeSession, savePracticePreferences, getPracticePreferences } from '../../../services/api/practice';
import { showToast } from '../../../utils/toastUtils';

const EnhancedCreatePracticePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [practiceOptions, setPracticeOptions] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    quickSetup: true,
    personalize: false,
    practiceMode: true,
    questionSelection: false
  });

  const [config, setConfig] = useState({
    subject: 'Math',
    questionCount: 10,
    mode: 'Mock',
    difficulty: null,
    domains: [],
    selectedTopic: null,
    selectedSubtopics: [],
    status: null
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load user preferences first
      const preferencesResponse = await getPracticePreferences();
      if (preferencesResponse.success && preferencesResponse.data) {
        const prefs = preferencesResponse.data;
        setConfig(prev => ({
          ...prev,
          subject: prefs.preferredSubject || 'Math',
          questionCount: prefs.preferredQuestionCount || 10,
          mode: prefs.preferredMode || 'Mock',
          difficulty: prefs.preferredDifficulty || null,
          domains: prefs.preferredDomains || [],
          selectedTopic: null,
          selectedSubtopics: [],
          status: prefs.preferredStatus || null
        }));
      }
      
      // Load practice options
      await loadPracticeOptions(config.subject);
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('Error loading practice data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPracticeOptions = async (subject) => {
    try {
      const response = await getPracticeOptions(subject);
      if (response.success) {
        setPracticeOptions(response.data);
      } else {
        showToast('Failed to load practice options', 'error');
      }
    } catch (error) {
      console.error('Error loading practice options:', error);
      showToast('Error loading practice options', 'error');
    }
  };

  const handleSubjectChange = async (newSubject) => {
    setConfig(prev => ({ 
      ...prev, 
      subject: newSubject, 
      domains: [],
      selectedTopic: null,
      selectedSubtopics: []
    }));
    await loadPracticeOptions(newSubject);
  };

  const handleStartPractice = async () => {
    try {
      setStartingSession(true);
      
      // Save preferences for future sessions
      await savePracticePreferences({
        preferredSubject: config.subject,
        preferredDifficulty: config.difficulty,
        preferredMode: config.mode,
        preferredQuestionCount: config.questionCount,
        preferredDomains: config.domains,
        preferredStatus: config.status
      });

      const sessionData = {
      subject: config.subject,
      difficulty: config.difficulty,
      domains: config.domains.length > 0 ? config.domains : null,
      selectedTopic: config.selectedTopic,
      selectedSubtopics: config.selectedSubtopics.length > 0 ? config.selectedSubtopics : null,
      status: config.status,
      questionCount: config.questionCount,
      mode: config.mode,
      timeLimit: config.timeLimit
    };

      const response = await startPracticeSession(sessionData);
      if (response.success) {
        navigate(`/dashboard/practice/session/${response.sessionId}`, {
          state: { sessionData: response }
        });
      } else {
        showToast(response.message || 'Failed to start practice session', 'error');
      }
    } catch (error) {
      console.error('Error starting practice session:', error);
      showToast('Error starting practice session', 'error');
    } finally {
      setStartingSession(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const resetToDefaults = () => {
    setConfig({
      subject: 'Math',
      questionCount: 10,
      mode: 'Mock',
      difficulty: null,
      domains: [],
      selectedTopic: null,
      selectedSubtopics: [],
      status: null
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create Practice Test</h1>
              <p className="text-gray-600 mt-1">Customize your practice sessions to focus on areas that need improvement</p>
            </div>
            <button
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FiHelpCircle className="w-4 h-4" />
              Launch Tutorial
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Configuration Panel */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Setup Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('quickSetup')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiPlay className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Quick Setup</h2>
                    <p className="text-sm text-gray-600">Start practicing with default settings</p>
                  </div>
                </div>
                {expandedSections.quickSetup ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {expandedSections.quickSetup && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">Questions:</label>
                      <input
                        type="number"
                        min={1}
                        max={practiceOptions?.totalQuestions || 100}
                        step={1}
                        value={config.questionCount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          let num = parseInt(raw, 10);
                          if (isNaN(num)) num = 1;
                          const max = practiceOptions?.totalQuestions || 100;
                          const clamped = Math.max(1, Math.min(num, max));
                          setConfig(prev => ({ ...prev, questionCount: clamped }));
                        }}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          let num = parseInt(raw, 10);
                          if (isNaN(num)) num = 1;
                          const max = practiceOptions?.totalQuestions || 100;
                          const safe = Math.max(1, Math.min(num, max));
                          if (safe !== config.questionCount) {
                            setConfig(prev => ({ ...prev, questionCount: safe }));
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                      />
                      <span className="text-xs text-gray-500 ml-2">Max: {practiceOptions?.totalQuestions || 100}</span>
                    </div>
                    <button
                      onClick={handleStartPractice}
                      disabled={startingSession}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {startingSession ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Starting...
                        </>
                      ) : (
                        <>
                          <FiPlay className="w-4 h-4" />
                          START PRACTICE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Personalize Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('personalize')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiSettings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Personalize</h2>
                    <p className="text-sm text-gray-600">Advanced test customization options</p>
                  </div>
                </div>
                {expandedSections.personalize ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {expandedSections.personalize && (
                <div className="px-6 pb-6 border-t border-gray-100 space-y-6">
                  {/* Subject Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Subject</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {practiceOptions?.subjects?.map((subject) => (
                        <button
                          key={subject}
                          onClick={() => handleSubjectChange(subject)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            config.subject === subject
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="font-medium">{subject}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {practiceOptions?.totalQuestions || 0} questions
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic Selection */}
                  {config.subject && config.subject !== 'All' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Topics
                        <button className="ml-2 text-gray-400 hover:text-gray-600">
                          <FiInfo className="w-4 h-4" />
                        </button>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {config.subject === 'Math' && practiceOptions?.mathSubtopics && 
                          Object.keys(practiceOptions.mathSubtopics).map((topic) => (
                            <button
                              key={topic}
                              onClick={() => setConfig(prev => ({
                                ...prev,
                                selectedTopic: prev.selectedTopic === topic ? null : topic,
                                selectedSubtopics: [] // Reset subtopics when topic changes
                              }))}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                config.selectedTopic === topic
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{topic}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {practiceOptions.mathSubtopics[topic].length} subtopics
                              </div>
                            </button>
                          ))
                        }
                        {config.subject === 'Reading & Writing' && practiceOptions?.readingWritingTopics && 
                          Object.keys(practiceOptions.readingWritingTopics).map((topic) => (
                            <button
                              key={topic}
                              onClick={() => setConfig(prev => ({
                                ...prev,
                                selectedTopic: prev.selectedTopic === topic ? null : topic,
                                selectedSubtopics: [] // Reset subtopics when topic changes
                              }))}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                config.selectedTopic === topic
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{topic}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {practiceOptions.readingWritingTopics[topic].length} subtopics
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Subtopic Selection */}
                  {config.selectedTopic && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Subtopics for {config.selectedTopic}
                        <button className="ml-2 text-gray-400 hover:text-gray-600">
                          <FiInfo className="w-4 h-4" />
                        </button>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {config.subject === 'Math' && practiceOptions?.mathSubtopics?.[config.selectedTopic]?.map((subtopic) => (
                          <button
                            key={subtopic}
                            onClick={() => setConfig(prev => ({
                              ...prev,
                              selectedSubtopics: prev.selectedSubtopics?.includes(subtopic)
                                ? prev.selectedSubtopics.filter(s => s !== subtopic)
                                : [...(prev.selectedSubtopics || []), subtopic]
                            }))}
                            className={`p-2 rounded-lg border text-sm transition-all text-left ${
                              config.selectedSubtopics?.includes(subtopic)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {subtopic}
                          </button>
                        ))}
                        {config.subject === 'Reading & Writing' && practiceOptions?.readingWritingTopics?.[config.selectedTopic]?.map((subtopic) => (
                          <button
                            key={subtopic}
                            onClick={() => setConfig(prev => ({
                              ...prev,
                              selectedSubtopics: prev.selectedSubtopics?.includes(subtopic)
                                ? prev.selectedSubtopics.filter(s => s !== subtopic)
                                : [...(prev.selectedSubtopics || []), subtopic]
                            }))}
                            className={`p-2 rounded-lg border text-sm transition-all text-left ${
                              config.selectedSubtopics?.includes(subtopic)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {subtopic}
                          </button>
                        ))}
                      </div>
                      {config.selectedSubtopics?.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Selected: {config.selectedSubtopics.length} subtopic{config.selectedSubtopics.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Difficulty Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Difficulty Level
                      <button className="ml-2 text-gray-400 hover:text-gray-600">
                        <FiInfo className="w-4 h-4" />
                      </button>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                        <button
                          key={difficulty}
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            difficulty: prev.difficulty === difficulty ? null : difficulty
                          }))}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            config.difficulty === difficulty
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {difficulty}
                          {practiceOptions?.difficultyDistribution?.[difficulty] && (
                            <div className="text-xs text-gray-500 mt-1">
                              {practiceOptions.difficultyDistribution[difficulty]} questions
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, difficulty: null }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          config.difficulty === null
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        All Levels
                      </button>
                    </div>
                  </div>


                </div>
              )}
            </div>

            {/* Practice Mode Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('practiceMode')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiClock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Practice Mode</h2>
                    <p className="text-sm text-gray-600">Choose how you want to practice</p>
                  </div>
                </div>
                {expandedSections.practiceMode ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {expandedSections.practiceMode && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div
                      onClick={() => setConfig(prev => ({ ...prev, mode: 'Mock' }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        config.mode === 'Mock'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          config.mode === 'Mock' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {config.mode === 'Mock' && <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>}
                        </div>
                        <FiBook className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Mock Mode</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Practice without time limits, review answers at the end
                      </p>
                    </div>
                    
                    <div
                      onClick={() => setConfig(prev => ({ ...prev, mode: 'Timed' }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        config.mode === 'Timed'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          config.mode === 'Timed' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {config.mode === 'Timed' && <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>}
                        </div>
                        <FiClock className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Timed Mode</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Practice with time limits and pressure, review answers at the end
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Question Selection Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('questionSelection')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiTarget className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Question Selection</h2>
                    <p className="text-sm text-gray-600">Choose question pools based on your performance</p>
                  </div>
                </div>
                {expandedSections.questionSelection ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {expandedSections.questionSelection && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[
                      { key: 'unused', label: 'Unused', count: practiceOptions?.statusCounts?.unused, color: 'gray' },
                      { key: 'incorrect', label: 'Incorrect', count: practiceOptions?.statusCounts?.incorrect, color: 'red' },
                      { key: 'correct', label: 'Correct', count: practiceOptions?.statusCounts?.correct, color: 'green' },
                      { key: 'mastered', label: 'Mastered', count: practiceOptions?.statusCounts?.mastered, color: 'blue' },
                      { key: 'flagged', label: 'Flagged', count: practiceOptions?.statusCounts?.flagged, color: 'purple' }
                    ].map((status) => (
                      <button
                        key={status.key}
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          status: prev.status === status.key ? null : status.key
                        }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          config.status === status.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {status.label}
                        <div className="text-xs text-gray-500 mt-1">
                          {status.count || 0} questions
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiTarget className="w-5 h-5" />
                Practice Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium">{config.subject}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium">{config.questionCount}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Mode:</span>
                  <span className="font-medium">{config.mode}</span>
                </div>
                
                {config.difficulty && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="font-medium">{config.difficulty}</span>
                  </div>
                )}
                
                {config.status && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium capitalize">{config.status}</span>
                  </div>
                )}
                
                {config.selectedTopic && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-gray-600">Topic:</span>
                    <span className="font-medium ml-2">{config.selectedTopic}</span>
                  </div>
                )}
                
                {config.selectedSubtopics?.length > 0 && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-gray-600">Subtopics:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {config.selectedSubtopics.slice(0, 2).map((subtopic) => (
                        <span key={subtopic} className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          {subtopic}
                        </span>
                      ))}
                      {config.selectedSubtopics.length > 2 && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{config.selectedSubtopics.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleStartPractice}
                    disabled={startingSession}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {startingSession ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <FiPlay className="w-4 h-4" />
                        Start Practice
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={resetToDefaults}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Reset to Defaults
                  </button>
                </div>

                {/* Quick Stats */}
                {practiceOptions && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Questions</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-900">{practiceOptions.statusCounts?.unused || 0}</div>
                        <div className="text-gray-600">Unused</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <div className="font-medium text-red-900">{practiceOptions.statusCounts?.incorrect || 0}</div>
                        <div className="text-red-600">Incorrect</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-900">{practiceOptions.statusCounts?.correct || 0}</div>
                        <div className="text-green-600">Correct</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="font-medium text-blue-900">{practiceOptions.statusCounts?.mastered || 0}</div>
                        <div className="text-blue-600">Mastered</div>
                      </div>
+                      <div className="bg-purple-50 p-2 rounded">
+                        <div className="font-medium text-purple-900">{practiceOptions.statusCounts?.flagged || 0}</div>
+                        <div className="text-purple-600">Flagged</div>
+                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">How to Use Practice Creation</h2>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Quick Setup</h3>
                  <p>Use this for immediate practice with default settings. Just select the number of questions and start practicing.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Personalize</h3>
                  <p>Customize your practice by selecting specific subjects, difficulty levels, and topics to focus on areas that need improvement.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Practice Mode</h3>
                  <p><strong>Tutor Mode:</strong> Get immediate feedback after each question.<br/>
                     <strong>Timed Mode:</strong> Practice under time pressure with feedback at the end.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Question Selection</h3>
                  <p>Choose from different question pools based on your past performance to target specific areas.</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCreatePracticePage;