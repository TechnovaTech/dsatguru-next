'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuPlus } from 'react-icons/lu'
import { Reveal } from './site/motion'
import { Container, Eyebrow, cn } from './site/ui'

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
    <section className="border-b border-line">
      <Container className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Reveal>
          <Eyebrow n="09">FAQ</Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Clear answers to <em className="accent">your queries.</em>
          </h2>
          <p className="mt-4 max-w-[380px] text-[16px] leading-relaxed text-muted">
            Still unsure? Call{' '}
            <a href="tel:+13292398577" className="text-brand underline underline-offset-4">
              1-329-239-8577
            </a>{' '}
            or write to us from the contact page.
          </p>
        </Reveal>

        <div className="border-t border-line">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={index} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-start justify-between gap-6 py-5 text-left"
                >
                  <span className="flex gap-4">
                    <span className="mt-1 font-code text-[12px] text-brand">{String(index + 1).padStart(2, '0')}</span>
                    <span className={cn('text-[17.5px] font-medium leading-snug transition-colors', isOpen ? 'text-ink' : 'text-ink-2 group-hover:text-ink')}>
                      {faq.question}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center border transition-all duration-300',
                      isOpen ? 'rotate-45 border-brand bg-brand text-on-brand' : 'border-line text-ink-2',
                    )}
                  >
                    <LuPlus className="size-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pl-9 pr-12 text-[15.5px] leading-relaxed text-muted">{faq.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
