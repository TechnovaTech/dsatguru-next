'use client'
import { motion } from 'framer-motion'
import {
  MdAssessment,
  MdTimeline,
  MdLightbulbOutline,
  MdBarChart,
  MdLibraryBooks,
  MdSettings,
  MdDashboardCustomize,
  MdPsychology,
} from 'react-icons/md'

const personalizedCards = [
  {
    icon: <MdAssessment size={28} className="text-blue-600" />,
    title: 'Diagnostic Assessment',
    description:
      'Begin with our adaptive diagnostic test that precisely identifies your starting level. This 90-minute assessment analyzes your current abilities across all test sections and generates a detailed skill breakdown.',
    points: [
      'Identifies your exact starting point',
      'Highlights strengths and weaknesses',
      'Establishes your baseline score',
      'Takes just 90 minutes to complete',
    ],
  },
  {
    icon: <MdTimeline size={28} className="text-indigo-600" />,
    title: 'Personalized Study Plan',
    description:
      'Based on your diagnostic results, we create a customized study plan that focuses on your specific needs. Your plan includes recommended daily activities with time estimates to keep you on track.',
    points: [
      'Tailored to your learning style',
      'Prioritizes your weakest areas first',
      'Adjusts as you improve',
      'Includes estimated completion times',
    ],
  },
  {
    icon: <MdLightbulbOutline size={28} className="text-purple-600" />,
    title: 'Adaptive Learning',
    description:
      'Our system continuously adapts to your progress. As you master concepts, the difficulty increases. If you struggle with certain topics, the system provides additional support and simplified explanations.',
    points: [
      'Questions match your current ability',
      'Gradually increases in difficulty',
      'Provides extra help when needed',
      'Ensures optimal challenge level',
    ],
  },
  {
    icon: <MdBarChart size={28} className="text-green-600" />,
    title: 'Performance Analytics',
    description:
      'Track your improvement with detailed performance analytics. See your progress over time, identify remaining weak areas, and receive projected scores based on your current performance.',
    points: [
      'Visual progress tracking',
      'Time management insights',
      'Score prediction updates',
      'Topic mastery indicators',
    ],
  },
]

const personalizedFeatureCards = [
  {
    icon: <MdLibraryBooks size={28} className="text-blue-500" />,
    title: 'Comprehensive Learning Materials',
    description:
      'Gain access to 4,000+ DSAT/PSAT questions with detailed explanations, updated regularly to reflect real test patterns and difficulty levels.',
  },
  {
    icon: <MdSettings size={28} className="text-purple-500" />,
    title: 'Adaptive Study System',
    description:
      'Automatically focuses your practice on weak areas and increases difficulty as you improve, ensuring a tailored and progressive learning curve.',
  },
  {
    icon: <MdDashboardCustomize size={28} className="text-green-500" />,
    title: 'Interactive Progress Dashboard',
    description:
      'Visualize trends, topic mastery, score projections, and time spent with our smart analytics dashboard to guide next steps.',
  },
  {
    icon: <MdPsychology size={28} className="text-rose-500" />,
    title: 'AI-Powered Recommendations',
    description:
      'Smart suggestions based on performance patterns help you close gaps and maximize your test readiness.',
  },
]

export default function PersonalizedLearningSection({ landingPlanRef }) {
  return (
    <section className="w-full bg-white py-20 px-4 sm:px-6 lg:px-16 font-[Poppins] text-gray-800">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h3 className="text-3xl md:text-4xl font-extrabold mb-4">
          Your Digital SAT Journey, Your Way
        </h3>
        <p className="text-base md:text-lg text-gray-600">
          Experience a truly personalized sat exam preparation program that evolves with you to
          maximize your score improvement
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-2 max-w-6xl mx-auto">
        {personalizedCards.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
            viewport={{ once: true }}
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center">
              {item.icon}
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {item.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

    </section>
  )
}
