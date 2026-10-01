'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Individual Tutoring',
  highlightTag: '1:1 Personalized Support',
  heroArt: '/art/prog-tutoring.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
  overview: 'Personalized tutoring focused on your unique strengths, weaknesses, and goals, with flexible scheduling and tailored lesson plans.',
  keyPoints: [
    'One-on-one coaching with expert instructors',
    'Fully customized pacing and focus areas',
    'Ideal for students needing personalized attention',
  ],
}

export default function SATIndividualTutoringPage() {
  return <ProgramPageTemplate program={program} />
}
