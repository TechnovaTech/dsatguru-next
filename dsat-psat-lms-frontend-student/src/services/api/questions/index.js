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

// Get questions for a specific module/test
export const getQuestionsByModule = async (moduleType, difficulty = null, subject = null, limit = 50) => {
  try {
    const params = new URLSearchParams({
      moduleType,
      limit: limit.toString()
    });
    
    if (difficulty) params.append('difficulty', difficulty);
    if (subject) params.append('subject', subject);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/student/questions/module?${params.toString()}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching questions by module:', error);
    throw error;
  }
};

// Get a specific question by ID (Admin endpoint for editing)
export const getQuestionById = async (questionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/questions/${questionId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    throw error;
  }
};

// Get questions by subject
export const getQuestionsBySubject = async (subject, difficulty = null, limit = 20) => {
  try {
    const params = new URLSearchParams({
      subject,
      limit: limit.toString()
    });
    
    if (difficulty) params.append('difficulty', difficulty);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/student/questions/subject?${params.toString()}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching questions by subject:', error);
    throw error;
  }
};

// Get adaptive questions based on user performance
export const getAdaptiveQuestions = async (userAbility, subject, previousQuestions = []) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/student/questions/adaptive`,
      {
        userAbility,
        subject,
        previousQuestions
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching adaptive questions:', error);
    throw error;
  }
};

// Submit question response
export const submitQuestionResponse = async (questionId, selectedAnswer, timeSpent, sessionId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/questions/response`,
      {
        questionId,
        selectedAnswer,
        timeSpent,
        sessionId
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting question response:', error);
    throw error;
  }
};

// Get question explanation
export const getQuestionExplanation = async (questionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/questions/${questionId}/explanation`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching question explanation:', error);
    throw error;
  }
};

// Get question statistics
export const getQuestionStats = async (questionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/questions/${questionId}/stats`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching question statistics:', error);
    throw error;
  }
};

// Search questions
export const searchQuestions = async (query, filters = {}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/questions/search`,
      {
        query,
        filters
      },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error searching questions:', error);
    throw error;
  }
};

// Get practice questions for a topic
export const getPracticeQuestions = async (topic, difficulty = null, limit = 10) => {
  try {
    const params = new URLSearchParams({
      topic,
      limit: limit.toString()
    });
    
    if (difficulty) params.append('difficulty', difficulty);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/questions/practice?${params.toString()}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching practice questions:', error);
    throw error;
  }
};

// Get question difficulty distribution
export const getQuestionDifficultyDistribution = async (subject = null) => {
  try {
    const params = subject ? `?subject=${subject}` : '';
    const response = await axios.get(
      `${API_BASE_URL}/api/questions/difficulty-distribution${params}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching difficulty distribution:', error);
    throw error;
  }
};

// Export all question functions
export default {
  getQuestionsByModule,
  getQuestionById,
  getQuestionsBySubject,
  getAdaptiveQuestions,
  submitQuestionResponse,
  getQuestionExplanation,
  getQuestionStats,
  searchQuestions,
  getPracticeQuestions,
  getQuestionDifficultyDistribution
};