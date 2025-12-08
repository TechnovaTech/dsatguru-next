import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getHeaders = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'ngrok-skip-browser-warning': '69420',
  },
});

// User Statistics
export const getUserStatistics = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/user-statistics`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

// Recent Activity
export const getRecentActivity = async (limit = 10) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/recent-activity?limit=${limit}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

// Performance Analytics
export const getPerformanceAnalytics = async (timeframe = '30d') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/performance?timeframe=${timeframe}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    throw error;
  }
};

// Subject-wise Performance
export const getSubjectPerformance = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/subject-performance`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching subject performance:', error);
    throw error;
  }
};

// Test Session Analytics
export const getTestSessionAnalytics = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/test-session/${sessionId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching test session analytics:', error);
    throw error;
  }
};

// IRT Analysis
export const getIRTAnalysis = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/irt-analysis`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching IRT analysis:', error);
    throw error;
  }
};

// Progress Tracking
export const getProgressTracking = async (moduleId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/progress/${moduleId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching progress tracking:', error);
    throw error;
  }
};

// Study Time Analytics
export const getStudyTimeAnalytics = async (timeframe = '7d') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/study-time?timeframe=${timeframe}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching study time analytics:', error);
    throw error;
  }
};

// Difficulty Analysis
export const getDifficultyAnalysis = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/difficulty-analysis`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching difficulty analysis:', error);
    throw error;
  }
};

// Adaptive Test Performance
export const getAdaptiveTestPerformance = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/adaptive-performance`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching adaptive test performance:', error);
    throw error;
  }
};

// Learning Recommendations
export const getLearningRecommendations = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analytics/recommendations`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching learning recommendations:', error);
    throw error;
  }
};

// Export all analytics functions
export default {
  getUserStatistics,
  getRecentActivity,
  getPerformanceAnalytics,
  getSubjectPerformance,
  getTestSessionAnalytics,
  getIRTAnalysis,
  getProgressTracking,
  getStudyTimeAnalytics,
  getDifficultyAnalysis,
  getAdaptiveTestPerformance,
  getLearningRecommendations
};