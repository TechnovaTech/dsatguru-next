import axios from "axios";
import { showToast } from "../../utils/toastUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => {
  const token = localStorage.getItem("authToken");
  console.log('Auth token exists:', !!token);
  console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
  
  return {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token ? `Bearer ${token}` : '',
      "ngrok-skip-browser-warning": "69420",
    },
  };
};

export const getQuestions = async (subject = null, difficulty = null, testType = null, search = null, status = null) => {
  try {
    const params = {};
    if (subject) params.subject = subject;
    
    // Convert string values to enum values
    if (difficulty) {
      const difficultyEnum = {
        "Easy": 1,
        "Medium": 2,
        "Hard": 3
      };
      params.difficulty = difficultyEnum[difficulty] || null;
    }
    
    if (testType) {
      const testTypeEnum = {
        "Base": 1,
        "Adaptive": 2
      };
      params.testType = testTypeEnum[testType] || null;
    }
    
    if (search) params.search = search;
    
    // Add status filter (active/inactive)
    if (status === 'active') params.isActive = true;
    if (status === 'inactive') params.isActive = false;
    

    
    const response = await axios.get(`${API_BASE_URL}/api/question`, { ...getHeaders(), params });
    
    // Add isActive property if not present
    const questions = response.data.data.map(q => ({
      ...q,
      isActive: q.isActive !== undefined ? q.isActive : true // Default to active if not specified
    }));
    
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error.response?.data || error.message);
    showToast(error?.response?.data?.message || "Failed to fetch questions", "error");
    throw error;
  }
};

// Get questions by question bank ID (Enhanced version)
export const getQuestionsByQuestionBank = async (questionBankId, filters = {}) => {
  try {
    const params = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 20
    };
    
    if (filters.search) params.search = filters.search;
    if (filters.subject) params.subject = filters.subject;
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.testType) params.testType = filters.testType;
    if (filters.isActive !== undefined) params.isActive = filters.isActive;
    
    const response = await axios.get(`${API_BASE_URL}/api/questions/by-bank/${questionBankId}`, { ...getHeaders(), params });
    
    if (response.data.success) {
      return {
        data: response.data.data || [],
        pagination: {
          totalCount: response.data.pagination.totalCount,
          totalPages: response.data.pagination.totalPages,
          currentPage: response.data.pagination.currentPage,
          pageSize: response.data.pagination.pageSize,
          hasNextPage: response.data.pagination.hasNextPage,
          hasPreviousPage: response.data.pagination.hasPreviousPage
        },
        questionBank: response.data.questionBank,
        filters: response.data.filters
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch questions');
    }
  } catch (error) {
    console.error('Error fetching questions by question bank:', error);
    throw error;
  }
};

// Legacy support - keep the old endpoint as fallback
export const getQuestionsByQuestionBankLegacy = async (questionBankId, filters = {}) => {
  try {
    const params = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 20
    };
    
    if (filters.search) params.search = filters.search;
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.status) params.status = filters.status;
    
    const response = await axios.get(`${API_BASE_URL}/api/QuestionBankManagement/question-banks/${questionBankId}/questions`, { ...getHeaders(), params });
    
    if (response.data.success) {
      return {
        data: response.data.data || [],
        pagination: {
          totalCount: response.data.pagination.totalCount,
          totalPages: response.data.pagination.totalPages,
          currentPage: response.data.pagination.currentPage,
          pageSize: response.data.pagination.pageSize
        }
      };
    }
    
    return {
      data: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 20
      }
    };
  } catch (error) {
    console.error('Error fetching questions by question bank (legacy):', error.response?.data || error.message);
    showToast(error?.response?.data?.message || "Failed to fetch questions", "error");
    throw error;
  }
};

export const createQuestion = async (questionData) => {
  try {
    // Create a simplified version of the data
    const simplifiedData = {
      title: questionData.title || 'Untitled Question',
      content: questionData.content || '',
      explanation: questionData.explanation || '',
      subject: questionData.subject || 'Math',
      difficulty: questionData.difficulty || 1, // Easy
      type: questionData.type || 1, // MultipleChoice
      testType: questionData.testType || 1, // Base
      correctAnswer: questionData.correctAnswer || 'A',
      options: Array.isArray(questionData.options) ? questionData.options : [],
      tags: Array.isArray(questionData.tags) ? questionData.tags : [],
      points: questionData.points || 1,
      questionBankId: questionData.questionBankId || null,
      imageUrl: questionData.imageUrl
    };
    
    console.log('API createQuestion data:', JSON.stringify(simplifiedData));
    await axios.post(`${API_BASE_URL}/api/question`, simplifiedData, getHeaders());
    showToast("Question created successfully", "success");
  } catch (error) {
    console.error('API createQuestion error:', error.response?.data);
    console.error('Error details:', error.message);
    showToast(error?.response?.data?.message || "Failed to create question", "error");
    throw error;
  }
};

export const updateQuestion = async (id, questionData) => {
  try {
    // Create a simplified version of the data
    const simplifiedData = {
      title: questionData.title || 'Untitled Question',
      content: questionData.content || '',
      explanation: questionData.explanation || '',
      subject: questionData.subject || 'Math',
      difficulty: 1, // Easy
      type: 1, // MultipleChoice
      testType: 1, // Base
      correctAnswer: questionData.correctAnswer || 'A',
      options: Array.isArray(questionData.options) ? questionData.options : [],
      tags: Array.isArray(questionData.tags) ? questionData.tags : [],
      points: questionData.points || 1,
      imageUrl: questionData.imageUrl
    };
    
    console.log('API updateQuestion data:', JSON.stringify(simplifiedData));
    await axios.put(`${API_BASE_URL}/api/question/${id}`, simplifiedData, getHeaders());
    showToast("Question updated successfully", "success");
  } catch (error) {
    console.error('API updateQuestion error:', error.response?.data);
    console.error('Error details:', error.message);
    showToast(error?.response?.data?.message || "Failed to update question", "error");
    throw error;
  }
};

