import axios from "axios";
import { showToast } from "../../utils/toastUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token ? `Bearer ${token}` : '',
      "ngrok-skip-browser-warning": "69420",
    },
  };
};

// Enum mappings to match backend expectations
const DIFFICULTY_MAP = {
  'Easy': 1,
  'Medium': 2,
  'Hard': 3
};

const SUBJECT_MAP = {
  'Math': 1,
  'Verbal': 2,
  'Reading': 3,
  'Writing': 4,
  'Science': 5
};

const STATUS_MAP = {
  'Draft': 1,
  'Active': 2,
  'Archived': 3,
  'UnderReview': 4
};

// Get enhanced questions with filters and pagination
export const getEnhancedQuestions = async (filters = {}, page = 1, pageSize = 20) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    
    // Add filters to params with proper enum conversion
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        let paramValue = value;
        
        // Convert string values to enum integers
        if (key === 'difficulty' && DIFFICULTY_MAP[value]) {
          paramValue = DIFFICULTY_MAP[value];
        } else if (key === 'subject' && SUBJECT_MAP[value]) {
          paramValue = SUBJECT_MAP[value];
        } else if (key === 'status' && STATUS_MAP[value]) {
          paramValue = STATUS_MAP[value];
        }
        
        params.append(key, paramValue.toString());
      }
    });
    
    const response = await axios.get(
      `${API_BASE_URL}/api/EnhancedQuestion?${params.toString()}`,
      getHeaders()
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching enhanced questions:', error);
    showToast(error?.response?.data?.message || "Failed to fetch questions", "error");
    throw error;
  }
};

// Helper function to convert question data enums
const convertQuestionDataEnums = (data) => {
  const converted = { ...data };
  
  if (converted.difficulty && DIFFICULTY_MAP[converted.difficulty]) {
    converted.difficulty = DIFFICULTY_MAP[converted.difficulty];
  }
  
  if (converted.subject && SUBJECT_MAP[converted.subject]) {
    converted.subject = SUBJECT_MAP[converted.subject];
  }
  
  if (converted.status && STATUS_MAP[converted.status]) {
    converted.status = STATUS_MAP[converted.status];
  }
  
  return converted;
};

// Create new enhanced question
export const createEnhancedQuestion = async (questionData) => {
  try {
    const convertedData = convertQuestionDataEnums(questionData);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/EnhancedQuestion`,
      convertedData,
      getHeaders()
    );
    
    showToast("Question created successfully", "success");
    return response.data;
  } catch (error) {
    console.error('Error creating enhanced question:', error);
    showToast(error?.response?.data?.message || "Failed to create question", "error");
    throw error;
  }
};

// Update enhanced question
export const updateEnhancedQuestion = async (id, questionData) => {
  try {
    const convertedData = convertQuestionDataEnums(questionData);
    
    const response = await axios.put(
      `${API_BASE_URL}/api/EnhancedQuestion/${id}`,
      convertedData,
      getHeaders()
    );
    
    showToast("Question updated successfully", "success");
    return response.data;
  } catch (error) {
    console.error('Error updating enhanced question:', error);
    showToast(error?.response?.data?.message || "Failed to update question", "error");
    throw error;
  }
};

// Delete enhanced question
export const deleteEnhancedQuestion = async (id) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/EnhancedQuestion/${id}`,
      getHeaders()
    );
    
    showToast("Question deleted successfully", "success");
    return response.data;
  } catch (error) {
    console.error('Error deleting enhanced question:', error);
    showToast(error?.response?.data?.message || "Failed to delete question", "error");
    throw error;
  }
};

// Get enhanced question by ID
export const getEnhancedQuestionById = async (id) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/EnhancedQuestion/${id}`,
      getHeaders()
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching enhanced question:', error);
    showToast(error?.response?.data?.message || "Failed to fetch question", "error");
    throw error;
  }
};

// Bulk import enhanced questions
export const bulkImportEnhancedQuestions = async (questions) => {
  try {
    // Convert enum values for all questions in the array
    const convertedQuestions = questions.map(question => convertQuestionDataEnums(question));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/EnhancedQuestion/bulk-import`,
      convertedQuestions,
      getHeaders()
    );
    
    showToast(`Successfully imported ${response.data.imported} questions`, "success");
    return response.data;
  } catch (error) {
    console.error('Error importing enhanced questions:', error);
    showToast(error?.response?.data?.message || "Failed to import questions", "error");
    throw error;
  }
};

// Export enhanced questions
export const exportEnhancedQuestions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Add filters to params with proper enum conversion
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        let paramValue = value;
        
        // Convert string values to enum integers
        if (key === 'difficulty' && DIFFICULTY_MAP[value]) {
          paramValue = DIFFICULTY_MAP[value];
        } else if (key === 'subject' && SUBJECT_MAP[value]) {
          paramValue = SUBJECT_MAP[value];
        } else if (key === 'status' && STATUS_MAP[value]) {
          paramValue = STATUS_MAP[value];
        }
        
        params.append(key, paramValue.toString());
      }
    });
    
    const response = await axios.get(
      `${API_BASE_URL}/api/EnhancedQuestion/export?${params.toString()}`,
      {
        ...getHeaders(),
        responseType: 'blob'
      }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `enhanced-questions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showToast("Questions exported successfully", "success");
    return response.data;
  } catch (error) {
    console.error('Error exporting enhanced questions:', error);
    showToast(error?.response?.data?.message || "Failed to export questions", "error");
    throw error;
  }
};