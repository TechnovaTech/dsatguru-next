import axios from "axios";
import { showToast } from "../../../utils/toastUtils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

export const getAllEnrolledQuestionBanks = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/questionbankenrollment/enrolled`,
      getHeaders()
    );
    // Return data.data if it exists, otherwise return data
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error fetching enrolled question banks:", error);
    showToast(
      error?.response?.data?.message || "Failed to load question banks",
      "error"
    );
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
};

export const getAvailableQuestionBanks = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/questionbankenrollment/available`,
      getHeaders()
    );
    // Return data.data if it exists, otherwise return data
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error fetching available question banks:", error);
    showToast(
      error?.response?.data?.message || "Failed to load available question banks",
      "error"
    );
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
};

export const enrollInQuestionBank = async (questionBankId) => {
  try {
    // Backend expects the ID in the route parameter, no body required
    const response = await axios.post(
      `${API_BASE_URL}/api/questionbankenrollment/${questionBankId}`,
      null,
      getHeaders()
    );
    showToast(response?.data?.message || "Successfully enrolled in question bank!", "success");
    // Some endpoints return only a message; return success flag for consistency
    return response?.data || { success: true };
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Failed to enroll in question bank",
      "error"
    );
    throw error;
  }
};

export const unenrollFromQuestionBank = async (questionBankId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/questionbankenrollment/${questionBankId}`,
      getHeaders()
    );
    showToast(response?.data?.message || "Successfully unenrolled from question bank!", "success");
    return response?.data || { success: true };
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Failed to unenroll from question bank",
      "error"
    );
    throw error;
  }
};