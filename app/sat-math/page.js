'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Math Section',
  highlightTag: 'Math Confidence',
  heroImage: '/feature.jpg',
  seoTitle: 'SAT Math Prep | Practice Questions & Review',
  seoDescription: 'Explore SAT math with practice questions, detailed answers, structured review, and online math training designed to strengthen core concepts.',
  overview: 'Focused prep for the Math section, including algebra, advanced math, problem solving, and data analysis using exam-style questions.',
  keyPoints: [
    'Comprehensive coverage of all math domains',
    'Calculator and no-calculator strategies',
    'Step-by-step solutions for every practice problem',
  ],
}

export default function SATMathPage() {
  return <ProgramPageTemplate program={program} />
}
