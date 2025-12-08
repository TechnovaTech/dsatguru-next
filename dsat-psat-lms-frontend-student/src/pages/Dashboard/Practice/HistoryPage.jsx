import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiClock, FiTarget, FiTrendingUp, 
  FiFilter, FiSearch, FiEye, FiDownload, FiRefreshCw
} from 'react-icons/fi';
import { getPracticeHistory } from '../../../services/api/practice';
import { showToast } from '../../../utils/toastUtils';

const HistoryPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const sessionsPerPage = 10;

  useEffect(() => {
    loadPracticeHistory();
  }, [currentPage, subjectFilter, modeFilter, sortBy, searchTerm]);

  const loadPracticeHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: sessionsPerPage,
        subject: subjectFilter !== 'all' ? subjectFilter : undefined,
        mode: modeFilter !== 'all' ? modeFilter : undefined,
        sortBy: sortBy,
        search: searchTerm || undefined
      };
      
      const response = await getPracticeHistory(params);
      if (response.success) {
        setSessions(response.data.sessions);
        setTotalPages(Math.ceil(response.data.total / sessionsPerPage));
      } else {
        showToast(response.message || 'Failed to load practice history', 'error');
      }
    } catch (error) {
      console.error('Error loading practice history:', error);
      showToast('Error loading practice history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getModeColor = (mode) => {
    return mode === 'Mock' ? 'text-blue-600 bg-blue-100' : 'text-purple-600 bg-purple-100';
  };

  const handleViewSession = (sessionId) => {
    navigate(`/dashboard/practice/results/${sessionId}`);
  };

  const handleRetrySession = (session) => {
    // Navigate to create practice page with similar settings
    navigate('/dashboard/practice/create', {
      state: {
        retrySettings: {
          subject: session.subject,
          difficulty: session.difficulty,
          questionCount: session.totalQuestions,
          mode: session.mode
        }
      }
    });
  };

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'Subject', 'Mode', 'Questions', 'Score', 'Time Spent', 'Correct Answers'],
      ...sessions.map(session => [
        formatDate(session.completedAt),
        session.subject,
        session.mode,
        session.totalQuestions,
        `${session.score}%`,
        formatTime(session.totalTimeSpent),
        `${session.correctAnswers}/${session.totalQuestions}`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'practice-history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchTerm || 
      session.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.mode.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice History</h1>
              <p className="text-gray-600">Review your past practice sessions and track progress</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadPracticeHistory}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              <button
                onClick={exportHistory}
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
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Subject Filter */}
            <div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Subjects</option>
                <option value="Math">Math</option>
                <option value="Reading & Writing">Reading & Writing</option>
              </select>
            </div>
            
            {/* Mode Filter */}
            <div>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Modes</option>
                <option value="Mock">Mock Mode</option>
                <option value="Timed">Timed Mode</option>
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="score_asc">Lowest Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCalendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No practice sessions found</h3>
              <p className="text-gray-600 mb-6">Start practicing to see your session history here.</p>
              <button
                onClick={() => navigate('/dashboard/practice/create')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Practicing
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.subject}
                          </h3>
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModeColor(session.mode)}`}>
                            {session.mode}
                          </span>
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(session.score)}`}>
                            {session.score}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FiCalendar className="w-4 h-4" />
                            <span>{formatDate(session.completedAt)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <FiTarget className="w-4 h-4" />
                            <span>{session.correctAnswers}/{session.totalQuestions} correct</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <FiClock className="w-4 h-4" />
                            <span>{formatTime(session.totalTimeSpent)}</span>
                          </div>
                          
                          {session.difficulty && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {session.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewSession(session.id)}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FiEye className="w-4 h-4" />
                          Review
                        </button>
                        
                        <button
                          onClick={() => handleRetrySession(session)}
                          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FiRefreshCw className="w-4 h-4" />
                          Retry
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{session.score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            session.score >= 80 ? 'bg-green-500' :
                            session.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${session.score}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * sessionsPerPage) + 1} to {Math.min(currentPage * sessionsPerPage, sessions.length)} of {sessions.length} sessions
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;