import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheck, FiX, FiClock, FiTarget, 
  FiTrendingUp, FiBookmark, FiEdit3, FiDownload,
  FiBarChart, FiPieChart, FiActivity
} from 'react-icons/fi';
import { reviewPracticeSession } from '../../../services/api/practice';
import { showToast } from '../../../utils/toastUtils';

const ResultsPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, correct, incorrect, skipped

  useEffect(() => {
    loadSessionResults();
  }, [sessionId]);

  const loadSessionResults = async () => {
    try {
      setLoading(true);
      const response = await reviewPracticeSession(sessionId);
      if (response.success) {
        setSessionData(response.data);
      } else {
        showToast(response.message || 'Failed to load session results', 'error');
        navigate('/dashboard/practice');
      }
    } catch (error) {
      console.error('Error loading session results:', error);
      showToast('Error loading session results', 'error');
      navigate('/dashboard/practice');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'correct': return 'text-green-600 bg-green-100';
      case 'incorrect': return 'text-red-600 bg-red-100';
      case 'skipped': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'correct': return <FiCheck className="w-4 h-4" />;
      case 'incorrect': return <FiX className="w-4 h-4" />;
      default: return <FiClock className="w-4 h-4" />;
    }
  };

  const filteredQuestions = sessionData?.questions?.filter(q => {
    if (filterStatus === 'all') return true;
    return q.status === filterStatus;
  }) || [];

  const handleQuestionClick = (question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  const exportResults = () => {
    if (!sessionData) return;
    
    const csvContent = [
      ['Question', 'Your Answer', 'Correct Answer', 'Status', 'Time Spent', 'Points'],
      ...sessionData.questions.map((q, index) => [
        `Question ${index + 1}`,
        q.userAnswer || 'Skipped',
        q.correctAnswer,
        q.status,
        formatTime(q.timeSpent),
        q.pointsEarned
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-results-${sessionId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Session not found</p>
          <button
            onClick={() => navigate('/dashboard/practice')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/practice')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Practice Results
                </h1>
                <p className="text-gray-600">
                  {sessionData.subject} • {new Date(sessionData.completedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overall Score</p>
                <p className="text-3xl font-bold text-blue-600">{sessionData.score}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Correct Answers</p>
                <p className="text-3xl font-bold text-green-600">
                  {sessionData.correctAnswers}/{sessionData.totalQuestions}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Time</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatTime(sessionData.totalTimeSpent)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiClock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg per Question</p>
                <p className="text-3xl font-bold text-orange-600">
                  {sessionData.averageTimePerQuestion}s
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Analysis */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBarChart className="w-5 h-5" />
                Performance Breakdown
              </h3>
              
              <div className="space-y-4">
                {sessionData.domainPerformance?.map((domain, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{domain.name}</span>
                      <span className="text-sm text-gray-600">{domain.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${domain.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiPieChart className="w-5 h-5" />
                Difficulty Analysis
              </h3>
              
              <div className="space-y-3">
                {sessionData.difficultyPerformance?.map((diff, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 capitalize">{diff.level}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {diff.correct}/{diff.total}
                      </span>
                      <span className={`text-sm font-medium ${
                        diff.percentage >= 70 ? 'text-green-600' : 
                        diff.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {diff.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Question Review */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Questions</option>
                      <option value="correct">Correct Only</option>
                      <option value="incorrect">Incorrect Only</option>
                      <option value="skipped">Skipped Only</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Showing {filteredQuestions.length} of {sessionData.questions.length} questions</span>
                </div>
              </div>
              
              <div className="divide-y">
                {filteredQuestions.map((question, index) => (
                  <div 
                    key={question.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleQuestionClick(question)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(question.status)}`}>
                          {getStatusIcon(question.status)}
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900">
                            Question {sessionData.questions.findIndex(q => q.id === question.id) + 1}
                          </p>
                          <p className="text-sm text-gray-600">
                            {question.domain} • {question.difficulty}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatTime(question.timeSpent)}</span>
                        <span>{question.pointsEarned}/{question.totalPoints} pts</span>
                        {question.isBookmarked && <FiBookmark className="w-4 h-4 text-yellow-600" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Question Detail Modal */}
      {showQuestionModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {sessionData.questions.findIndex(q => q.id === selectedQuestion.id) + 1} Review
                </h3>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Question Status */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedQuestion.status)}`}>
                  {selectedQuestion.status.charAt(0).toUpperCase() + selectedQuestion.status.slice(1)}
                </div>
                <span className="text-sm text-gray-600">{selectedQuestion.difficulty}</span>
                <span className="text-sm text-gray-600">{selectedQuestion.domain}</span>
                <span className="text-sm text-gray-600">{formatTime(selectedQuestion.timeSpent)}</span>
              </div>
              
              {/* Question Content */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Question:</h4>
                <div className="text-gray-700 whitespace-pre-wrap">{selectedQuestion.content}</div>
              </div>
              
              {/* Answer Options */}
              {selectedQuestion.options && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Options:</h4>
                  <div className="space-y-2">
                    {selectedQuestion.options.map((option, index) => {
                      const optionLabel = String.fromCharCode(65 + index);
                      const isUserAnswer = selectedQuestion.userAnswer === optionLabel;
                      const isCorrectAnswer = selectedQuestion.correctAnswer === optionLabel;
                      
                      return (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg border-2 ${
                            isCorrectAnswer 
                              ? 'border-green-500 bg-green-50' 
                              : isUserAnswer 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                              isCorrectAnswer 
                                ? 'border-green-500 bg-green-500 text-white' 
                                : isUserAnswer 
                                ? 'border-red-500 bg-red-500 text-white' 
                                : 'border-gray-300 text-gray-600'
                            }`}>
                              {optionLabel}
                            </div>
                            <span className="flex-1">{option}</span>
                            {isCorrectAnswer && <FiCheck className="w-4 h-4 text-green-600" />}
                            {isUserAnswer && !isCorrectAnswer && <FiX className="w-4 h-4 text-red-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Explanation */}
              {selectedQuestion.explanation && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Explanation:</h4>
                  <div className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedQuestion.explanation}
                  </div>
                </div>
              )}
              
              {/* User Notes */}
              {selectedQuestion.userNotes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Your Notes:</h4>
                  <div className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                    {selectedQuestion.userNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;