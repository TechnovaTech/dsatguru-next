'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Free Digital SAT Practice Test',
  highlightTag: 'Sharpen Skills',
  heroImage: '/hero-3.png',
  seoTitle: 'Free SAT Practice Test Online | Digital SAT Tests',
  seoDescription: 'Start your free SAT practice test online with realistic exams, full-length tests, targeted practice questions, and detailed answer explanations.',
  overview: 'Full-length practice tests that replicate the timing, interface, and difficulty of the real exam to build endurance and accuracy.',
  keyPoints: [
    'Timed assessments with realistic question distribution',
    'Performance analytics across sections and question types',
    'Builds familiarity and reduces test-day anxiety',
  ],
}

export default function FreeSATPracticeTestPage() {
  return <ProgramPageTemplate program={program} />
}