export const deleteQuestion = async (id) => {
  try {
    console.log('API: Attempting to delete question with ID:', id);
    console.log('API: Using endpoint:', `${API_BASE_URL}/api/question/${id}`);
    
    const response = await axios.delete(`${API_BASE_URL}/api/question/${id}`, getHeaders());
    console.log('API: Delete response:', response.data);
    
    // Don't show toast here since it's handled in the component
    return response.data;
  } catch (error) {
    console.error('API: Delete failed:', error);
    console.error('API: Error response:', error?.response?.data);
    console.error('API: Error status:', error?.response?.status);
    
    // Don't show toast here since it's handled in the component
    throw error;
  }
};

export const getQuestionStatistics = async () => {
  try {
    const params = {};
    
    const response = await axios.get(`${API_BASE_URL}/api/question/statistics`, {
      ...getHeaders(),
      params
    });
    
    console.log('API statistics response:', response.data);
    console.log('API statistics data structure:', JSON.stringify(response.data, null, 2));
    
    // Extract the actual data from the response
    const apiData = response.data.data || {};
    
    // Use mock data if the API returns empty data
    if (!apiData || Object.keys(apiData).length === 0) {
      throw new Error('Empty data received from API');
    }
    
    // Handle the case where bySubject has ReadingWriting instead of "Reading & Writing"
    const bySubject = {
      "Reading & Writing": apiData.bySubject?.ReadingWriting || 0,
      "Math": apiData.bySubject?.Math || 0
    };
    
    // Get active and inactive questions from API or use defaults
    const totalQuestions = apiData.totalQuestions || 0;
    const activeQuestions = apiData.activeQuestions !== undefined ? apiData.activeQuestions : totalQuestions;
    const inactiveQuestions = apiData.inactiveQuestions !== undefined ? apiData.inactiveQuestions : 0;
    
    // Handle byTestType which might be null or undefined
    const byTestType = {
      Base: apiData.byTestType?.Base || 0,
      Adaptive: apiData.byTestType?.Adaptive || 0
    };
    
    // Handle byDifficulty which might be null or undefined
    const byDifficulty = {
      Easy: apiData.byDifficulty?.Easy || 0,
      Medium: apiData.byDifficulty?.Medium || 0,
      Hard: apiData.byDifficulty?.Hard || 0
    };
    
    // Handle distribution which might be null or undefined
    const distribution = apiData.distribution || {
      baseMath: { easy: 0, medium: 0, hard: 0, total: 0 },
      baseRW: { easy: 0, medium: 0, hard: 0, total: 0 },
      adaptiveMath: { easy: 0, medium: 0, hard: 0, total: 0 },
      adaptiveRW: { easy: 0, medium: 0, hard: 0, total: 0 },
      totals: { easy: 0, medium: 0, hard: 0, total: 0 }
    };
    
    // This is a safeguard in case the API returns data in a different structure
    const formattedData = {
      totalQuestions,
      activeQuestions,
      inactiveQuestions,
      byTestType,
      bySubject,
      byDifficulty,
      distribution
    };
    
    console.log('Formatted statistics data:', formattedData);
    return formattedData;
  } catch (error) {
    console.error('Statistics error:', error.response?.data || error.message);
    
    // Return mock data if API fails
    const mockStats = {
      totalQuestions: 1247,
      activeQuestions: 1185,
      inactiveQuestions: 62,
      byTestType: { Base: 845, Adaptive: 402 },
      bySubject: { "Reading & Writing": 723, Math: 524 },
      byDifficulty: { Easy: 412, Medium: 586, Hard: 249 },
      distribution: {
        baseMath: { easy: 124, medium: 156, hard: 50, total: 330 },
        baseRW: { easy: 178, medium: 245, hard: 92, total: 515 },
        adaptiveMath: { easy: 42, medium: 90, hard: 62, total: 194 },
        adaptiveRW: { easy: 68, medium: 95, hard: 45, total: 208 },
        totals: { easy: 412, medium: 586, hard: 249, total: 1247 }
      }
    };
    
    console.log('Using mock data:', mockStats);
    
    console.log('Using mock statistics data due to API error');
    showToast("Using mock data - couldn't connect to statistics API", "warning");
    return mockStats;
  }
};

export const bulkUploadQuestions = async (formData) => {
  try {
    // Get the auth token
    const token = localStorage.getItem("authToken");
    
    // Log the form data for debugging
    console.log('Uploading file:', formData.get('file')?.name);
    

    
    const response = await axios.post(
      `${API_BASE_URL}/api/question/bulk-upload`,
      formData,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data',
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );
    
    console.log('Upload response:', response.data);
    showToast(response.data.message || "Questions uploaded successfully", "success");
    return response.data.data;
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    showToast(error?.response?.data?.message || "Failed to upload questions", "error");
    throw error;
  }
};

// Get base test questions for students
export const getBaseTestQuestions = async (subject = null, limit = 27, questionBankId = null) => {
  try {
    const params = {};
    if (subject) params.subject = subject;
    if (limit) params.limit = limit;
    if (questionBankId) params.questionBankId = questionBankId;
    
    const response = await axios.get(`${API_BASE_URL}/api/questions/base-test`, { ...getHeaders(), params });
    
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Error fetching base test questions:', error.response?.data || error.message);
    showToast(error?.response?.data?.message || "Failed to fetch base test questions", "error");
    throw error;
   }
 };