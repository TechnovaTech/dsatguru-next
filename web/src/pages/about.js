import { motion } from "framer-motion";
import { FaUserTie, FaCheck, FaHeart, FaLightbulb, FaShieldAlt } from "react-icons/fa";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function About() {
  return (
    <section className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-6 sm:px-10 lg:px-20 font-[Poppins] text-gray-800">
      <div className="max-w-7xl mx-auto space-y-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} className="text-center">
          <h2 className="text-blue-600 text-xl font-bold uppercase mb-2">About DSATGURU</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold mb-4">Helping You Achieve Academic Excellence</h3>
          <p className="text-base md:text-lg max-w-3xl mx-auto text-gray-700">
            At DSATGURU, we are passionate about helping students unlock their full potential and achieve their academic dreams.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} className="bg-blue-50 p-6 rounded-xl shadow">
            <h4 className="text-xl font-semibold text-blue-700 mb-2">Who We Are</h4>
            <p className="text-sm text-gray-700">DSATGURU was founded by a team of experienced educators and test-prep experts who understand the challenges students face.</p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} className="bg-blue-50 p-6 rounded-xl shadow">
            <h4 className="text-xl font-semibold text-blue-700 mb-4">What We Offer</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" /> Expert Instructors</li>
              <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" /> Adaptive Practice Tests</li>
              <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" /> Personalized Study Plans</li>
              <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" /> 24/7 Support</li>
            </ul>
          </motion.div>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} className="bg-white/30 backdrop-blur-md border border-gray-300 shadow-inner shadow-gray-200 rounded-2xl p-6 md:p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg">
            <FaShieldAlt size={20} />
          </div>
          <h4 className="text-2xl font-bold text-blue-600 mb-4">Our Guarantee*</h4>
          <p className="text-xs text-gray-500 mt-3">*Terms and conditions apply. Please contact us for details.</p>
        </motion.div>
      </div>
    </section>
  )
}
