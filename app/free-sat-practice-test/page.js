'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Free Digital SAT Practice Test',
  highlightTag: 'Sharpen Skills',
  heroArt: '/art/prog-practice.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
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
