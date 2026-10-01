'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Math Section',
  highlightTag: 'Math Confidence',
  heroArt: '/art/prog-math.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
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
