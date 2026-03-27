'use client'
import ProgramPageTemplate from '../../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Individual Tutoring',
  highlightTag: '1:1 Personalized Support',
  heroImage: '/hero-3.png',
  seoTitle: 'PSAT Tutoring Online | Expert PSAT Tutors & Sessions',
  seoDescription: 'Our PSAT tutoring online offers personalized sessions, expert guidance, and tailored strategies to strengthen skills and boost exam performance.',
  overview: 'Personalized tutoring focused on your unique strengths, weaknesses, and goals, with flexible scheduling and tailored lesson plans.',
  keyPoints: [
    'One-on-one coaching with expert instructors',
    'Fully customized pacing and focus areas',
    'Ideal for students needing personalized attention',
  ],
}

export default function PSATIndividualTutoringPage() {
  return <ProgramPageTemplate program={program} />
}
