import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { forgotPassword } from "../../services/api/auth";

const ForgotPasswordPage = () => {
  const initialValues = {
    email: "",
  };

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email").required("Email is required"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await forgotPassword(values.email);
    } catch (error) {
      console.error("Forgot Password error:", error);
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
          Forgot Password
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
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="example@email.com"
                  className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email && touched.email
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.email && touched.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Submitting..." : "Reset Password"}
              </button>

              <p className="text-sm text-center text-gray-600">
                <Link
                  to="/login"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Go back to Login
                </Link>
              </p>
            </Form>
          )}
        </Formik>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
