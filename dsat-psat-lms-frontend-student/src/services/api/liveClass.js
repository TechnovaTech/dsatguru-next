import axios from "axios";
import { showToast } from "../../utils/toastUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

export const getLiveClasses = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/liveclass`, getHeaders());
    return response.data.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch live classes", "error");
    throw error;
  }
};

export const createLiveClass = async (classData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/liveclass`, classData, getHeaders());
    showToast("Live class created successfully", "success");
    return response.data.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to create live class", "error");
    throw error;
  }
};

export const updateLiveClass = async (id, classData) => {
  try {
    await axios.put(`${API_BASE_URL}/api/liveclass/${id}`, classData, getHeaders());
    showToast("Live class updated successfully", "success");
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update live class", "error");
    throw error;
  }
};

export const deleteLiveClass = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/liveclass/${id}`, getHeaders());
    showToast("Live class deleted successfully", "success");
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to delete live class", "error");
    throw error;
  }
};

export const joinLiveClass = async (id) => {
  try {
    await axios.post(`${API_BASE_URL}/api/liveclass/${id}/join`, {}, getHeaders());
    showToast("Joined class successfully", "success");
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to join class", "error");
    throw error;
  }
};

export const getAttendance = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/liveclass/${id}/attendance`, getHeaders());
    return response.data.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch attendance", "error");
    throw error;
  }
};