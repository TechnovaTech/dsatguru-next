import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiTarget, FiClock, FiCheckCircle, FiArrowRight, FiBarChart } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { getTestResults, getLatestTestResults } from '../../../services/api/testSession';

const TestResults = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  useEffect(() => {
    // Get results from navigation state or fetch from API
    if (location.state?.result) {
      setResults(location.state.result);
      setLoading(false);
    } else {
      fetchLatestResults();
    }
  }, []);

  const fetchLatestResults = async () => {
    try {
      const data = await getLatestTestResults();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
      // Fallback to mock data for development
      setResults(getMockResults());
    } finally {
      setLoading(false);
    }
  };

  const getMockResults = () => ({
    sessionId: 'mock-session-123',
    moduleType: 'base',
    subject: 'Math',
    completedAt: new Date().toISOString(),
    timeSpent: 2100, // 35 minutes
    totalQuestions: 27,
    answeredQuestions: 25,
    correctAnswers: 18,
    rawScore: 18,
    scaledScore: 650,
    percentile: 75,
    satScoreRange: { min: 630, max: 670 },
    nationalAverage: 520,
    irtResults: {
      theta: 0.45,
      standardError: 0.32,
      reliability: 0.89
    },
    adaptiveRouting: {
      nextModule: 'adaptive-medium',
      difficulty: 'Medium',
      reason: 'Performance indicates medium difficulty adaptive module'
    },
    sectionBreakdown: {
      algebra: { correct: 6, total: 8, percentage: 75, satTopic: 'Heart of Algebra' },
      geometry: { correct: 5, total: 7, percentage: 71, satTopic: 'Geometry & Trigonometry' },
      statistics: { correct: 4, total: 6, percentage: 67, satTopic: 'Problem Solving & Data Analysis' },
      advanced: { correct: 3, total: 6, percentage: 50, satTopic: 'Advanced Math' }
    },
    recommendations: [
      'Focus on Advanced Math topics - this is your biggest opportunity for score improvement',
      'Strong performance in Heart of Algebra - maintain this level with regular practice',
      'Consider additional practice in Problem Solving & Data Analysis',
      'Your score suggests you\'re ready for adaptive-level questions'
    ],
    projectedImprovement: {
      withPractice: 720,
      timeframe: '4-6 weeks',
      focusAreas: ['Advanced Math', 'Problem Solving & Data Analysis']
    }
  });

  const getPerformanceLevel = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getSATScoreLevel = (score) => {
    if (score >= 700) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', description: 'Top 10% nationally' };
    if (score >= 600) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100', description: 'Above average' };
    if (score >= 500) return { level: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100', description: 'National average range' };
    return { level: 'Below Average', color: 'text-red-600', bg: 'bg-red-100', description: 'Room for improvement' };
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isSATTest = location.state?.isSAT || results?.subject === 'Math' || results?.subject === 'Reading & Writing';

  const handleViewDetailedAnalysis = () => {
    setShowDetailedAnalysis(!showDetailedAnalysis);
  };

  const handleContinueToAdaptive = () => {
    const adaptiveRoute = results.adaptiveRouting?.nextModule;
    if (adaptiveRoute) {
      navigate('/dashboard/question-banks');
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No test results found.</p>
          <button
            onClick={() => navigate('/dashboard/question-banks')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Practice Questions
          </button>
        </div>
      </div>
    );
  }

  const performance = getPerformanceLevel((results.correctAnswers / results.totalQuestions) * 100);
  const satPerformance = getSATScoreLevel(results.scaledScore);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSATTest ? 'SAT' : 'Test'} Results - {results.subject}
          </h1>
          <p className="text-lg text-gray-600">
            {results.moduleType === 'base' ? 'Base Module' : 'Adaptive Module'} completed on {new Date(results.completedAt).toLocaleDateString()}
          </p>
        </div>

        {/* SAT Score Overview */}
        {isSATTest && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">SAT Score Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main SAT Score */}
              <div className="text-center">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{results.scaledScore}</div>
                  <div className="text-sm text-gray-600 mb-2">SAT {results.subject} Score</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${satPerformance.bg} ${satPerformance.color}`}>
                    {satPerformance.level}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{satPerformance.description}</div>
                </div>
              </div>

              {/* Percentile */}
              <div className="text-center">
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">{results.percentile}%</div>
                  <div className="text-sm text-gray-600 mb-2">Percentile Rank</div>
                  <div className="text-xs text-gray-500">
                    Better than {results.percentile}% of test takers
                  </div>
                </div>
              </div>

              {/* Score Range */}
              <div className="text-center">
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="text-lg font-bold text-purple-600 mb-2">
                    {results.satScoreRange?.min} - {results.satScoreRange?.max}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Score Range</div>
                  <div className="text-xs text-gray-500">
                    68% confidence interval
                  </div>
                </div>
              </div>
            </div>

            {/* National Comparison */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">National Average: {results.nationalAverage}</span>
                <span className={`font-medium ${
                  results.scaledScore > results.nationalAverage ? 'text-green-600' : 'text-red-600'
                }`}>
                  {results.scaledScore > results.nationalAverage ? '+' : ''}
                  {results.scaledScore - results.nationalAverage} points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Overview */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <FiTarget className="text-blue-600 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{results.correctAnswers}/{results.totalQuestions}</div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <FiTrendingUp className="text-green-600 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{Math.round((results.correctAnswers / results.totalQuestions) * 100)}%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-50 rounded-lg p-4">
                <FiClock className="text-yellow-600 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{formatTime(results.timeSpent)}</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className={`rounded-lg p-4 ${performance.bg}`}>
                <FiBarChart className={`mx-auto mb-2 ${performance.color}`} size={24} />
                <div className={`text-2xl font-bold ${performance.color}`}>{performance.level}</div>
                <div className="text-sm text-gray-600">Overall</div>
              </div>
            </div>
          </div>
        </div>

        {/* SAT Topic Breakdown */}
        {isSATTest && results.sectionBreakdown && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">SAT Topic Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(results.sectionBreakdown).map(([key, section]) => {
                const sectionPerformance = getPerformanceLevel(section.percentage);
                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{section.satTopic || key}</h3>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${sectionPerformance.bg} ${sectionPerformance.color}`}>
                        {section.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{section.correct}/{section.total} correct</span>
                      <span className={sectionPerformance.color}>{sectionPerformance.level}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${section.percentage >= 80 ? 'bg-green-500' : section.percentage >= 60 ? 'bg-blue-500' : 'bg-red-500'}`}
                        style={{ width: `${section.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Score Projection */}
        {isSATTest && results.projectedImprovement && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Score Improvement Projection</h2>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600">Projected Score with Focused Practice</div>
                  <div className="text-3xl font-bold text-green-600">{results.projectedImprovement.withPractice}</div>
                  <div className="text-sm text-gray-500">+{results.projectedImprovement.withPractice - results.scaledScore} points improvement</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Estimated Timeframe</div>
                  <div className="text-lg font-semibold text-gray-900">{results.projectedImprovement.timeframe}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600 mb-2">Focus Areas for Maximum Improvement:</div>
                <div className="flex flex-wrap gap-2">
                  {results.projectedImprovement.focusAreas.map((area, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {results.recommendations && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Personalized Recommendations</h2>
            <div className="space-y-4">
              {results.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-gray-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Analysis Section */}
        {showDetailedAnalysis && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Detailed Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* IRT Results */}
              {results.irtResults && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">IRT Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ability Level (θ):</span>
                      <span className="font-medium">{results.irtResults.theta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Standard Error:</span>
                      <span className="font-medium">{results.irtResults.standardError.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reliability:</span>
                      <span className="font-medium">{(results.irtResults.reliability * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Adaptive Routing */}
              {results.adaptiveRouting && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Adaptive Routing</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Module:</span>
                      <span className="font-medium">{results.adaptiveRouting.nextModule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Difficulty:</span>
                      <span className="font-medium">{results.adaptiveRouting.difficulty}</span>
                    </div>
                    <p className="text-gray-600 mt-2">{results.adaptiveRouting.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {results.adaptiveRouting?.nextModule && (
            <button
              onClick={handleContinueToAdaptive}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Continue to {results.adaptiveRouting.difficulty} Level
              <FiArrowRight size={20} />
            </button>
          )}
          
          <button
            onClick={handleViewDetailedAnalysis}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FiBarChart size={20} />
            {showDetailedAnalysis ? 'Hide' : 'View'} Detailed Analysis
          </button>
          
          <button
            onClick={handleReturnToDashboard}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults;