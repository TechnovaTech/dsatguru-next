import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTrendingUp, FiTrendingDown, FiClock, FiTarget, FiBookOpen, FiRefreshCw, FiDownload, FiEye, FiCheck, FiX, FiFlag } from "react-icons/fi";
import { getTestResults } from "../../../services/api/testSession";
import { showToast } from "../../../utils/toastUtils";

const TestResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [selectedSection, setSelectedSection] = useState('all');
  
  // Get result data from navigation state or fetch from API
  const sessionId = location.state?.sessionId;
  const isComplete = location.state?.isComplete;

  useEffect(() => {
    if (location.state?.testResult) {
      setTestResult(location.state.testResult);
      setLoading(false);
    } else if (sessionId) {
      fetchTestResults();
    } else {
      // Fallback to mock data for development
      setTestResult(mockTestResult);
      setLoading(false);
    }
  }, [sessionId]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      const result = await getTestResults(sessionId);
      setTestResult(result);
    } catch (error) {
      console.error('Error fetching test results:', error);
      showToast('Failed to load test results', 'error');
      // Use mock data as fallback
      setTestResult(mockTestResult);
    } finally {
      setLoading(false);
    }
  };

  const mockTestResult = {
    sessionId: 'mock-session-123',
    totalScore: 1420,
    maxScore: 1600,
    percentile: 85,
    completedAt: new Date().toISOString(),
    timeSpent: 3840, // 64 minutes
    isSAT: true,
    testType: 'Diagnostic',
    sections: {
      'Reading & Writing': {
        score: 720,
        maxScore: 800,
        correctAnswers: 22,
        totalQuestions: 27,
        timeSpent: 1920, // 32 minutes
        difficulty: 'Base',
        adaptiveLevel: null,
        percentCorrect: 81.5,
        strengths: ['Grammar', 'Vocabulary'],
        weaknesses: ['Reading Comprehension', 'Rhetoric']
      },
      'Math': {
        score: 700,
        maxScore: 800,
        correctAnswers: 20,
        totalQuestions: 27,
        timeSpent: 1920, // 32 minutes
        difficulty: 'Base',
        adaptiveLevel: null,
        percentCorrect: 74.1,
        strengths: ['Algebra', 'Linear Equations'],
        weaknesses: ['Geometry', 'Data Analysis']
      }
    },
    adaptiveResults: {
      'Reading & Writing': {
        level: 'Hard',
        score: 750,
        correctAnswers: 18,
        totalQuestions: 27,
        timeSpent: 1800,
        improvement: 30,
        nextRecommendation: 'Continue with advanced reading passages'
      },
      'Math': {
        level: 'Medium',
        score: 680,
        correctAnswers: 17,
        totalQuestions: 27,
        timeSpent: 1900,
        improvement: -20,
        nextRecommendation: 'Focus on foundational algebra concepts'
      }
    },
    overallAnalysis: {
      strongestArea: 'Reading & Writing',
      weakestArea: 'Math',
      timeManagement: 'Good',
      recommendedStudyHours: 40,
      targetScore: 1500,
      improvementPotential: 80
    },
    questionReview: [
      {
        id: 1,
        subject: 'Reading & Writing',
        content: 'Sample question about reading comprehension...',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        userAnswer: 'A',
        isCorrect: true,
        timeSpent: 45,
        difficulty: 'Base',
        isFlagged: false
      },
      {
        id: 2,
        subject: 'Math',
        content: 'Solve for x: 2x + 5 = 13',
        options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
        correctAnswer: 'B',
        userAnswer: 'C',
        isCorrect: false,
        timeSpent: 120,
        difficulty: 'Base',
        isFlagged: true
      }
    ],
    recommendations: [
      {
        area: 'Reading & Writing',
        strength: true,
        message: 'Excellent performance in reading comprehension. Continue practicing advanced passages.'
      },
      {
        area: 'Math',
        strength: false,
        message: 'Focus on algebraic problem-solving. Practice more linear equations and word problems.'
      }
    ]
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const handleRetakeTest = () => {
    navigate('/dashboard/question-banks');
  };

  const handleDownloadReport = () => {
    // Implementation for downloading PDF report
    showToast('Download feature coming soon!', 'info');
  };

  const filteredQuestions = testResult?.questionReview?.filter(q => 
    selectedSection === 'all' || q.subject === selectedSection
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your test results...</p>
        </div>
      </div>
    );
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h2>
          <p className="text-gray-600 mb-4">We couldn't find your test results.</p>
          <button
            onClick={() => navigate('/dashboard/question-banks')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Practice Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">SAT Test Results</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <FiDownload className="h-4 w-4" />
                <span>Download Report</span>
              </button>
              <button
                onClick={handleRetakeTest}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FiRefreshCw className="h-4 w-4" />
                <span>Retake Test</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overall Score Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Your SAT Score: {testResult.totalScore}/{testResult.maxScore}
            </h2>
            <p className="text-lg text-gray-600">
              {testResult.percentile}th Percentile
            </p>
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <FiClock className="h-4 w-4" />
                <span>Total Time: {formatTime(testResult.timeSpent)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FiTarget className="h-4 w-4" />
                <span>Completed: {new Date(testResult.completedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(testResult.sections).map(([subject, data]) => (
              <div key={subject} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{subject}</h3>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    data.difficulty === 'Base' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {data.difficulty}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {data.score}/{data.maxScore}
                    </span>
                    <span className={`text-sm font-medium ${
                      getScoreColor(data.score, data.maxScore)
                    }`}>
                      {Math.round((data.score / data.maxScore) * 100)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (data.score / data.maxScore) >= 0.8 ? 'bg-green-500' :
                        (data.score / data.maxScore) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(data.score / data.maxScore) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Correct: {data.correctAnswers}/{data.totalQuestions}</span>
                    <span>Time: {formatTime(data.timeSpent)}</span>
                  </div>
                </div>

                {/* Adaptive Results */}
                {testResult.adaptiveResults?.[subject] && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">Adaptive Module:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                        testResult.adaptiveResults[subject].level === 'Hard'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {testResult.adaptiveResults[subject].level === 'Hard' ? (
                          <FiTrendingUp className="h-3 w-3" />
                        ) : (
                          <FiTrendingDown className="h-3 w-3" />
                        )}
                        <span>{testResult.adaptiveResults[subject].level}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Score: {testResult.adaptiveResults[subject].score} | 
                      Correct: {testResult.adaptiveResults[subject].correctAnswers}/27 | 
                      Time: {formatTime(testResult.adaptiveResults[subject].timeSpent)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SAT Performance Analytics */}
        {testResult.overallAnalysis && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">SAT Performance Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Score Prediction */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiTarget className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Score Potential</h4>
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-1">
                  {testResult.overallAnalysis.targetScore}
                </div>
                <p className="text-sm text-blue-600">
                  +{testResult.overallAnalysis.improvementPotential} points possible
                </p>
              </div>

              {/* Study Recommendation */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiBookOpen className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-900">Study Plan</h4>
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {testResult.overallAnalysis.recommendedStudyHours}h
                </div>
                <p className="text-sm text-green-600">
                  Recommended study time
                </p>
              </div>

              {/* Time Management */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiClock className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">Time Management</h4>
                </div>
                <div className="text-2xl font-bold text-purple-700 mb-1">
                  {testResult.overallAnalysis.timeManagement}
                </div>
                <p className="text-sm text-purple-600">
                  Pacing assessment
                </p>
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <FiTrendingUp className="h-4 w-4 text-green-600" />
                  <span>Strongest Areas</span>
                </h4>
                <div className="space-y-2">
                  {Object.entries(testResult.sections).map(([subject, data]) => (
                    data.strengths?.map((strength, index) => (
                      <div key={`${subject}-${index}`} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm text-green-800">{strength}</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">{subject}</span>
                      </div>
                    ))
                  )).flat()}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <FiTrendingDown className="h-4 w-4 text-red-600" />
                  <span>Areas for Improvement</span>
                </h4>
                <div className="space-y-2">
                  {Object.entries(testResult.sections).map(([subject, data]) => (
                    data.weaknesses?.map((weakness, index) => (
                      <div key={`${subject}-${index}`} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm text-red-800">{weakness}</span>
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">{subject}</span>
                      </div>
                    ))
                  )).flat()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adaptive Module Analysis */}
        {testResult.adaptiveResults && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adaptive Module Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(testResult.adaptiveResults).map(([subject, data]) => (
                <div key={subject} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{subject} Adaptive</h4>
                    <span className={`px-2 py-1 rounded text-sm font-medium flex items-center space-x-1 ${
                      data.level === 'Hard' ? 'bg-red-100 text-red-800' : 
                      data.level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {data.level === 'Hard' ? <FiTrendingUp className="h-3 w-3" /> : 
                       data.level === 'Medium' ? <FiTarget className="h-3 w-3" /> :
                       <FiTrendingDown className="h-3 w-3" />}
                      <span>{data.level} Level</span>
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">{data.score}</span>
                      <span className={`text-sm font-medium flex items-center space-x-1 ${
                        data.improvement > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.improvement > 0 ? <FiTrendingUp className="h-3 w-3" /> : <FiTrendingDown className="h-3 w-3" />}
                        <span>{data.improvement > 0 ? '+' : ''}{data.improvement}</span>
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Correct: {data.correctAnswers}/27 ({Math.round((data.correctAnswers/27)*100)}%)
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <p className="text-blue-800 font-medium mb-1">Next Steps:</p>
                      <p className="text-blue-700">{data.nextRecommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {testResult.recommendations && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personalized Recommendations</h3>
            <div className="space-y-4">
              {testResult.recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  rec.strength ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    {rec.strength ? (
                      <FiTrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <FiBookOpen className="h-5 w-5 text-yellow-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${
                        rec.strength ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {rec.area}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        rec.strength ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {rec.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Review Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Answer Review</h3>
            <div className="flex items-center space-x-4">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Sections</option>
                <option value="Reading & Writing">Reading & Writing</option>
                <option value="Math">Math</option>
              </select>
              <button
                onClick={() => setShowAnswerReview(!showAnswerReview)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <FiEye className="h-4 w-4" />
                <span>{showAnswerReview ? 'Hide' : 'Show'} Detailed Review</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filteredQuestions.filter(q => q.isCorrect).length}
              </div>
              <div className="text-sm text-green-700">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {filteredQuestions.filter(q => !q.isCorrect).length}
              </div>
              <div className="text-sm text-red-700">Incorrect</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {filteredQuestions.filter(q => q.isFlagged).length}
              </div>
              <div className="text-sm text-orange-700">Flagged</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(filteredQuestions.reduce((acc, q) => acc + q.timeSpent, 0) / filteredQuestions.length) || 0}s
              </div>
              <div className="text-sm text-blue-700">Avg Time</div>
            </div>
          </div>

          {/* Detailed Answer Review */}
          {showAnswerReview && (
            <div className="space-y-4">
              {filteredQuestions.map((question, index) => (
                <div key={question.id} className={`border rounded-lg p-4 ${
                  question.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">Q{index + 1}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {question.subject}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        {question.difficulty}
                      </span>
                      {question.isFlagged && (
                        <FiFlag className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {question.isCorrect ? (
                        <FiCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <FiX className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm text-gray-500">
                        {formatTime(question.timeSpent)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{question.content}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {question.options.map((option, optIndex) => {
                      const optionLetter = String.fromCharCode(65 + optIndex);
                      const isCorrect = optionLetter === question.correctAnswer;
                      const isUserAnswer = optionLetter === question.userAnswer;
                      
                      return (
                        <div key={optIndex} className={`p-2 rounded border ${
                          isCorrect ? 'border-green-500 bg-green-100' :
                          isUserAnswer ? 'border-red-500 bg-red-100' :
                          'border-gray-200 bg-white'
                        }`}>
                          <span className="font-medium">{optionLetter}.</span> {option}
                          {isCorrect && <span className="ml-2 text-green-600">✓</span>}
                          {isUserAnswer && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Your answer:</span> {question.userAnswer || 'Not answered'} | 
                    <span className="font-medium"> Correct answer:</span> {question.correctAnswer}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResults;