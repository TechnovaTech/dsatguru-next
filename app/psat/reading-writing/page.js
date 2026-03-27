'use client'
import ProgramPageTemplate from '../../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Reading and Writing Section',
  highlightTag: 'Verbal Mastery',
  heroImage: '/feature.jpg',
  seoTitle: 'PSAT Reading & Writing Prep| Sample Questions & Tests',
  seoDescription: 'Explore PSAT reading and writing with targeted practice tests, sample questions, and exercises to build confidence and improve performance.',
  overview: 'Specialized training for Reading and Writing that focuses on comprehension, grammar, vocabulary in context, and evidence-based reasoning.',
  keyPoints: [
    'Strategies for complex passages and question types',
    'Targeted grammar and usage review',
    'Timed drills that reflect the digital exam format',
  ],
}

export default function PSATReadingWritingPage() {
  return <ProgramPageTemplate program={program} />
}
