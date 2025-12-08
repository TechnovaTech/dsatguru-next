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

export const getCourses = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.minPrice) queryParams.append('minPrice', params.minPrice);
    if (params.maxPrice) queryParams.append('maxPrice', params.maxPrice);
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.type) queryParams.append('type', params.type);

    const response = await axios.get(
      `${API_BASE_URL}/api/CourseManagement?${queryParams.toString()}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch courses", "error");
    throw error;
  }
};

export const getCourse = async (id) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/CourseManagement/${id}`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch course", "error");
    throw error;
  }
};

export const createCourse = async (courseData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/CourseManagement`,
      courseData,
      getHeaders()
    );
    showToast("Course created successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to create course", "error");
    throw error;
  }
};

export const updateCourse = async (id, courseData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/CourseManagement/${id}`,
      courseData,
      getHeaders()
    );
    showToast("Course updated successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update course", "error");
    throw error;
  }
};

export const deleteCourse = async (id) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/CourseManagement/${id}`,
      getHeaders()
    );
    showToast("Course deleted successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete course", "error");
    throw error;
  }
};

export const getCourseAnalytics = async (id) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/CourseManagement/${id}/analytics`,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch analytics", "error");
    throw error;
  }
};

export const addZoomSession = async (courseId, sessionData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/CourseManagement/${courseId}/zoom-session`,
      sessionData,
      getHeaders()
    );
    showToast("Zoom session added successfully", "success");
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to add zoom session", "error");
    throw error;
  }
};