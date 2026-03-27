'use client'
import ProgramPageTemplate from '../components/ProgramPageTemplate'

const program = {
  examKey: 'psat',
  examLabel: 'PSAT',
  title: 'PSAT Study-Guide',
  highlightTag: 'Smart Study Plan',
  heroImage: '/hero-2.png',
  seoTitle: 'PSAT Study Guide | Complete Prep Resources',
  seoDescription: 'Access comprehensive PSAT study guide with structured prep plans, practice materials, test strategies, and expert tips for exam success.',
  overview: 'A structured study guide that outlines what to study, when to study, and how to track progress for consistent improvement.',
  keyPoints: [
    'Week-by-week breakdown of topics and practice',
    'Designed to integrate with our live courses and tests',
    'Clear milestones and progress tracking',
  ],
}

export default function PSATStudyGuidePage() {
  return <ProgramPageTemplate program={program} />
}
