'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Individual Tutoring',
  highlightTag: '1:1 Personalized Support',
  heroImage: '/hero-3.png',
  seoTitle: 'SAT Tutoring Online | One-on-One SAT Prep',
  seoDescription: 'Get personalized one-on-one SAT tutoring with expert SAT tutors, customized study plans, and proven strategies designed to maximize your score.',
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
