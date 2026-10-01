'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'dsat',
  examLabel: 'Digital SAT',
  title: 'Digital SAT Live Bootcamp Course',
  highlightTag: 'Intensive Bootcamp',
  heroArt: '/art/prog-bootcamp.png',
  // <title> / meta description for this page live in ./layout.js (server metadata).
  overview: 'A fast-paced, high-impact bootcamp designed to rapidly boost your score with focused, live instruction and targeted practice.',
  keyPoints: [
    'Short-term intensive program for quick score improvement',
    'Live classes with structured daily or weekly schedule',
    'Ideal for students preparing close to test dates',
  ],
}

export default function SATBootcampCoursesPage() {
  return <ProgramPageTemplate program={program} />
}
