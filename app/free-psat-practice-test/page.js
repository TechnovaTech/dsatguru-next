'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'Free PSAT Online Practice Test',
  highlightTag: 'Sharpen Skills',
  heroImage: '/hero-3.png',
  seoTitle: 'Free PSAT Online Practice Test | PSAT Test',
  seoDescription: 'Experience PSAT prep online with free full-length practice tests, interactive questions, and exercises designed to sharpen skills and boost readiness.',
  overview: 'Full-length practice tests that replicate the timing, interface, and difficulty of the real exam to build endurance and accuracy.',
  keyPoints: [
    'Timed assessments with realistic question distribution',
    'Performance analytics across sections and question types',
    'Builds familiarity and reduces test-day anxiety',
  ],
}

export default function FreePSATPracticeTestPage() {
  return <ProgramPageTemplate program={program} />
}
