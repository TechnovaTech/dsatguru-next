'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

const faqs = [
  {
    question: "What is the guarantee policy?",
    answer: "We guarantee a score improvement of at least 120 points or higher (for Bootcamp) and least 200 points or a final score of 1420 or higher for our DSAT/PSAT LIVE PREP COURSE and ULTIMATE PREP PACKAGE. We know you will achieve this result after completing our program requirements. Please see our terms and conditions for full details on the guaranteed requirements. We believe in our teaching methods and you.",
  },
  {
    question: "How do the adaptive practice tests work?",
    answer: "Our multistage adaptive tests mimic the actual DSAT format. They adjust the difficulty of questions based on your performance, just like the real exam. This provides the most realistic practice experience and accurate score prediction available.",
  },
  {
    question: "Can I switch between different prep plans?",
    answer: "Yes! You can upgrade your plan at any time. We'll credit the amount you've already paid toward your new plan. Contact our customer support team to help you with the transition and ensure you get the most appropriate preparation for your needs.",
  },
  {
    question: "How long do I have access to the course materials?",
    answer: "For the Live Prep and Bootcamp options, you'll have access to all materials for 3 months from your starting date, you will access all your tests and recorded classes. For the ULTIMATE PREP PACKAGE, you get 4 months of access to the complete website Plus the recorded classes. Monthly subscription plans are automatically renewed until canceled.",
  },
  {
    question: "Are the live classes recorded?",
    answer: "Yes, all live classes are recorded and available for review until your access period ends. This allows you to revisit any concepts you'd like to reinforce or make up sessions if you miss a live class.",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="w-full bg-white py-20 px-4 sm:px-6 lg:px-16 font-[Poppins] text-gray-800">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h3 className="text-blue-600 text-3xl font-bold uppercase mb-2">
          Frequently Asked Questions
        </h3>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Clear Answers to Your Queries
        </h2>
      </div>

      <div className="max-w-3xl mx-auto divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            className="py-4 cursor-pointer"
            onClick={() => toggle(index)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-md md:text-lg font-semibold text-gray-800 flex justify-between items-center">
              {faq.question}
              <span className="text-blue-600 text-xl">
                {openIndex === index ? "−" : "+"}
              </span>
            </h4>
            {openIndex === index && (
              <motion.p
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="mt-2 text-sm text-gray-600 leading-relaxed"
              >
                {faq.answer}
              </motion.p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}