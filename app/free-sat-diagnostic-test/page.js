'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Free Digital SAT Diagnostic Test',
  highlightTag: 'Start Smart',
  heroArt: '/art/prog-diagnostic.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
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
