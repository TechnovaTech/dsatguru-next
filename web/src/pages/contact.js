import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { motion } from "framer-motion";
import { FiPhone, FiMail, FiHeadphones } from "react-icons/fi";
import { submitContactForm } from "../services/api/contact";
import { showToast } from "../utils/toastUtils";

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string().matches(/^\d+$/, "Phone must contain only numbers").min(10, "Phone must be at least 10 digits").required("Phone is required"),
  subject: Yup.string().required("Subject is required"),
  message: Yup.string().min(10, "Message too short").required("Message is required"),
});

export default function Contact() {
  const captchaRef = useRef(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    if (values.honeypot !== "") { setSubmitting(false); return; }
    const token = captchaRef.current.getValue();
    if (!token) { showToast("Please complete the CAPTCHA", "error"); setSubmitting(false); return; }
    try {
      await submitContactForm(values);
      showToast("Your message has been sent successfully!", "success");
      resetForm(); setCaptchaVerified(false); captchaRef.current.reset();
    } catch (error) {
      showToast("Something went wrong. Please try again later.", "error");
    } finally { setSubmitting(false); }
  };

  return (
    <section className="w-full bg-gradient-to-br from-indigo-50 to-blue-100 py-20 px-4 sm:px-6 lg:px-8 font-[Poppins]">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="w-full bg-white rounded-xl shadow-lg p-6 md:p-8 flex items-center gap-6">
          <div className="text-white bg-blue-600 w-14 h-14 flex items-center justify-center rounded-full text-xl"><FiHeadphones /></div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">CONTACT US</h3>
            <p className="text-sm text-gray-600 mt-1">We're Here to Help</p>
            <p className="text-sm text-gray-600 mt-1">Have questions? Reach out by email or call us.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full"><FiPhone size={20} /></div>
            <div><h4 className="font-semibold text-gray-800">Call Us</h4><p className="text-sm text-gray-600">1-919-578-7724</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full"><FiMail size={20} /></div>
            <div><h4 className="font-semibold text-gray-800">Email Us</h4><p className="text-sm text-gray-600">info@dsatguru.com</p></div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-white rounded-xl shadow-lg p-8 md:p-10 w-full max-w-7xl">
          <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Send Us a Message</h2>
          <Formik initialValues={{ name: "", email: "", phone: "", subject: "", message: "", sourcePage: "Contact Us", honeypot: "" }} validationSchema={validationSchema} onSubmit={handleSubmit} validateOnBlur={true} validateOnChange={false}>
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setTouched }) => (
              <Form className="space-y-5">
                <input type="text" name="honeypot" value={values.honeypot} onChange={handleChange} className="hidden" autoComplete="off" />
                {"name email phone subject".split(" ").map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                    <input type={field === "email" ? "email" : "text"} id={field} name={field} className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[field] && touched[field] ? "border-red-500" : "border-gray-300"}`} value={values[field]} onChange={handleChange} onBlur={handleBlur} />
                    {errors[field] && touched[field] && (<p className="text-red-500 text-xs mt-1">{errors[field]}</p>)}
                  </div>
                ))}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea id="message" name="message" rows="4" className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.message && touched.message ? "border-red-500" : "border-gray-300"}`} value={values.message} onChange={handleChange} onBlur={handleBlur}></textarea>
                  {errors.message && touched.message && (<p className="text-red-500 text-xs mt-1">{errors.message}</p>)}
                </div>
                <div>
                  <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY} onChange={() => setCaptchaVerified(true)} ref={captchaRef} />
                </div>
                <button type="submit" disabled={isSubmitting || !captchaVerified} onClick={() => { setTouched({ name: true, email: true, phone: true, subject: true, message: true }); }} className="w-full bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-800 cursor-pointer text-white py-2 rounded-md text-sm font-semibold">{isSubmitting ? "Sending..." : "Send Message"}</button>
              </Form>
            )}
          </Formik>
        </motion.div>
      </div>
    </section>
  )
}
