import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CheckoutStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (location.pathname.includes("checkout-success")) {
      setStatus("success");
      const params = new URLSearchParams(location.search);
      const sessionId = params.get("session_id");
      const returnTo = params.get("return_to") || "/dashboard/courses";
      if (sessionId) {
        (async () => {
          try {
            await axios.post(`${API_BASE_URL}/api/checkout/confirm-session`, { sessionId }, {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
            });
          } catch { void 0; }
          navigate(returnTo);
        })();
      }
    } else if (location.pathname.includes("checkout-cancel")) {
      setStatus("cancel");
      const params = new URLSearchParams(location.search);
      const sessionId = params.get("session_id");
      if (sessionId) {
        (async () => {
          try {
            await axios.post(`${API_BASE_URL}/api/checkout/cancel-session`, { sessionId }, {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
            });
          } catch { void 0; }
        })();
      }
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const returnTo = params.get("return_to") || "/dashboard/courses";
      navigate(returnTo, { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [location, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-md bg-white rounded-2xl p-8 shadow-xl"
      >
        {status === "success" ? (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                {/* SVG removed */}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-4">
              Thank you for your trust! Your transaction has been completed successfully.
            </p>
            <p className="text-xs text-gray-400">
              You will be redirected to your dashboard shortly.
            </p>
          </>
        ) : status === "cancel" ? (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Payment Cancelled
            </h1>
            <p className="text-gray-600 mb-4">
              It seems you have cancelled the payment. No charges were made.
            </p>
            <p className="text-xs text-gray-400">
              You will be redirected to your dashboard shortly.
            </p>
          </>
        ) : null}
      </motion.div>
    </div>
  );
};

export default CheckoutStatus;
