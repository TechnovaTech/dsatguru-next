'use client'
import { LuChartColumn, LuClipboardCheck, LuLightbulb, LuRoute } from 'react-icons/lu'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow } from './site/ui'

const personalizedCards = [
  {
    icon: LuClipboardCheck,
    step: '01',
    title: 'Diagnostic Assessment',
    description:
      'Begin with our adaptive diagnostic test that precisely identifies your starting level. This 90-minute assessment analyzes your current abilities across all test sections and generates a detailed skill breakdown.',
    points: ['Identifies your exact starting point', 'Highlights strengths and weaknesses', 'Establishes your baseline score', 'Takes just 90 minutes to complete'],
  },
  {
    icon: LuRoute,
    step: '02',
    title: 'Personalized Study Plan',
    description:
      'Based on your diagnostic results, we create a customized study plan that focuses on your specific needs. Your plan includes recommended daily activities with time estimates to keep you on track.',
    points: ['Tailored to your learning style', 'Prioritizes your weakest areas first', 'Adjusts as you improve', 'Includes estimated completion times'],
  },
  {
    icon: LuLightbulb,
    step: '03',
    title: 'Adaptive Learning',
    description:
      'Our system continuously adapts to your progress. As you master concepts, the difficulty increases. If you struggle with certain topics, the system provides additional support and simplified explanations.',
    points: ['Questions match your current ability', 'Gradually increases in difficulty', 'Provides extra help when needed', 'Ensures optimal challenge level'],
  },
  {
    icon: LuChartColumn,
    step: '04',
    title: 'Performance Analytics',
    description:
      'Track your improvement with detailed performance analytics. See your progress over time, identify remaining weak areas, and receive projected scores based on your current performance.',
    points: ['Visual progress tracking', 'Time management insights', 'Score prediction updates', 'Topic mastery indicators'],
  },
]

export default function PersonalizedLearningSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-line">
      <Container className="py-16 sm:py-24">
        <Reveal className="max-w-[760px]">
          <Eyebrow n="05">How it works</Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Your Digital SAT journey, <em className="accent">your way.</em>
          </h2>
          <p className="mt-4 max-w-[600px] text-[17px] leading-relaxed text-muted">
            Experience a truly personalized SAT exam preparation program that evolves with you to maximize your score
            improvement.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
          {personalizedCards.map((item) => (
            <StaggerItem key={item.step} data-spotlight className="relative flex flex-col bg-surface p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center bg-sunken text-brand">
                  <item.icon className="size-5" />
                </span>
                <span className="display text-[3.4rem] leading-none text-line-strong">{item.step}</span>
              </div>
              <h3 className="mt-6 text-[20px] font-semibold">{item.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{item.description}</p>
              <ul className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[14px] text-ink-2">
                    <span className="mt-[7px] size-1.5 shrink-0 bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
