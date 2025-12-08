import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiClock, FiArrowLeft, FiArrowRight, FiFlag, FiCheck, FiAlertCircle, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { getQuestions } from "../../../services/api/questions";
import { saveTestProgress, submitTestSession } from "../../../services/api/testSession";
import { showToast } from "../../../utils/toastUtils";

const AdaptiveTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { level, subject } = useParams(); // 'easy' or 'hard', 'math' or 'reading-writing'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(32 * 60); // 32 minutes in seconds
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  
  // Get base test result from navigation state
  const baseResult = location.state?.baseResult;
  const sessionId = location.state?.sessionId;

  // Subject mapping
  const subjectMap = {
    'math': 'Math',
    'reading-writing': 'Reading & Writing'
  };

  const currentSubject = subjectMap[subject] || 'Math';
  const isHardLevel = level === 'hard';
  const adaptiveLevel = isHardLevel ? 'Hard' : 'Easy';

  useEffect(() => {
    // Redirect if no base result
    if (!baseResult || !sessionId) {
      showToast('Please complete the base test first', 'error');
      navigate('/dashboard/question-banks');
      return;
    }
    
    initializeAdaptiveTest();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [level, subject]);

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

  const initializeAdaptiveTest = async () => {
    try {
      setLoading(true);
      
      // Fetch adaptive questions based on level and subject
      const questionsData = await getQuestions(
        currentSubject,
        isHardLevel ? 3 : 1, // difficulty: Hard (3) or Easy (1)
        2, // testType: Adaptive
        null, // search
        true // isActive
      );
      
      // Filter and limit to 27 questions
      const adaptiveQuestions = questionsData.data
        .filter(q => q.testType === 'Adaptive' && q.difficulty === adaptiveLevel)
        .slice(0, 27);
      
      if (adaptiveQuestions.length === 0) {
        showToast(`No ${adaptiveLevel.toLowerCase()} adaptive questions available`, 'error');
        navigate('/dashboard/test-results', {
          state: { 
            testResult: baseResult,
            sessionId: sessionId
          }
        });
        return;
      }
      
      setQuestions(adaptiveQuestions);
      startTimeRef.current = Date.now();
      
    } catch (error) {
      console.error('Error initializing adaptive test:', error);
      showToast('Failed to load adaptive test questions', 'error');
      navigate('/dashboard/test-results', {
        state: { 
          testResult: baseResult,
          sessionId: sessionId
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    showToast('Time is up! Submitting your adaptive test...', 'warning');
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
    if (!sessionId) return;
    
    try {
      await saveTestProgress(sessionId, {
        answers,
        currentQuestionIndex,
        timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
        flaggedQuestions: Array.from(flaggedQuestions),
        moduleType: 'Adaptive',
        adaptiveLevel: adaptiveLevel
      });
    } catch (error) {
      console.error('Error saving progress:', error);
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
        sessionId: sessionId,
        answers,
        timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000),
        completedAt: new Date().toISOString(),
        subject: currentSubject,
        moduleType: 'Adaptive',
        adaptiveLevel: adaptiveLevel,
        isAdaptiveModule: true
      };
      
      const result = await submitTestSession(submissionData);
      
      showToast('Adaptive test completed successfully!', 'success');
      
      // Navigate to final results
      navigate('/dashboard/test-results', {
        state: { 
          testResult: result,
          sessionId: sessionId,
          isComplete: true
        }
      });
      
    } catch (error) {
      console.error('Error submitting adaptive test:', error);
      showToast('Failed to submit adaptive test', 'error');
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
          <p className="text-gray-600">Loading adaptive test questions...</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing {adaptiveLevel.toLowerCase()} level questions for {currentSubject}
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Adaptive Questions Available</h2>
          <p className="text-gray-600 mb-4">
            There are no {adaptiveLevel.toLowerCase()} level questions available for {currentSubject}.
          </p>
          <button
            onClick={() => navigate('/dashboard/test-results', {
              state: { 
                testResult: baseResult,
                sessionId: sessionId
              }
            })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                SAT Adaptive Module - {currentSubject}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                isHardLevel 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {isHardLevel ? <FiTrendingUp className="h-3 w-3" /> : <FiTrendingDown className="h-3 w-3" />}
                <span>{adaptiveLevel} Level</span>
              </span>
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
              
              <button
                onClick={() => handleSubmitTest()}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Base Test Performance Banner */}
      {baseResult && (
        <div className={`border-b ${
          isHardLevel ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <span className="text-gray-600">Base Module Performance:</span>
              <span className="font-medium">
                {baseResult.correctAnswers || 0}/{baseResult.totalQuestions || 0} correct
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isHardLevel 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                Routed to {adaptiveLevel} Level
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
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
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isHardLevel 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {adaptiveLevel}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {currentQuestion.subject}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Adaptive
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
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Adaptive Test?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your {adaptiveLevel.toLowerCase()} level adaptive test? 
              You have answered {getAnsweredCount()} out of {questions.length} questions.
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

export default AdaptiveTest;