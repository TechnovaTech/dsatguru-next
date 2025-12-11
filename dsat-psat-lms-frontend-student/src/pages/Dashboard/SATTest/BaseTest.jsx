import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiClock, FiArrowLeft, FiArrowRight, FiFlag, FiCheck, FiAlertCircle, FiSave, FiRefreshCcw, FiWifiOff } from "react-icons/fi";
import { getBaseTestQuestions } from "../../../services/api/questions";
import { startTestSession, saveTestProgress, submitTestSession } from "../../../services/api/testSession";
import { showToast } from "../../../utils/toastUtils";
import { API_BASE_URL } from "../../../services/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const BaseTest = () => {
  const navigate = useNavigate();
  const { subject, questionBankId } = useParams(); // 'math' or 'reading-writing', optional questionBankId
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(32 * 60); // 32 minutes in seconds
  const [testSession, setTestSession] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const [saveStatus, setSaveStatus] = useState('idle');
  const TOTAL_TIME = 32 * 60;
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  // Subject mapping
  const subjectMap = {
    'math': 'Math',
    'reading-writing': 'Reading & Writing'
  };

  const currentSubject = subjectMap[subject] || 'Math';

  useEffect(() => {
    initializeTest();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [subject]);

  useEffect(() => {
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Show connectivity changes
  useEffect(() => {
    const handleOffline = () => showToast('You are offline. Some actions may fail.', 'warning');
    const handleOnline = () => showToast('Back online', 'success');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const initializeTest = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch base module questions for the specific subject and question bank (if provided)
      const questionsData = await getBaseTestQuestions(
        currentSubject,
        27,
        questionBankId || null
      );
      const baseQuestions = questionsData.data || [];
      if (baseQuestions.length === 0) {
        setQuestions([]);
        setError('No questions available for this test');
        return;
      }
      setQuestions(baseQuestions);
      // Start test session
      const sessionData = await startTestSession({
        moduleRoute: `base-${subject}`,
        subject: currentSubject,
        testType: 'Base',
        totalQuestions: baseQuestions.length,
        questionBankId: questionBankId || null
      });
      setTestSession(sessionData);
      startTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error initializing test:', error);
      setError(error?.message || 'Failed to load test questions');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await initializeTest();
    setRetrying(false);
  };

  const handleTimeUp = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    showToast('Time is up! Submitting your test...', 'warning');
    await handleSubmitTest(true); // Auto-submit when time is up
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Auto-save progress
    saveProgress();
  };

  const saveProgress = async () => {
    if (!testSession) return;
    try {
      setSaveStatus('saving');
      await saveTestProgress(testSession.id, {
        answers,
        currentQuestionIndex,
        timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
        flaggedQuestions: Array.from(flaggedQuestions)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (error) {
      console.error('Error saving progress:', error);
      setSaveStatus('error');
    }
  };

  const handleFlagQuestion = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!autoSubmit && !showSubmitConfirm) {
      setShowSubmitConfirm(true);
      return;
    }

    try {
      setSubmitting(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const submissionData = {
        sessionId: testSession.id,
        answers,
        timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
        completedAt: new Date().toISOString(),
        subject: currentSubject,
        moduleType: 'Base'
      };
      
      const result = await submitTestSession(submissionData);
      
      showToast('Test submitted successfully!', 'success');
      
      // Navigate to results or adaptive test based on performance
      if (result.routeToAdaptive) {
        navigate(`/dashboard/test/adaptive-${result.adaptiveLevel}/${subject}`, {
          state: { 
            baseResult: result,
            sessionId: testSession.id
          }
        });
      } else {
        navigate('/dashboard/test-results', {
          state: { 
            testResult: result,
            sessionId: testSession.id
          }
        });
      }
      
    } catch (error) {
      console.error('Error submitting test:', error);
      showToast('Failed to submit test', 'error');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getFlaggedCount = () => {
    return flaggedQuestions.size;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto bg-white p-6 rounded-lg shadow">
          <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to start test</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <FiRefreshCcw className="h-4 w-4" />
              <span>{retrying ? 'Retrying...' : 'Retry'}</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/question-banks')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back to Question Banks
            </button>
          </div>
          {!navigator.onLine && (
            <div className="flex items-center justify-center space-x-2 text-orange-600 mt-4 text-sm">
              <FiWifiOff className="h-4 w-4" />
              <span>You appear to be offline</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h2>
          <p className="text-gray-600 mb-4">There are no questions available for this test.</p>
          <button
            onClick={() => navigate('/dashboard/question-banks')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Question Banks
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  // Bottom pagination derived values and diagram/chart helpers
  const PER_PAGE = 10; // Number of question buttons shown per page in bottom navigation
  const totalPages = Math.max(1, Math.ceil(questions.length / PER_PAGE));
  const currentPage = Math.floor(currentQuestionIndex / PER_PAGE);
  const pageStartIndex = currentPage * PER_PAGE;
  const pageEndIndex = Math.min(questions.length, pageStartIndex + PER_PAGE);
  const showSidebarNav = false; // Hide sidebar number grid to avoid duplication with bottom pagination

  const goToPage = (page) => {
    if (page < 0 || page >= totalPages) return;
    const newIndex = page * PER_PAGE;
    setCurrentQuestionIndex(Math.min(questions.length - 1, newIndex));
  };

  const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
  };

  const extractImageFromContent = (content) => {
    if (!content || typeof content !== 'string') return null;
    const match = content.match(/https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|svg)/i);
    return match ? match[0] : null;
  };

  const imageUrlRaw = currentQuestion?.imageUrl || currentQuestion?.ImageUrl || currentQuestion?.diagramUrl || currentQuestion?.diagram || extractImageFromContent(currentQuestion?.content);
  const imageUrl = resolveMediaUrl(imageUrlRaw);
  const chartData = currentQuestion?.chartData || null; // Expected shape: [{ name: 'A', value: 10 }, ...]
  const hasDiagram = Boolean(imageUrl || chartData);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                SAT Base Module - {currentSubject}
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FiCheck className="h-4 w-4" />
                <span>Answered: {getAnsweredCount()}/{questions.length}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FiFlag className="h-4 w-4" />
                <span>Flagged: {getFlaggedCount()}</span>
              </div>

              <div className={`flex items-center space-x-2 text-sm font-medium ${
                timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
              }`}>
                <FiClock className="h-4 w-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                {saveStatus === 'saving' && (
                  <>
                    <FiSave className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <FiCheck className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <FiAlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Save failed</span>
                  </>
                )}
              </div>
              
              <button
                onClick={() => handleSubmitTest()}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
          <div className="py-2">
            <div className="h-1 bg-gray-200 w-full rounded">
              <div
                className={`${timeRemaining < 300 ? 'bg-red-500' : 'bg-blue-600'} h-1 rounded`}
                style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / TOTAL_TIME) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`grid grid-cols-1 ${hasDiagram ? (showSidebarNav ? 'lg:grid-cols-5' : 'lg:grid-cols-4') : (showSidebarNav ? 'lg:grid-cols-4' : 'lg:grid-cols-3')} gap-6`}>
          {/* Question Navigation Sidebar */}
          {showSidebarNav && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Question Navigation</h3>
                <div className="grid grid-cols-6 gap-2">
                  {questions.map((_, index) => {
                    const questionId = questions[index]?.id;
                    const isAnswered = answers[questionId];
                    const isFlagged = flaggedQuestions.has(questionId);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-8 h-8 text-xs rounded-md border-2 relative ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : isAnswered
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {index + 1}
                        {isFlagged && (
                          <FiFlag className="absolute -top-1 -right-1 h-3 w-3 text-orange-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-gray-300 rounded"></div>
                    <span>Not answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Flagged</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Question Content */}
          <div className={hasDiagram ? "lg:col-span-3" : "lg:col-span-3"}>
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {currentQuestion.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {currentQuestion.subject}
                  </span>
                </div>
                
                <button
                  onClick={() => handleFlagQuestion(currentQuestion.id)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm ${
                    flaggedQuestions.has(currentQuestion.id)
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiFlag className="h-4 w-4" />
                  <span>{flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'}</span>
                </button>
              </div>

              {/* Question Content */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Question {currentQuestionIndex + 1}
                </h2>
                <div className="prose max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.content}
                  </p>
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-3 mb-6">
                {currentQuestion.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answers[currentQuestion.id] === optionLetter;
                  
                  return (
                    <label
                      key={index}
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={optionLetter}
                        checked={isSelected}
                        onChange={() => handleAnswerSelect(currentQuestion.id, optionLetter)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-start space-x-2">
                          <span className="font-medium text-gray-900">{optionLetter}.</span>
                          <span className="text-gray-800">{option}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <FiArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Diagram / Chart Panel (shows if the question has image/chart data) */}
          {hasDiagram && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 h-full">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Diagram / Chart</h3>
                <div className="relative w-full h-64 border border-gray-200 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Question Diagram" className="w-full h-full object-contain" />
                  ) : chartData ? (
                    <div className="w-full h-full p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No diagram available</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Pagination Navigation */}
        {questions.length > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Prev Page</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center justify-center gap-1 min-w-max">
                  {Array.from({ length: pageEndIndex - pageStartIndex }, (_, i) => pageStartIndex + i).map((idx) => {
                    const qId = questions[idx]?.id;
                    const isAnswered = !!answers[qId];
                    const isCurrent = idx === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(qId);
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-8 h-8 text-xs rounded-md border-2 relative ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : isAnswered
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                        title={`Question ${idx + 1}`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <FiFlag className="absolute -top-1 -right-1 h-3 w-3 text-orange-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next Page</span>
                <span className="sm:hidden">Next</span>
              </button>
            </div>
            <div className="mt-2 text-center text-xs text-gray-500">Page {currentPage + 1} of {totalPages}</div>
          </div>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Test?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your test? You have answered {getAnsweredCount()} out of {questions.length} questions.
              {questions.length - getAnsweredCount() > 0 && (
                <span className="block mt-2 text-orange-600">
                  You have {questions.length - getAnsweredCount()} unanswered questions.
                </span>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitTest(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseTest;