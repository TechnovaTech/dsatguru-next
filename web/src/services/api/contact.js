import axios from "axios";
import { showToast } from "../../utils/toastUtils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const submitContactForm = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/contact-message`, formData);
    showToast("Message sent successfully!", "success");
    return response.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Failed to send message",
      "error"
    );
    throw error;
  }
};
