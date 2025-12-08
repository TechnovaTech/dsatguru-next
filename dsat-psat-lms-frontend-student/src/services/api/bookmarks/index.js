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

// Get all bookmarks for the current user
export const getBookmarks = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/bookmarks`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    throw error;
  }
};

// Add a question to bookmarks
export const addBookmark = async (questionId, notes = '') => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/bookmarks`,
      { questionId, notes },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
};

// Remove a bookmark
export const removeBookmark = async (bookmarkId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/bookmarks/${bookmarkId}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
};

// Update bookmark notes
export const updateBookmarkNotes = async (bookmarkId, notes) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/bookmarks/${bookmarkId}`,
      { notes },
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error updating bookmark notes:', error);
    throw error;
  }
};

// Get bookmarks by subject
export const getBookmarksBySubject = async (subject) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/bookmarks/subject/${subject}`, getHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching bookmarks by subject:', error);
    throw error;
  }
};

// Check if a question is bookmarked
export const isQuestionBookmarked = async (questionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/bookmarks/check/${questionId}`, getHeaders());
    return response.data.isBookmarked;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
};

// Export all bookmark functions
export default {
  getBookmarks,
  addBookmark,
  removeBookmark,
  updateBookmarkNotes,
  getBookmarksBySubject,
  isQuestionBookmarked
};