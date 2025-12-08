import api from './index.js';
import { getPracticeOptionsFromQuestionBanks } from './questionBanks.js';

/**
 * Get available practice options and filters for a subject from question banks
 * @param {string} subject - Optional subject filter
 * @param {string|null} questionBankId - Optional question bank id to scope options
 * @returns {Promise} Practice options data
 */
export const getPracticeOptions = async (subject = null, questionBankId = null) => {
  try {
    // Fetch practice options from question banks instead of the old API
    const response = await getPracticeOptionsFromQuestionBanks(questionBankId);
    
    if (response.success) {
      let data = response.data;
      
      // Filter by subject if specified
      if (subject && data.subjects) {
        data = {
          ...data,
          subjects: data.subjects.filter(s => s === subject)
        };
      }
      
      return {
        success: true,
        data
      };
    } else {
      throw new Error(response.message || 'Failed to fetch practice options');
    }
  } catch (error) {
    console.error('Error fetching practice options:', error);
    throw error;
  }
};

/**
 * Start a new practice session
 * @param {Object} sessionData - Practice session configuration
 * @param {string} sessionData.subject - Subject to practice
 * @param {string} sessionData.difficulty - Difficulty level (Easy, Medium, Hard)
 * @param {Array<string>} sessionData.domains - Array of domain/topic filters
 * @param {string} sessionData.status - Question status filter (unused, incorrect, correct, mastered)
 * @param {number} sessionData.questionCount - Number of questions
 * @param {string} sessionData.mode - Practice mode (Mock, Timed)
 * @param {string|null} sessionData.questionBankId - Optional question bank id to restrict questions
 * @returns {Promise} Session data with first question
 */
export const startPracticeSession = async (sessionData) => {
  try {
    // Handle subject filtering logic
    let modifiedSessionData = { ...sessionData };
    
    // If 'Both' is selected, include both Math and Reading & Writing subjects
    if (sessionData.subject === 'Both') {
      modifiedSessionData.subjects = ['Math', 'Reading & Writing'];
      delete modifiedSessionData.subject; // Remove single subject field
    } else {
      // For single subject selection, ensure it's passed correctly
      modifiedSessionData.subjects = [sessionData.subject];
    }

    // Ensure questionBankId (if any) is included for backend scoping
    if (sessionData.questionBankId) {
      modifiedSessionData.questionBankId = sessionData.questionBankId;
    }
    
    const response = await api.post('/api/practice/start', modifiedSessionData);
    return response.data;
  } catch (error) {
    console.error('Error starting practice session:', error);
    // Return mock session data for development when backend is not available
    console.warn('Practice session API not available, using mock session data');
    return {
      success: true,
      sessionId: 'mock-session-' + Date.now(),
      message: 'Mock practice session started for development',
      currentQuestion: {
        id: 'mock-question-1',
        text: 'This is a sample practice question for development.',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        subject: sessionData.subject === 'Both' ? 'Math' : sessionData.subject,
        difficulty: sessionData.difficulty || 'Medium',
        questionNumber: 1,
        totalQuestions: sessionData.questionCount
      }
    };
  }
};

/**
 * Save an answer for a question in the current practice session
 * @param {Object} answerData - Answer data
 * @param {string} answerData.sessionId - Practice session ID
 * @param {string} answerData.questionId - Question ID
 * @param {string} answerData.userAnswer - User's answer
 * @param {number} answerData.timeSpent - Time spent on question in seconds
 * @param {number} answerData.confidenceLevel - User's confidence level (1-5)
 * @param {number} answerData.answerChanges - Number of times answer was changed
 * @returns {Promise} Answer result with feedback
 */
export const saveAnswer = async (answerData) => {
  try {
    const response = await api.post('/api/practice/answer', answerData);
    return response.data;
  } catch (error) {
    console.error('Error saving answer:', error);
    throw error;
  }
};

/**
 * Submit and complete a practice session
 * @param {string} sessionId - Practice session ID
 * @returns {Promise} Session results
 */
export const submitPracticeSession = async (sessionId) => {
  try {
    const response = await api.post('/api/practice/submit', { sessionId });
    return response.data;
  } catch (error) {
    console.error('Error submitting practice session:', error);
    throw error;
  }
};

/**
 * Get user's practice history
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.pageSize - Items per page
 * @param {string} params.subject - Optional subject filter
 * @returns {Promise} Practice history data
 */
export const getPracticeHistory = async (params = {}) => {
  try {
    const response = await api.get('/api/practice/history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching practice history:', error);
    throw error;
  }
};

/**
 * Get user's performance data and analytics
 * @param {string} subject - Optional subject filter
 * @returns {Promise} Performance analytics data
 */
export const getPerformanceData = async (subject = null) => {
  try {
    const params = subject ? { subject } : {};
    const response = await api.get('/api/practice/performance', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching performance data:', error);
    throw error;
  }
};

/**
 * Review a completed practice session
 * @param {string} sessionId - Practice session ID
 * @returns {Promise} Session review data with questions and answers
 */
export const reviewPracticeSession = async (sessionId) => {
  try {
    const response = await api.get(`/api/practice/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching session review:', error);
    throw error;
  }
};

/**
 * Bookmark a question for later review
 * @param {string} sessionId - Practice session ID
 * @param {string} questionId - Question ID
 * @param {boolean} isBookmarked - Bookmark status
 * @returns {Promise} Update result
 */
export const bookmarkQuestion = async (sessionId, questionId, isBookmarked) => {
  try {
    const response = await api.post('/api/practice/bookmark', {
      sessionId,
      questionId,
      isBookmarked
    });
    return response.data;
  } catch (error) {
    console.error('Error bookmarking question:', error);
    throw error;
  }
};

/**
 * Add notes to a question
 * @param {string} sessionId - Practice session ID
 * @param {string} questionId - Question ID
 * @param {string} notes - User notes
 * @returns {Promise} Update result
 */
export const addQuestionNotes = async (sessionId, questionId, notes) => {
  try {
    const response = await api.post('/api/practice/notes', {
      sessionId,
      questionId,
      notes
    });
    return response.data;
  } catch (error) {
    console.error('Error adding question notes:', error);
    throw error;
  }
};

/**
 * Save user practice preferences
 * @param {Object} preferences - User preferences
 * @param {string} preferences.preferredSubject - Preferred subject
 * @param {string} preferences.preferredDifficulty - Preferred difficulty
 * @param {string} preferences.preferredMode - Preferred mode (Mock/Timed)
 * @param {number} preferences.preferredQuestionCount - Preferred question count
 * @param {Array<string>} preferences.preferredDomains - Preferred domains
 * @param {string} preferences.preferredStatus - Preferred status filter
 * @returns {Promise} Save result
 */
export const savePracticePreferences = async (preferences) => {
  try {
    const response = await api.post('/api/practice/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error saving practice preferences:', error);
    throw error;
  }
};

/**
 * Get user practice preferences
 * @returns {Promise} User preferences
 */
export const getPracticePreferences = async () => {
  try {
    const response = await api.get('/api/practice/preferences');
    return response.data;
  } catch (error) {
    console.warn('Practice preferences API not available, using defaults:', error.message);
    // Return default structure with mock data for development
    return {
      success: true,
      data: {
        preferredSubject: 'Math',
        preferredQuestionCount: 10,
        preferredMode: 'Mock',
        preferredDifficulty: null,
        preferredDomains: [],
        preferredStatus: null
      },
      message: 'Using default preferences'
    };
  }
};