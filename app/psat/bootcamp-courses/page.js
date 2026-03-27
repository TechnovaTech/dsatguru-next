'use client'
import ProgramPageTemplate from '../../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Live Bootcamp Course',
  highlightTag: 'Intensive Bootcamp',
  heroImage: '/hero-1.png',
  seoTitle: 'PSAT Online Bootcamp | Summer PSAT Prep',
  seoDescription: 'Discover PSAT online bootcamp and summer prep programs with expert-led classes, personalized guidance, and strategies to boost your PSAT performance.',
  overview: 'A fast-paced, high-impact bootcamp designed to rapidly boost your score with focused, live instruction and targeted practice.',
  keyPoints: [
    'Short-term intensive program for quick score improvement',
    'Live classes with structured daily or weekly schedule',
    'Ideal for students preparing close to test dates',
  ],
}

export default function PSATBootcampCoursesPage() {
  return <ProgramPageTemplate program={program} />
}
