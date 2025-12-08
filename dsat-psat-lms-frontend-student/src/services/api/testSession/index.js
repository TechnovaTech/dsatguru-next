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

// Start a new test session
export const startTestSession = async (requestData) => {
  try {
    // Extract moduleType from the request data
    const moduleType = requestData.moduleRoute || requestData.moduleType || requestData.testType;
    
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/start`,
      { 
        ModuleType: moduleType,
        UserId: requestData.userId || '00000000-0000-0000-0000-000000000000', // Will be overridden by backend auth
        QuestionBankId: requestData.questionBankId || null
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error starting test session:', error);
    throw error;
  }
};

// Save test progress
export const saveTestProgress = async (sessionId, answers, currentQuestionIndex, timeRemaining) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/save-progress`,
      {
        sessionId,
        answers,
        currentQuestionIndex,
        timeRemaining
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error saving test progress:', error);
    throw error;
  }
};

// Submit test session
export const submitTestSession = async (sessionId, answers, moduleType, timeSpent) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/submit`,
      {
        sessionId,
        answers,
        moduleType,
        timeSpent
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting test session:', error);
    throw error;
  }
};

// Get test session details
export const getTestSession = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test-session/${sessionId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching test session:', error);
    throw error;
  }
};

// Resume test session
export const resumeTestSession = async (sessionId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/resume`,
      { sessionId },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error resuming test session:', error);
    throw error;
  }
};

// Get test results
export const getTestResults = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test-results/${sessionId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching test results:', error);
    throw error;
  }
};

// Get latest test results for user
export const getLatestTestResults = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test-results/latest`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching latest test results:', error);
    throw error;
  }
};

// Get user's test history
export const getTestHistory = async (limit = 10) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test-session/history?limit=${limit}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    throw error;
  }
};

// Get adaptive routing recommendation
export const getAdaptiveRouting = async (baseModuleScore, subject) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/adaptive-routing`,
      { baseModuleScore, subject },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error getting adaptive routing:', error);
    throw error;
  }
};

// Calculate IRT results
export const calculateIRTResults = async (sessionId, responses) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/test-session/calculate-irt`,
      { sessionId, responses },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error calculating IRT results:', error);
    throw error;
  }
};

// Export all test session functions
export default {
  startTestSession,
  saveTestProgress,
  submitTestSession,
  getTestSession,
  resumeTestSession,
  getTestResults,
  getLatestTestResults,
  getTestHistory,
  getAdaptiveRouting,
  calculateIRTResults
};