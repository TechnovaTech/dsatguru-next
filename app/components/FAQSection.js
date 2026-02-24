'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

const faqs = [
  {
    question: "Do the practice tests match the real SAT or PSAT?",
    answer:
      "Yes! All our practice tests are designed to mirror the real SAT and PSAT in format, timing, and difficulty. This way, you get a realistic experience and know exactly what to expect on exam day.",
  },
  {
    question: "Can you provide full-length SAT or PSAT practice tests online?",
    answer:
      "Absolutely! You can take full-length, timed practice tests online just like the real exams. It’s a great way to practice pacing, build confidence, and see where you need to improve.",
  },
  {
    question: "How do I get started with a SAT preparation course?",
    answer:
      "It’s simple! Just create an account, pick the exam you want to prepare for, choose any SAT preparation course, and you can start practicing right away. You’ll get instant access to lessons, practice questions, and study plans tailored to your goals.",
  },
  {
    question: "Are the sat live classes recorded?",
    answer:
      "Yes, all sat live classes are recorded and available for review until your access period ends. This allows you to revisit any concepts you'd like to reinforce or make up sessions if you miss a live class.",
  },
  {
    question: "Do you help with AP exam scoring and college credit?",
    answer:
      "Definitely! We guide you through AP scoring, strategies to earn college credit, and tips to maximize your scores. Our goal is to help you make the most of your AP exams and get ahead in college.",
  },
  {
    question: "Can I switch between different sat preparation course plans?",
    answer:
      "Yes! You can upgrade your sat preparation course plan at any time. We'll credit the amount you've already paid toward your new plan. Contact our customer support team to help you with the transition and ensure you get the most appropriate preparation for your needs.",
  },
  {
    question: "How long do I have access to the sat course materials?",
    answer:
      "For the Live SAT Prep and SAT Bootcamp options, you'll have access to all SAT course materials for 3 months from your start date, including full-length SAT practice tests and recorded classes. For the Ultimate SAT Prep Package, you receive 4 months of access to the complete SAT prep platform, along with all recorded sessions.",
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
        <h3 className="text-3xl md:text-4xl font-extrabold mb-4">
          Clear Answers to Your Queries
        </h3>
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
