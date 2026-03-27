'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'Free PSAT Mock Test',
  highlightTag: 'Exam Day Simulation',
  heroImage: '/hero-1.png',
  seoTitle: 'Free PSAT Mock Test | Interactive Online Test',
  seoDescription: 'Test your PSAT skills with a free interactive online mock test, featuring realistic questions and exercises to sharpen accuracy and confidence.',
  overview: 'High-fidelity mock tests that simulate the actual testing experience so you know exactly what to expect on test day.',
  keyPoints: [
    'Realistic test-day environment and timing',
    'Score projections to estimate your potential official score',
    'Detailed review to refine last-mile improvements',
  ],
}

export default function FreePSATMockTestPage() {
  return <ProgramPageTemplate program={program} />
}
