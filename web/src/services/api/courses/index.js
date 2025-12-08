import axios from "axios";
import { showToast } from "../../../utils/toastUtils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem("authToken") : ''}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

export const getAllCoursesWithSchedule = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/course/with-schedule`
    );
    return response.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Something went wrong",
      "error"
    );
    throw error;
  }
};

export const createCheckoutSession = async (courseId, scheduleId, returnTo = '/dashboard/courses') => {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const response = await axios.post(
      `${API_BASE_URL}/api/checkout/create-session`,
      { 
        courseId, 
        scheduleId,
        successUrl: base + `/checkout-success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}`,
        cancelUrl: base + `/checkout-cancel?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}` 
      },
      getHeaders()
    );
    return response.data.data;
  } catch (error) {
    if (error?.status == 401) {
      if (typeof window !== 'undefined') localStorage.clear();
      showToast("Session expired. Please login again.", "error");
      if (typeof window !== 'undefined') window.location.href = "/login";
    }
    showToast(error.response?.data?.message || "Failed to create checkout session", "error");
  }
};

export const getAllEnrolledCourses = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/enrollment`,
      getHeaders()
    );
    return response.data.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Something went wrong",
      "error"
    );
    throw error;
  }
};

export const checkEnrollment = async (courseId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/enrollment/check/${courseId}`,
      getHeaders()
    );
    return response.data?.isEnrolled ?? response.data?.data?.isEnrolled ?? false;
  } catch (error) {
    return false;
  }
};

export const getZoomSessionLink = async (values) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/zoom-sessions`, {
      params: {
        ...values,
      },
      ...getHeaders(),
    });
    return response.data;
  } catch (error) {
    showToast(
      error?.response?.data?.message || "Failed to fetch Zoom link",
      "error"
    );
    throw error;
  }
};
