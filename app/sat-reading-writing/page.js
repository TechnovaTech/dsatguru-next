'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Reading and Writing Section',
  highlightTag: 'Verbal Mastery',
  heroArt: '/art/prog-rw.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
  overview: 'Specialized training for Reading and Writing that focuses on comprehension, grammar, vocabulary in context, and evidence-based reasoning.',
  keyPoints: [
    'Strategies for complex passages and question types',
    'Targeted grammar and usage review',
    'Timed drills that reflect the digital exam format',
  ],
}

export default function SATReadingWritingPage() {
  return <ProgramPageTemplate program={program} />
}
