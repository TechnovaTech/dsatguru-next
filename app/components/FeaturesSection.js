'use client'
import { motion } from 'framer-motion'
import { FaLaptopCode, FaVideo, FaUserGraduate } from 'react-icons/fa'

const features = [
  {
    icon: <FaLaptopCode size={32} className="text-blue-600" />,
    title: "Realistic Immersive Interface",
    description: "Our interface mirrors the official DSAT exam, offering a realistic environment to build familiarity and confidence for peak test performance.",
  },
  {
    icon: <FaVideo size={32} className="text-purple-600" />,
    title: "Video and Text Questions and Answers",
    description: "We provide official-style questions with detailed explanations in both video and text, helping students understand concepts clearly and confidently.",
  },
  {
    icon: <FaUserGraduate size={32} className="text-green-600" />,
    title: "Self-Study, Live Prep or One-on-One",
    description: "Whether it's self-paced learning, live classes, or 1-on-1 tutoring—DSATGURU supports every learning style with practice tests and personalized help.",
  },
]

export default function FeaturesSection() {
  return (
    <section className="relative w-full bg-white py-20 px-6 sm:px-10 lg:px-16 font-[Poppins] text-gray-800">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-stretch gap-12 lg:gap-20">
        <div className="w-full lg:w-7/12">
          <div className="text-left mb-10 lg:mb-8">
            <h2 className="text-blue-600 text-3xl font-bold uppercase mb-2">
              Why DSATGURU is Superior Prep
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold mb-4">
              Elevate Your SAT Preparation
            </h3>
            <p className="max-w-xl text-base md:text-lg text-gray-700 mb-6">
              DSATGURU's intuitive platform and interactive tools optimize study
              efficiency, ensuring a strategic and comprehensive approach to
              mastering the exam.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true, amount: 0.3 }}
                className="flex flex-col sm:flex-row sm:items-start gap-4 bg-white border border-gray-200 shadow-sm rounded-lg p-5 hover:shadow-md transition text-left"
              >
                <div className="flex-shrink-0 mx-auto sm:mx-0 w-12 h-12 rounded-full flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-1 text-gray-800">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true, amount: 0.3 }}
          className="w-full lg:w-5/12 flex items-center justify-center"
        >
          <div className="w-full h-full flex items-center justify-center">
            <img
              src="/feature.jpg"
              alt="DSAT Feature Graphic"
              className="max-h-full shadow-md shadow-gray-400 rounded-xl object-contain"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}