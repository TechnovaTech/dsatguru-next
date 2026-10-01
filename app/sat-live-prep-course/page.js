'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Live Prep Course',
  highlightTag: 'Comprehensive Prep',
  heroArt: '/art/prog-liveprep.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
  overview: 'A complete preparation program that builds strong fundamentals, test-taking strategies, and confidence through live interactive sessions.',
  keyPoints: [
    'Step-by-step syllabus covering all exam domains',
    'Regular live classes with doubt-clearing support',
    'Perfect for students who want a complete guided prep',
  ],
}

export default function SATLivePrepCoursePage() {
  return <ProgramPageTemplate program={program} />
}
