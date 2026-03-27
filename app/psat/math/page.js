'use client'
import ProgramPageTemplate from '../../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Math Section',
  highlightTag: 'Math Confidence',
  heroImage: '/feature.jpg',
  seoTitle: 'PSAT Math Prep | Practice Questions & Test Review',
  seoDescription: 'Prepare for the PSAT math with focused practice questions, detailed topic reviews, and full-length exercises to strengthen problem-solving skills.',
  overview: 'Focused prep for the Math section, including algebra, advanced math, problem solving, and data analysis using exam-style questions.',
  keyPoints: [
    'Comprehensive coverage of all math domains',
    'Calculator and no-calculator strategies',
    'Step-by-step solutions for every practice problem',
  ],
}

export default function PSATMathPage() {
  return <ProgramPageTemplate program={program} />
}
