'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Reading and Writing Section',
  highlightTag: 'Verbal Mastery',
  heroImage: '/feature.jpg',
  seoTitle: 'SAT Reading & Writing Prep | Practice Questions',
  seoDescription: 'Prepare for the SAT reading and writing test with practice questions, reading passages, writing prompts, and structured test prep strategies.',
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
