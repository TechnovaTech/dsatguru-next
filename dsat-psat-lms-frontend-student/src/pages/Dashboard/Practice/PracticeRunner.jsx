import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiClock, FiArrowLeft, FiArrowRight, FiCheck, FiX, 
  FiBookmark, FiEdit3, FiFlag, FiPause, FiPlay,
  FiSkipForward, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import { saveAnswer, submitPracticeSession, reviewPracticeSession } from '../../../services/api/practice';
import { showToast } from '../../../utils/toastUtils';

const PracticeRunner = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(location.state?.sessionData || null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [answerChanges, setAnswerChanges] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const timerRef = useRef(null);
  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    if (sessionData?.question) {
      setCurrentQuestion(sessionData.question);
      setCurrentQuestionIndex(sessionData.currentQuestion || 1);
      questionStartTime.current = Date.now();
      setTimeSpent(0);
      setUserAnswer('');
      setShowFeedback(false);
      setFeedback(null);
      setConfidenceLevel(3);
      setAnswerChanges(0);
    }
  }, [sessionData]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const questionTime = Math.floor((now - questionStartTime.current) / 1000);
        setTimeSpent(questionTime);
        setTotalTimeSpent(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleAnswerChange = (newAnswer) => {
    if (userAnswer !== newAnswer) {
      setAnswerChanges(prev => prev + 1);
    }
    setUserAnswer(newAnswer);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      showToast('Please select an answer before submitting', 'warning');
      return;
    }

    try {
      setIsTimerRunning(false);
      const answerData = {
        sessionId,
        questionId: currentQuestion.id,
        userAnswer: userAnswer.trim(),
        timeSpent,
        confidenceLevel,
        answerChanges
      };

      const response = await saveAnswer(answerData);
      if (response.success) {
        setFeedback({
          isCorrect: response.isCorrect,
          correctAnswer: response.correctAnswer,
          explanation: response.explanation
        });
        
        if (sessionData.mode === 'Mock') {
          // In Mock mode, don't show immediate feedback
          // Feedback will be shown at the end during review
        } else if (sessionData.mode === 'Timed') {
          // In Timed mode, also don't show immediate feedback
        }
        
        // Check if there's a next question
        if (response.nextQuestion) {
          setSessionData(prev => ({
            ...prev,
            question: response.nextQuestion,
            currentQuestion: currentQuestionIndex + 1
          }));
        } else {
          // No more questions, session is complete
          setSessionComplete(true);
          await handleCompleteSession();
        }
      } else {
        showToast(response.message || 'Failed to save answer', 'error');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      showToast('Error submitting answer', 'error');
      setIsTimerRunning(true);
    }
  };

  const handleNextQuestion = () => {
    if (feedback && sessionData.question) {
      setCurrentQuestion(sessionData.question);
      setCurrentQuestionIndex(prev => prev + 1);
      questionStartTime.current = Date.now();
      setTimeSpent(0);
      setUserAnswer('');
      setShowFeedback(false);
      setFeedback(null);
      setConfidenceLevel(3);
      setAnswerChanges(0);
      setIsBookmarked(false);
      setUserNotes('');
      setIsTimerRunning(true);
    }
  };

  const handleCompleteSession = async () => {
    try {
      setIsSubmitting(true);
      const response = await submitPracticeSession(sessionId);
      if (response.success) {
        setSessionResults(response.results);
        showToast('Practice session completed!', 'success');
      } else {
        showToast(response.message || 'Failed to complete session', 'error');
      }
    } catch (error) {
      console.error('Error completing session:', error);
      showToast('Error completing session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseResume = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewResults = () => {
    navigate(`/dashboard/practice/results/${sessionId}`);
  };

  const handleBackToPractice = () => {
    navigate('/dashboard/practice/create');
  };

  if (!sessionData || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice session...</p>
        </div>
      </div>
    );
  }

  if (sessionComplete && sessionResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Practice Complete!</h1>
            <p className="text-gray-600 mb-8">Great job! Here's how you performed:</p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {sessionResults.score}%
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {sessionResults.correctAnswers}/{sessionResults.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {formatTime(sessionResults.totalTimeSpent)}
                </div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {sessionResults.averageTimePerQuestion}s
                </div>
                <div className="text-sm text-gray-600">Avg per Question</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleViewResults}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiCheck className="w-4 h-4" />
                Review Answers
              </button>
              
              <button
                onClick={handleBackToPractice}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" />
                New Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/practice/create')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {sessionData.subject} Practice
                </h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex} of {sessionData.totalQuestions}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <FiClock className="w-4 h-4 text-gray-600" />
                <span className="font-mono text-sm">{formatTime(timeSpent)}</span>
                <button
                  onClick={handlePauseResume}
                  className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {isTimerRunning ? <FiPause className="w-3 h-3" /> : <FiPlay className="w-3 h-3" />}
                </button>
              </div>
              
              {/* Progress */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentQuestionIndex / sessionData.totalQuestions) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {Math.round((currentQuestionIndex / sessionData.totalQuestions) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                    {currentQuestion.difficulty}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {currentQuestion.points} points
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`p-2 rounded-lg transition-colors ${
                      isBookmarked 
                        ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FiBookmark className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowNotesModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FiEdit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Question Content */}
              <div className="mb-6">
                <div className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.content}
                </div>
              </div>
              
              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerChange(optionLabel)}
                      className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                        userAnswer === optionLabel
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          userAnswer === optionLabel
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-600'
                        }`}>
                          {optionLabel}
                        </div>
                        <div className="flex-1 text-gray-900">{option}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Feedback Panel */}
            {showFeedback && feedback && (
              <div className={`rounded-lg border-2 p-6 mb-6 ${
                feedback.isCorrect 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {feedback.isCorrect ? (
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <FiX className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    feedback.isCorrect ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                
                {!feedback.isCorrect && (
                  <p className="text-red-700 mb-2">
                    The correct answer is: <strong>{feedback.correctAnswer}</strong>
                  </p>
                )}
                
                {feedback.explanation && (
                  <div className="text-gray-700">
                    <strong>Explanation:</strong>
                    <p className="mt-1">{feedback.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Controls</h3>
              
              {/* Confidence Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Level: {confidenceLevel}/5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time on question:</span>
                  <span className="font-medium">{formatTime(timeSpent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Answer changes:</span>
                  <span className="font-medium">{answerChanges}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {!showFeedback ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiCheck className="w-4 h-4" />
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiArrowRight className="w-4 h-4" />
                    Next Question
                  </button>
                )}
                
                {sessionData.mode === 'Timed' && (
                  <button
                    onClick={() => handleSubmitAnswer()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FiSkipForward className="w-4 h-4" />
                    Skip Question
                  </button>
                )}
                
                <button
                  onClick={handleCompleteSession}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <FiFlag className="w-4 h-4" />
                  )}
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Notes</h3>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Add your notes about this question..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  showToast('Notes saved', 'success');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeRunner;