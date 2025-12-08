import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { showToast } from "../../utils/toastUtils";
import { resetPassword } from "../../services/api/auth";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token || token.length < 10) {
      showToast("Invalid or missing token", "error");
      navigate("/login");
    }
  }, [token, navigate]);

  const initialValues = {
    password: "",
    confirmPassword: "",
  };

  const validationSchema = Yup.object({
    password: Yup.string().min(6).required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm your password"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await resetPassword(token, values.password);
      navigate("/login");
    } catch (error) {
      console.error("Reset Password error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Reset Your Password</h2>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter new password"
                    className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password && touched.password ? "border-red-500" : "border-gray-300"
                    }`}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <span
                    className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>
                {errors.password && touched.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.confirmPassword && touched.confirmPassword
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <span
                    className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>
                {errors.confirmPassword && touched.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            </Form>
          )}
        </Formik>

        <p className="text-sm text-center text-gray-600 mt-6">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Go Back to Login
          </Link>
        </p>
      </div>
    </section>
  );
};

export default ResetPassword;
