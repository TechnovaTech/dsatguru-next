'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'Free PSAT Skills Assessment',
  highlightTag: 'Start Smart',
  heroImage: '/hero-2.png',
  seoTitle: 'Free PSAT Skills Assessment | Diagnostic Test Online',
  seoDescription: 'Discover your PSAT skill gaps with an online diagnostic test, analyze results in detail, and plan a personalized study approach for higher scores.',
  overview: 'A realistic diagnostic test that maps your current performance, identifies gaps, and recommends a clear preparation roadmap.',
  keyPoints: [
    'Adaptive-style diagnostic aligned with official exam patterns',
    'Detailed score breakdown across key skill areas',
    'Personalized study plan recommendations based on your performance',
  ],
}

export default function FreePSATDiagnosticTestPage() {
  return <ProgramPageTemplate program={program} />
}
