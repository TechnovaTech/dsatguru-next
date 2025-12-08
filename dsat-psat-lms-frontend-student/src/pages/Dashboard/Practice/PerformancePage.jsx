import React, { useState, useEffect } from 'react';
import { 
  FiTrendingUp, FiTarget, FiClock, FiBarChart, 
  FiPieChart, FiActivity, FiCalendar, FiFilter,
  FiDownload, FiRefreshCw, FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import { getPerformanceData } from '../../../services/api/practice';
import { showToast } from '../../../utils/toastUtils';

const PerformancePage = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('score');

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange, selectedSubject]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const params = {
        timeRange: parseInt(timeRange),
        subject: selectedSubject !== 'all' ? selectedSubject : undefined
      };
      
      const response = await getPerformanceData(params);
      if (response.success) {
        setPerformanceData(response.data);
      } else {
        showToast(response.message || 'Failed to load performance data', 'error');
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
      showToast('Error loading performance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <FiArrowUp className="w-4 h-4" />;
    if (change < 0) return <FiArrowDown className="w-4 h-4" />;
    return null;
  };

  const exportPerformanceData = () => {
    if (!performanceData) return;
    
    const csvContent = [
      ['Metric', 'Current', 'Previous', 'Change'],
      ['Average Score', `${performanceData.overview.averageScore}%`, `${performanceData.overview.previousAverageScore}%`, `${performanceData.overview.scoreChange}%`],
      ['Total Sessions', performanceData.overview.totalSessions, performanceData.overview.previousTotalSessions, performanceData.overview.sessionsChange],
      ['Average Time', formatTime(performanceData.overview.averageTime), formatTime(performanceData.overview.previousAverageTime), `${performanceData.overview.timeChange}s`],
      ['Accuracy Rate', `${performanceData.overview.accuracyRate}%`, `${performanceData.overview.previousAccuracyRate}%`, `${performanceData.overview.accuracyChange}%`],
      [],
      ['Domain Performance'],
      ['Domain', 'Score', 'Questions Attempted', 'Accuracy'],
      ...performanceData.domainPerformance.map(domain => [
        domain.name,
        `${domain.averageScore}%`,
        domain.questionsAttempted,
        `${domain.accuracy}%`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${timeRange}days.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiBarChart className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data available</h3>
          <p className="text-gray-600 mb-6">Complete some practice sessions to see your performance analytics.</p>
          <button
            onClick={() => window.location.href = '/dashboard/practice/create'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Practicing
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <p className="text-gray-600">Track your progress and identify areas for improvement</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadPerformanceData}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              <button
                onClick={exportPerformanceData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Subjects</option>
                <option value="Math">Math</option>
                <option value="Reading & Writing">Reading & Writing</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-blue-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(performanceData.overview.scoreChange)}`}>
                {getChangeIcon(performanceData.overview.scoreChange)}
                <span>{Math.abs(performanceData.overview.scoreChange)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {performanceData.overview.averageScore}%
              </p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(performanceData.overview.sessionsChange)}`}>
                {getChangeIcon(performanceData.overview.sessionsChange)}
                <span>{Math.abs(performanceData.overview.sessionsChange)}</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {performanceData.overview.totalSessions}
              </p>
              <p className="text-sm text-gray-600">Total Sessions</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiClock className="w-6 h-6 text-purple-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(-performanceData.overview.timeChange)}`}>
                {getChangeIcon(-performanceData.overview.timeChange)}
                <span>{Math.abs(performanceData.overview.timeChange)}s</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {formatTime(performanceData.overview.averageTime)}
              </p>
              <p className="text-sm text-gray-600">Avg Time/Question</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(performanceData.overview.accuracyChange)}`}>
                {getChangeIcon(performanceData.overview.accuracyChange)}
                <span>{Math.abs(performanceData.overview.accuracyChange)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {performanceData.overview.accuracyRate}%
              </p>
              <p className="text-sm text-gray-600">Accuracy Rate</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Progress Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiBarChart className="w-5 h-5" />
              Progress Over Time
            </h3>
            
            <div className="space-y-4">
              {performanceData.progressData?.map((point, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      {new Date(point.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {point.score}%
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${point.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Subject Performance */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiPieChart className="w-5 h-5" />
              Subject Performance
            </h3>
            
            <div className="space-y-4">
              {performanceData.subjectPerformance?.map((subject, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                    <span className="text-sm text-gray-600">{subject.averageScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        subject.averageScore >= 80 ? 'bg-green-500' :
                        subject.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.averageScore}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{subject.sessionsCompleted} sessions</span>
                    <span>{subject.totalQuestions} questions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Domain Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Domain Performance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performanceData.domainPerformance?.map((domain, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{domain.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    domain.averageScore >= 80 ? 'text-green-600 bg-green-100' :
                    domain.averageScore >= 60 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'
                  }`}>
                    {domain.averageScore}%
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Questions Attempted:</span>
                    <span className="font-medium">{domain.questionsAttempted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-medium">{domain.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time:</span>
                    <span className="font-medium">{formatTime(domain.averageTime)}</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        domain.averageScore >= 80 ? 'bg-green-500' :
                        domain.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${domain.averageScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Difficulty Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {performanceData.difficultyPerformance?.map((difficulty, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`${
                        difficulty.percentage >= 80 ? 'text-green-500' :
                        difficulty.percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${difficulty.percentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{difficulty.percentage}%</span>
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2 capitalize">{difficulty.level}</h4>
                <p className="text-sm text-gray-600">
                  {difficulty.correct}/{difficulty.total} correct
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;