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

export const getDashboardStats = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, getHeaders());
    return response.data.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch dashboard stats", "error");
    throw error;
  }
};

export const getUsers = async (role = null) => {
  try {
    const params = role ? { role } : {};
    const response = await axios.get(`${API_BASE_URL}/api/admin/users`, { ...getHeaders(), params });
    return response.data.data;
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to fetch users", "error");
    throw error;
  }
};

export const toggleUserStatus = async (id) => {
  try {
    await axios.put(`${API_BASE_URL}/api/admin/users/${id}/toggle`, {}, getHeaders());
    showToast("User status updated successfully", "success");
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to update user status", "error");
    throw error;
  }
};