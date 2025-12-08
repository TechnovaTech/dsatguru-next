import api from './index';

/**
 * API service for the new Question Bank Management workflow
 * This provides a simplified interface for selecting question banks and managing their questions
 */

// Get all active question banks for selection
export const getQuestionBanksForSelection = async (search = '') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await api.get(`/api/QuestionBankManagement/question-banks?${params.toString()}`);
    
    if (response.data.success) {
      return {
        data: response.data.data,
        message: response.data.message
      };
    }
    
    throw new Error(response.data.message || 'Failed to fetch question banks');
  } catch (error) {
    console.error('Error fetching question banks for selection:', error);
    throw error;
  }
};

// Get questions for a specific question bank
export const getQuestionsByQuestionBank = async (questionBankId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    if (filters.search) params.append('search', filters.search);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.status) params.append('status', filters.status);

    const response = await api.get(
      `/api/QuestionBankManagement/question-banks/${questionBankId}/questions?${params.toString()}`
    );
    
    if (response.data.success) {
      return {
        data: response.data.data,
        pagination: response.data.pagination,
        questionBank: response.data.questionBank,
        message: response.data.message
      };
    }
    
    throw new Error(response.data.message || 'Failed to fetch questions');
  } catch (error) {
    console.error('Error fetching questions by question bank:', error);
    throw error;
  }
};

// Update a question
export const updateQuestion = async (questionId, questionData) => {
  try {
    const response = await api.put(
      `/api/QuestionBankManagement/questions/${questionId}`,
      questionData
    );
    
    if (response.data.success) {
      return {
        message: response.data.message
      };
    }
    
    throw new Error(response.data.message || 'Failed to update question');
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

// Delete a question
export const deleteQuestion = async (questionId) => {
  try {
    const response = await api.delete(`/api/QuestionBankManagement/questions/${questionId}`);
    
    if (response.data.success) {
      return {
        message: response.data.message
      };
    }
    
    throw new Error(response.data.message || 'Failed to delete question');
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

// Get question bank statistics (optional - for dashboard)
export const getQuestionBankStats = async (questionBankId) => {
  try {
    const response = await api.get(`/api/QuestionBankManagement/question-banks/${questionBankId}/stats`);
    
    if (response.data.success) {
      return {
        data: response.data.data,
        message: response.data.message
      };
    }
    
    throw new Error(response.data.message || 'Failed to fetch question bank statistics');
  } catch (error) {
    console.error('Error fetching question bank statistics:', error);
    throw error;
  }
};

export default {
  getQuestionBanksForSelection,
  getQuestionsByQuestionBank,
  updateQuestion,
  deleteQuestion,
  getQuestionBankStats
};