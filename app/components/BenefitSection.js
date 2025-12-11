'use client'
import { motion } from 'framer-motion'
import { FaRocket, FaSmile, FaUniversity } from 'react-icons/fa'

const benefits = [
  {
    icon: <FaUniversity size={28} className="text-white" />,
    title: "Key to Maximize College Prospects",
    description: "Our proven methods and expert guidance ensure measurable improvement on your DSAT/PSAT score to boost your college application prospects and scholarships.",
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
  },
  {
    icon: <FaSmile size={28} className="text-white" />,
    title: "Reduce Test-Related Anxiety",
    description: "Our realistic practice tests and comprehensive preparation tools help students feel confident and prepared, reducing test anxiety on the actual exam day.",
    color: "bg-gradient-to-br from-blue-500 to-cyan-500",
  },
  {
    icon: <FaRocket size={28} className="text-white" />,
    title: "Get the Confidence You Need",
    description: "With over 4,000 practice questions and 25+ adaptive tests, our program ensures you'll walk into test day with the confidence to perform at your very best.",
    color: "bg-gradient-to-br from-green-500 to-lime-400",
  },
]

const BenefitCard = ({ icon, title, description, color, delay }) => (
  <div className="mt-12 w-full sm:w-[47%] lg:w-auto flex justify-center">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay }}
      className="relative bg-white rounded-xl shadow-xl px-6 pt-16 pb-10 text-center border border-gray-200 hover:shadow-lg hover:border-blue-400 transition w-full h-full"
    >
      <div className="absolute inset-0 -z-10 rounded-xl bg-white shadow-md" />
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-20">
        <div className={`w-20 h-20 rounded-full ${color} flex items-center justify-center shadow-md border-4 border-white`}>
          {icon}
        </div>
      </div>
      <h4 className="text-lg font-bold text-gray-800 leading-snug min-h-[3rem]">
        {title}
      </h4>
      <p className="text-sm text-gray-600 leading-relaxed min-h-[6rem]">
        {description}
      </p>
    </motion.div>
  </div>
)

export default function BenefitsSection() {
  return (
    <section className="relative py-20 px-6 sm:px-8 lg:px-10 font-[Poppins] bg-gradient-to-tr from-[#e0eafc] via-white to-[#cfdef3]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/5 rounded-3xl blur-3xl -z-10" />
      <div className="relative max-w-7xl mx-auto text-center">
        <h2 className="text-blue-600 text-3xl font-bold uppercase mb-2">
          BENEFITS
        </h2>
        <h3 className="text-3xl md:text-4xl font-extrabold mb-4">
          Affordable Prep with Higher Scores
        </h3>
        <p className="max-w-3xl mx-auto text-base md:text-lg text-gray-700 mb-10">
          We have the most budget friendly options for you to Achieve Your Higher
          Score.
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="w-full sm:w-[47%] lg:w-[30%] flex justify-center"
            >
              <BenefitCard {...benefit} delay={0.2 * idx} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}