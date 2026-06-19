'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus } from 'react-icons/fi'

const faqs = [
  {
    question: 'Do the practice tests match the real SAT or PSAT?',
    answer:
      'Yes! All our practice tests are designed to mirror the real SAT and PSAT in format, timing, and difficulty. This way, you get a realistic experience and know exactly what to expect on exam day.',
  },
  {
    question: 'Can you provide full-length SAT or PSAT practice tests online?',
    answer:
      'Absolutely! You can take full-length, timed practice tests online just like the real exams. It’s a great way to practice pacing, build confidence, and see where you need to improve.',
  },
  {
    question: 'How do I get started with a SAT preparation course?',
    answer:
      'It’s simple! Just create an account, pick the exam you want to prepare for, choose any SAT preparation course, and you can start practicing right away. You’ll get instant access to lessons, practice questions, and study plans tailored to your goals.',
  },
  {
    question: 'Are the sat live classes recorded?',
    answer:
      "Yes, all sat live classes are recorded and available for review until your access period ends. This allows you to revisit any concepts you'd like to reinforce or make up sessions if you miss a live class.",
  },
  {
    question: 'Do you help with AP exam scoring and college credit?',
    answer:
      'Definitely! We guide you through AP scoring, strategies to earn college credit, and tips to maximize your scores. Our goal is to help you make the most of your AP exams and get ahead in college.',
  },
  {
    question: 'Can I switch between different sat preparation course plans?',
    answer:
      "Yes! You can upgrade your sat preparation course plan at any time. We'll credit the amount you've already paid toward your new plan. Contact our customer support team to help you with the transition and ensure you get the most appropriate preparation for your needs.",
  },
  {
    question: 'How long do I have access to the sat course materials?',
    answer:
      "For the Live SAT Prep and SAT Bootcamp options, you'll have access to all SAT course materials for 3 months from your start date, including full-length SAT practice tests and recorded classes. For the Ultimate SAT Prep Package, you receive 4 months of access to the complete SAT prep platform, along with all recorded sessions.",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)
  const toggle = (index) => setOpenIndex(openIndex === index ? null : index)

  return (
    <section className="w-full bg-white px-4 py-24 text-slate-800 sm:px-6 lg:px-16">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          FAQ
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          Clear Answers to <span className="dg-gradient-text">Your Queries</span>
        </h3>
      </div>

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              viewport={{ once: true }}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                isOpen ? 'border-indigo-200 bg-indigo-50/40 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <button
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-base font-semibold text-slate-800">{faq.question}</span>
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    isOpen ? 'rotate-45 bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <FiPlus size={18} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
