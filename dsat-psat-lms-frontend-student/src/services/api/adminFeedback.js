import api from './index';

/**
 * API service for admin feedback and student attempts management
 */

// Get test attempts with filtering and pagination
export const getTestAttempts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.moduleType) params.append('moduleType', filters.moduleType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await api.get(`/api/admin/feedback/test-attempts?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    throw error;
  }
};

// Get detailed responses for a specific test attempt
export const getTestAttemptResponses = async (testSessionId) => {
  try {
    const response = await api.get(`/api/admin/feedback/test-attempts/${testSessionId}/responses`);
    return response.data;
  } catch (error) {
    console.error('Error fetching test attempt responses:', error);
    throw error;
  }
};

// Submit feedback for a user response
export const submitFeedback = async (feedbackData) => {
  try {
    const response = await api.post('/api/admin/feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

// Get test attempts for a specific user
export const getUserTestAttempts = async (userId) => {
  try {
    const response = await api.get(`/api/admin/feedback/users/${userId}/attempts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user test attempts:', error);
    throw error;
  }
};