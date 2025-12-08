import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  };
};

export const getMyPayments = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/payment/mine`, getHeaders());
  return res.data;
};

export default { getMyPayments };