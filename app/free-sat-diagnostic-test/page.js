'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Free Digital SAT Diagnostic Test',
  highlightTag: 'Start Smart',
  heroImage: '/hero-2.png',
  seoTitle: 'Free SAT Diagnostic Test Online | Detailed Analysis',
  seoDescription: 'Identify your strengths and weaknesses with a free SAT diagnostic test online, gain performance insights, and plan a personalized SAT prep strategy.',
  overview: 'A realistic diagnostic test that maps your current performance, identifies gaps, and recommends a clear preparation roadmap.',
  keyPoints: [
    'Adaptive-style diagnostic aligned with official exam patterns',
    'Detailed score breakdown across key skill areas',
    'Personalized study plan recommendations based on your performance',
  ],
}

export default function FreeSATDiagnosticTestPage() {
  return <ProgramPageTemplate program={program} />
}
