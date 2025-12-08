import axios from "axios";
import { showToast } from "../../../utils/toastUtils";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";

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
    const response = await axios.post(
      `${API_BASE_URL}/api/checkout/create-session`,
      { 
        courseId: courseId, 
        scheduleId: scheduleId,
        successUrl: window.location.origin + `/checkout-success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}`,
        cancelUrl: window.location.origin + `/checkout-cancel?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}` 
      },
      getHeaders()
    );

    console.log('Checkout session response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    if (error?.status == 401) {
      localStorage.clear();
      showToast("Session expired. Please login again.", "error");
      window.location.href = "/login";
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
  console.log("values: ", values);
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
