import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { login } from "../../services/api/auth";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const initialValues = {
    email: "",
    password: "",
  };

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email").required("Email is required"),
    password: Yup.string().min(6, "Minimum 6 characters").required("Password is required"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const res = await login(values);
      const user = res.data.user;
      setUser(user);

      // Check if user is admin and redirect accordingly
      if (user.role === 'Admin') {
        navigate('/admin-dashboard');
        return;
      }

      const { courseSlug } = location.state || {};

      if (courseSlug) {
        navigate(`/enrollment/${courseId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 relative">
        <div className="mb-4">
          <Link
            to="/"
            className="text-blue-600 flex items-center text-sm hover:underline mb-4"
          >
            <FiArrowLeft className="mr-1" /> Go Back to Home
          </Link>
        </div>
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Login to DSATGURU
        </h2>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
          }) => (
            <Form className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="example@email.com"
                  className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email && touched.email ? "border-red-500" : "border-gray-300"
                  }`}
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.email && touched.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password && touched.password ? "border-red-500" : "border-gray-300"
                    }`}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <span
                    className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>
                {errors.password && touched.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="text-right text-sm">
                <Link to="/forgot-password" className="text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>

              <p className="text-sm text-center text-gray-600">
                Don’t have an account?{' '}
                <span onClick={() => navigate("/signup", { state: location.state })}  className="cursor-pointer text-blue-600 hover:underline font-medium">
                  Create one
                </span>
              </p>
            </Form>
          )}
        </Formik>
      </div>
    </section>
  );
};

export default LoginPage;
