'use client'
import { motion } from 'framer-motion'
import { FaUserTie, FaCheck, FaHeart, FaLightbulb, FaShieldAlt } from 'react-icons/fa'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
}

export default function About() {
  return (
    <section className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-6 sm:px-10 lg:px-20 font-[Poppins] text-gray-800">
      <div className="max-w-7xl mx-auto space-y-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center"
        >
          <h1 className="text-blue-600 text-xl font-bold uppercase mb-2">
            About DSATGURU
          </h1>
          <h3 className="text-3xl md:text-4xl font-extrabold mb-4">
            Helping You Achieve Academic Excellence
          </h3>
          <p className="text-base md:text-lg max-w-3xl mx-auto text-gray-700">
            At DSATGURU, we are passionate about helping students unlock their
            full potential and achieve their academic dreams. Our mission is
            simple: to provide the most effective, realistic, and affordable
            DSAT/PSAT preparation tools that empower students to excel on test
            day and beyond.
          </p>
        </motion.div>

        {/* Who We Are + What We Offer */}
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="bg-blue-50 p-6 rounded-xl shadow"
          >
            <h4 className="text-xl font-semibold text-blue-700 mb-2">
              Who We Are
            </h4>
            <p className="text-sm text-gray-700">
              DSATGURU was founded by a team of experienced educators and
              test-prep experts who understand the challenges students face
              when preparing for standardized tests. We know that every
              student is unique, with different strengths, weaknesses, and
              learning styles. That's why we've created a comprehensive suite
              of prep options designed to meet the needs of every learner,
              from beginners to advanced test-takers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="bg-blue-50 p-6 rounded-xl shadow"
          >
            <h4 className="text-xl font-semibold text-blue-700 mb-4">
              What We Offer
            </h4>
            <p className="text-sm text-gray-700 mb-4">
              We specialize in delivering realistic, adaptive DSAT/PSAT
              practice tests and live online courses that mirror the actual
              exam. Our materials are crafted to target knowledge gaps, build
              confidence, and boost scores. With DSATGURU, you'll gain access
              to:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1" /> Expert
                Instructors: Top-notch teachers with proven success in
                DSAT/PSAT prep.
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1" /> Adaptive Practice
                Tests: The most realistic multistage adaptive tests available.
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1" /> Personalized Study
                Plans: Tailored to address your unique strengths and
                weaknesses.
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1" /> 24/7 Support:
                Continuous guidance and mentorship every step of the way.
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Guarantee */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="bg-white/30 backdrop-blur-md border border-gray-300 shadow-inner shadow-gray-200 rounded-2xl p-6 md:p-10 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg">
            <FaShieldAlt size={20} />
          </div>
          <h4 className="text-2xl font-bold text-blue-600 mb-4">
            Our Guarantee*
          </h4>
          <p className="text-sm md:text-base text-gray-700 max-w-3xl mx-auto">
            We are so confident in the quality of our content and teaching
            methods that we guarantee* results. Whether you're aiming for a
            200+ point increase* or a score of 1420+*, we stand by our
            promise.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            *Terms and conditions apply. Please contact us for details.
          </p>
        </motion.div>

        {/* Why Choose Us - 3 Cards */}
        <div className="mt-12">
          <motion.h3
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="text-2xl font-bold text-center text-gray-800 mb-10"
          >
            Why Choose DSATGURU?
          </motion.h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                icon: <FaLightbulb className="text-yellow-500 text-2xl" />,
                title: "Proven Methods",
                description:
                  "Our evidence-based techniques, such as strategic answer elimination, precise passage mapping, spaced learning, active recall and Interleaved Practice ensure you're fully prepared for every question.",
              },
              {
                icon: <FaCheck className="text-green-500 text-2xl" />,
                title: "Affordable Options",
                description:
                  "We believe high-quality test prep should be accessible to everyone. Our budget-friendly plans make it easy to get the help you need without breaking the bank.",
              },
              {
                icon: <FaHeart className="text-red-500 text-2xl" />,
                title: "Unwavering Support",
                description:
                  "From personalized study plans to 24/7 mentorship, we're with you at every step of your DSAT/PSAT journey.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={idx}
                className="bg-white border border-gray-200 rounded-lg shadow-md p-6 text-center hover:shadow-lg transition"
              >
                <div className="mb-4 flex justify-center">{item.icon}</div>
                <h4 className="font-semibold text-md mb-2 text-gray-800">
                  {item.title}
                </h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-14">
          <motion.h4
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="text-xl md:text-2xl font-bold text-gray-800 mb-3"
          >
            Get Started Today
          </motion.h4>
          <p className="text-sm text-gray-600 mb-5">
            Join us today and let DSATGURU help you score higher, stress less,
            and succeed more. Your journey to academic excellence starts here!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              window.location.href = '/'
            }}
            className="cursor-pointer bg-blue-600 text-white py-2 px-6 rounded-md text-sm font-semibold shadow hover:bg-blue-700 transition"
          >
            Explore Our Courses
          </motion.button>
        </div>
      </div>
    </section>
  )
}
