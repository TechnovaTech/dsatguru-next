'use client'
import ProgramPageTemplate from '../../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Live Prep Course',
  highlightTag: 'Comprehensive Prep',
  heroImage: '/hero-2.png',
  seoTitle: 'PSAT Live Online Courses | PSAT Prep',
  seoDescription: 'Improve your PSAT skills with live online courses and prep classes offering real-time lessons, personalized guidance, and strategies to excel on test day.',
  overview: 'A complete preparation program that builds strong fundamentals, test-taking strategies, and confidence through live interactive sessions.',
  keyPoints: [
    'Step-by-step syllabus covering all exam domains',
    'Regular live classes with doubt-clearing support',
    'Perfect for students who want a complete guided prep',
  ],
}

export default function PSATLivePrepCoursePage() {
  return <ProgramPageTemplate program={program} />
}
