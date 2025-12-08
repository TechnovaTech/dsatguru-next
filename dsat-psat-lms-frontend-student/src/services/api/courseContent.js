import axios from "axios";
import { showToast } from "../../utils/toastUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

// Get all course content for a specific course
export const getCourseContent = async (courseId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/coursecontent/${courseId}`, getHeaders());
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch course content", "error");
    throw error;
  }
};

// Live Meetings
export const addLiveMeeting = async (courseId, meetingData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/coursecontent/${courseId}/meetings`, meetingData, getHeaders());
    showToast("Meeting added successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to add meeting", "error");
    throw error;
  }
};

export const updateLiveMeeting = async (meetingId, meetingData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/coursecontent/meetings/${meetingId}`, meetingData, getHeaders());
    showToast("Meeting updated successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update meeting", "error");
    throw error;
  }
};

export const deleteLiveMeeting = async (meetingId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/coursecontent/meetings/${meetingId}`, getHeaders());
    showToast("Meeting deleted successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete meeting", "error");
    throw error;
  }
};

// Study Materials
export const addStudyMaterial = async (courseId, materialData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/coursecontent/${courseId}/materials`, materialData, getHeaders());
    showToast("Material added successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to add material", "error");
    throw error;
  }
};

export const updateStudyMaterial = async (materialId, materialData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/coursecontent/materials/${materialId}`, materialData, getHeaders());
    showToast("Material updated successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update material", "error");
    throw error;
  }
};

export const deleteStudyMaterial = async (materialId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/coursecontent/materials/${materialId}`, getHeaders());
    showToast("Material deleted successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete material", "error");
    throw error;
  }
};

// Syllabus Topics
export const addSyllabusTopic = async (courseId, topicData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/coursecontent/${courseId}/syllabus`, topicData, getHeaders());
    showToast("Topic added successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to add topic", "error");
    throw error;
  }
};

export const updateSyllabusTopic = async (topicId, topicData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/coursecontent/syllabus/${topicId}`, topicData, getHeaders());
    showToast("Topic updated successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update topic", "error");
    throw error;
  }
};

export const deleteSyllabusTopic = async (topicId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/coursecontent/syllabus/${topicId}`, getHeaders());
    showToast("Topic deleted successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete topic", "error");
    throw error;
  }
};

// Assignments
export const addAssignment = async (courseId, assignmentData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/coursecontent/${courseId}/assignments`, assignmentData, getHeaders());
    showToast("Assignment added successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to add assignment", "error");
    throw error;
  }
};

export const updateAssignment = async (assignmentId, assignmentData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/coursecontent/assignments/${assignmentId}`, assignmentData, getHeaders());
    showToast("Assignment updated successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update assignment", "error");
    throw error;
  }
};

export const deleteAssignment = async (assignmentId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/coursecontent/assignments/${assignmentId}`, getHeaders());
    showToast("Assignment deleted successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete assignment", "error");
    throw error;
  }
};