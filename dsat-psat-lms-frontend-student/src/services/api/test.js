import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const testBackendConnection = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test`);
    console.log("Backend connection successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Backend connection failed:", error);
    throw error;
  }
};