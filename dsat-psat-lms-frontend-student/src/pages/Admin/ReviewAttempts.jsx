import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTestAttempts } from '../../services/api/adminFeedback';
import './ReviewAttempts.css';

const ReviewAttempts = () => {
  const [testAttempts, setTestAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    subject: '',
    moduleType: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 1,
    totalCount: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestAttempts();
  }, [pagination.page, filters]);

  const fetchTestAttempts = async () => {
    try {
      setLoading(true);
      
      const requestFilters = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters
      };

      const data = await getTestAttempts(requestFilters);
      setTestAttempts(data.testAttempts);
      setPagination(prev => ({ ...prev, totalPages: data.totalPages, totalCount: data.totalCount }));
    } catch (error) {
      console.error('Error fetching test attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const viewAttemptDetails = (testSessionId) => {
    navigate(`/admin/student-attempts/${testSessionId}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="review-attempts-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading test attempts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-attempts-container">
      <div className="review-attempts-header">
        <h1>Review Test Attempts</h1>
        <p>Review student test attempts and provide feedback</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Subject:</label>
            <select 
              value={filters.subject} 
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="Reading & Writing">Reading & Writing</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Module Type:</label>
            <select 
              value={filters.moduleType} 
              onChange={(e) => handleFilterChange('moduleType', e.target.value)}
            >
              <option value="">All Modules</option>
              <option value="Base">Base</option>
              <option value="Adaptive">Adaptive</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Start Date:</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date:</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
        
        <button 
          className="clear-filters-btn"
          onClick={() => {
            setFilters({
              userId: '',
              subject: '',
              moduleType: '',
              startDate: '',
              endDate: ''
            });
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <p>Showing {testAttempts.length} of {pagination.totalCount} test attempts</p>
      </div>

      {/* Test Attempts Table */}
      <div className="attempts-table-container">
        <table className="attempts-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Subject</th>
              <th>Module</th>
              <th>Start Time</th>
              <th>Duration</th>
              <th>Score</th>
              <th>Completion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testAttempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>
                  <div className="student-info">
                    <div className="student-name">
                      {attempt.user.firstName} {attempt.user.lastName}
                    </div>
                    <div className="student-email">{attempt.user.email}</div>
                  </div>
                </td>
                <td>
                  <span className={`subject-badge ${attempt.subject?.toLowerCase().replace(' & ', '-')}`}>
                    {attempt.subject || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className={`module-badge ${attempt.moduleRoute?.toLowerCase()}`}>
                    {attempt.moduleRoute || 'N/A'}
                  </span>
                </td>
                <td>{formatDate(attempt.startTime)}</td>
                <td>{formatDuration(attempt.timeTaken)}</td>
                <td>
                  {attempt.testResult ? (
                    <div className="score-info">
                      <div className="total-score">{attempt.testResult.totalScore}</div>
                      <div className="section-scores">
                        M: {attempt.testResult.mathScore} | 
                        RW: {attempt.testResult.readingWritingScore}
                      </div>
                    </div>
                  ) : (
                    <span className="no-score">Incomplete</span>
                  )}
                </td>
                <td>
                  <div className="completion-bar">
                    <div 
                      className="completion-fill"
                      style={{ width: `${attempt.testResult?.completionPercentage || 0}%` }}
                    ></div>
                    <span className="completion-text">
                      {attempt.testResult?.completionPercentage || 0}%
                    </span>
                  </div>
                </td>
                <td>
                  <button 
                    className="review-btn"
                    onClick={() => viewAttemptDetails(attempt.id)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>
          
          <div className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          
          <button 
            className="pagination-btn"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {testAttempts.length === 0 && (
        <div className="no-attempts">
          <p>No test attempts found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ReviewAttempts;