import axios from "axios";
import { showToast } from "../../../utils/toastUtils";
import { saveUserToStorage } from "./authService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

export const login = async (credentials) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      credentials,
      getHeaders()
    );
    showToast("Login successful", "success");

    const { token, user } = response.data.data;
    saveUserToStorage(user);
    localStorage.setItem("authToken", token);
    return { data: { token, user } };
  } catch (error) {
    showToast(error?.response?.data?.message || "Login failed", "error");
    throw error;
  }
};

export const signup = async (userData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/register`,
      { name: userData.name, email: userData.email, password: userData.password },
      getHeaders()
    );
    showToast("Signup successful", "success");
    const { token, user } = response.data.data;
    localStorage.setItem("authToken", token);
    saveUserToStorage(user);
    return response.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Signup failed", "error");
    throw error;
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/forgot-password`,
      { email },
      getHeaders()
    );
    showToast("Password reset link sent to email", "success");
    return response.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Forgot password failed",
      "error"
    );
    throw error;
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/reset-password`,
      { token, newPassword },
      getHeaders()
    );
    showToast("Password reset successful", "success");
    return response.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Reset password failed",
      "error"
    );
    throw error;
  }
};

export const logout = async () => {
  try {
    await axios.post(`${API_BASE_URL}/api/auth/logout`, {} ,getHeaders());
  } catch (error) {
    // Ignore logout API errors
  }
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  showToast("Logout successful", "success");
  return true;
};

export const getProfile = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user/me`, getHeaders());
    console.log('response: ', response.data);
    return response.data.user;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch profile", "error");
    throw error;
  }
};
