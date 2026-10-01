'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Free Digital SAT Mock Test',
  highlightTag: 'Exam Day Simulation',
  heroArt: '/art/prog-mock.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
  overview: 'High-fidelity mock tests that simulate the actual testing experience so you know exactly what to expect on test day.',
  keyPoints: [
    'Realistic test-day environment and timing',
    'Score projections to estimate your potential official score',
    'Detailed review to refine last-mile improvements',
  ],
}

export default function FreeSATMockTestPage() {
  return <ProgramPageTemplate program={program} />
}
