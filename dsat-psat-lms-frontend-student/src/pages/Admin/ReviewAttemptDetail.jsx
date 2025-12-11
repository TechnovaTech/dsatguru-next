import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestAttemptResponses, submitFeedback } from '../../services/api/adminFeedback';
import './ReviewAttemptDetail.css';

const ReviewAttemptDetail = () => {
  const { testSessionId } = useParams();
  const navigate = useNavigate();
  const [testSession, setTestSession] = useState(null);
  const [userResponses, setUserResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState({ show: false, responseId: null, currentFeedback: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    fetchTestAttemptDetails();
  }, [testSessionId]);

  const fetchTestAttemptDetails = async () => {
    try {
      setLoading(true);
      
      const data = await getTestAttemptResponses(testSessionId);
      setTestSession(data.testSession);
      setUserResponses(data.userResponses);
    } catch (error) {
      console.error('Error fetching test attempt details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeedback = (responseId, currentFeedback = '') => {
    setFeedbackModal({
      show: true,
      responseId,
      currentFeedback
    });
  };

  const handleSubmitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      
      await submitFeedback({
        userResponseId: feedbackModal.responseId,
        feedback: feedbackModal.currentFeedback
      });

      // Refresh the data to show updated feedback
      await fetchTestAttemptDetails();
      setFeedbackModal({ show: false, responseId: null, currentFeedback: '' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getOptionLabel = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const currentResponse = userResponses[currentQuestionIndex];

  if (loading) {
    return (
      <div className="review-detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading test attempt details...</p>
        </div>
      </div>
    );
  }

  if (!testSession || userResponses.length === 0) {
    return (
      <div className="review-detail-container">
        <div className="error-message">
          <h2>Test attempt not found</h2>
          <button onClick={() => navigate('/admin/student-attempts')} className="back-btn">
          Back to Review Attempts
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-detail-container">
      {/* Header */}
      <div className="review-detail-header">
        <button onClick={() => navigate('/admin/student-attempts')} className="back-btn">
          ← Back to Review Attempts
        </button>
        <h1>Test Attempt Review</h1>
      </div>

      {/* Test Session Info */}
      <div className="test-session-info">
        <div className="session-card">
          <h2>Student Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Student:</label>
              <span>{testSession.user.firstName} {testSession.user.lastName}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{testSession.user.email}</span>
            </div>
            <div className="info-item">
              <label>Start Time:</label>
              <span>{formatDate(testSession.startTime)}</span>
            </div>
            <div className="info-item">
              <label>End Time:</label>
              <span>{testSession.endTime ? formatDate(testSession.endTime) : 'In Progress'}</span>
            </div>
            <div className="info-item">
              <label>Module:</label>
              <span className={`module-badge ${testSession.moduleRoute?.toLowerCase()}`}>
                {testSession.moduleRoute}
              </span>
            </div>
            <div className="info-item">
              <label>Subject:</label>
              <span className={`subject-badge ${testSession.subject?.toLowerCase().replace(' & ', '-')}`}>
                {testSession.subject}
              </span>
            </div>
          </div>
        </div>

        {testSession.testResult && (
          <div className="results-card">
            <h2>Test Results</h2>
            <div className="results-grid">
              <div className="result-item">
                <label>Total Score:</label>
                <span className="total-score">{testSession.testResult.totalScore}</span>
              </div>
              <div className="result-item">
                <label>Math Score:</label>
                <span>{testSession.testResult.mathScore}</span>
              </div>
              <div className="result-item">
                <label>Reading & Writing:</label>
                <span>{testSession.testResult.readingWritingScore}</span>
              </div>
              <div className="result-item">
                <label>Completion:</label>
                <span>{testSession.testResult.completionPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Navigation */}
      <div className="question-navigation">
        <div className="nav-header">
          <h3>Question {currentQuestionIndex + 1} of {userResponses.length}</h3>
          <div className="nav-buttons">
            <button 
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="nav-btn"
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(Math.min(userResponses.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === userResponses.length - 1}
              className="nav-btn"
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="question-grid">
          {userResponses.map((response, index) => (
            <button
              key={response.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`question-nav-btn ${
                index === currentQuestionIndex ? 'active' : ''
              } ${
                response.isCorrect ? 'correct' : 'incorrect'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current Question Review */}
      {currentResponse && (
        <div className="question-review">
          <div className="question-card">
            <div className="question-header">
              <div className="question-meta">
                <span className={`difficulty-badge ${currentResponse.question.difficulty.toLowerCase()}`}>
                  {currentResponse.question.difficulty}
                </span>
                <span className={`subject-badge ${currentResponse.question.subject?.toLowerCase().replace(' & ', '-')}`}>
                  {currentResponse.question.subject}
                </span>
                <span className="time-spent">Time: {formatDuration(currentResponse.timeSpent)}</span>
              </div>
              <div className={`answer-status ${currentResponse.isCorrect ? 'correct' : 'incorrect'}`}>
                {currentResponse.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </div>
            </div>

            <div className="question-content">
              <h4>{currentResponse.question.title}</h4>
              <div className="question-text" dangerouslySetInnerHTML={{ __html: currentResponse.question.content }} />
            </div>

            <div className="options-section">
              <h5>Answer Options:</h5>
              <div className="options-list">
                {JSON.parse(currentResponse.question.options).map((option, index) => (
                  <div 
                    key={index} 
                    className={`option-item ${
                      currentResponse.selectedOption === getOptionLabel(index) ? 'selected' : ''
                    } ${
                      currentResponse.question.correctAnswer === getOptionLabel(index) ? 'correct-answer' : ''
                    }`}
                  >
                    <span className="option-label">{getOptionLabel(index)}.</span>
                    <span className="option-text">{option}</span>
                    {currentResponse.selectedOption === getOptionLabel(index) && (
                      <span className="selected-indicator">Student's Answer</span>
                    )}
                    {currentResponse.question.correctAnswer === getOptionLabel(index) && (
                      <span className="correct-indicator">Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {currentResponse.question.explanation && (
              <div className="explanation-section">
                <h5>Explanation:</h5>
                <div className="explanation-text" dangerouslySetInnerHTML={{ __html: currentResponse.question.explanation }} />
              </div>
            )}

            {/* Admin Feedback Section */}
            <div className="feedback-section">
              <div className="feedback-header">
                <h5>Admin Feedback</h5>
                <button 
                  onClick={() => handleAddFeedback(currentResponse.id, currentResponse.adminFeedback || '')}
                  className="feedback-btn"
                >
                  {currentResponse.adminFeedback ? 'Edit Feedback' : 'Add Feedback'}
                </button>
              </div>
              
              {currentResponse.adminFeedback ? (
                <div className="existing-feedback">
                  <p>{currentResponse.adminFeedback}</p>
                  {currentResponse.reviewer && (
                    <div className="feedback-meta">
                      <span>By: {currentResponse.reviewer.firstName} {currentResponse.reviewer.lastName}</span>
                      <span>On: {formatDate(currentResponse.reviewedAt)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="no-feedback">No feedback provided yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal.show && (
        <div className="modal-overlay">
          <div className="feedback-modal">
            <div className="modal-header">
              <h3>Add/Edit Feedback</h3>
              <button 
                onClick={() => setFeedbackModal({ show: false, responseId: null, currentFeedback: '' })}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <textarea
                value={feedbackModal.currentFeedback}
                onChange={(e) => setFeedbackModal(prev => ({ ...prev, currentFeedback: e.target.value }))}
                placeholder="Enter your feedback for this question response..."
                rows={6}
                className="feedback-textarea"
              />
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setFeedbackModal({ show: false, responseId: null, currentFeedback: '' })}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || !feedbackModal.currentFeedback.trim()}
                className="submit-btn"
              >
                {submittingFeedback ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewAttemptDetail;