'use client'
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBookOpen,
  LuBrain,
  LuChartLine,
  LuGauge,
  LuLibrary,
  LuListChecks,
  LuMonitorPlay,
  LuPresentation,
  LuSlidersHorizontal,
  LuTarget,
  LuUser,
} from 'react-icons/lu'
import ComparisonSection from './ComparisonSection'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow, IconTile } from './site/ui'

const points = [
  'Comprehensive research-backed content specifically tailored for the Digital SAT',
  'Guaranteed score improvement backed by our confidence in our teaching methods',
  'Simple, efficient, affordable program that empowers students with resources to succeed',
  'Multiple learning options including live online courses, practice tests, and individual tutoring',
]

const highlightCards = [
  {
    icon: LuGauge,
    title: 'Score Guarantee',
    description: "We guarantee a 200+ point boost if you're below 1220 or a score above 1420+ for first-time test takers*.",
  },
  { icon: LuMonitorPlay, title: 'Realistic Adaptive Tests', description: 'Our questions mimic the DSAT/PSAT format, giving you test-day confidence.' },
  { icon: LuBadgeCheck, title: 'Focused Topic Coverage', description: "We tailor our prep to exactly what's needed on the Digital SAT—nothing more, nothing less." },
  { icon: LuPresentation, title: 'Experienced Teachers', description: 'Learn from instructors who know the Digital SAT inside out.' },
]

const featuresTop = [
  { icon: LuLibrary, title: '4000+', subtitle: 'Practice Questions' },
  { icon: LuListChecks, title: '25+', subtitle: 'Adaptive Tests' },
  { icon: LuPresentation, title: 'Live Prep', subtitle: 'Bootcamp & Intense' },
  { icon: LuUser, title: 'One-on-One', subtitle: 'Tutoring' },
  { icon: LuTarget, title: 'Guaranteed', subtitle: 'Score Boost' },
]

const featuresBottom = [
  {
    icon: LuBookOpen,
    title: 'Comprehensive SAT Material',
    description: 'Detailed lessons and practice content that reflect the actual DSAT structure for optimal preparation.',
  },
  {
    icon: LuSlidersHorizontal,
    title: 'Custom Quiz Builder',
    description: 'Build your own quizzes based on topics and difficulty to strengthen understanding and retention.',
  },
  {
    icon: LuChartLine,
    title: 'Track Progress Effectively',
    description: 'Visual dashboards and performance trends help guide your next study steps and goals.',
  },
  {
    icon: LuBrain,
    title: 'AI-Powered Recommendations',
    description: 'Smart suggestions based on performance patterns help you close gaps and maximize your test readiness.',
  },
]

export default function WhyChooseUs({ landingPlanRef }) {
  const toPlans = () => landingPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="border-b border-line">
      <Container className="py-16 sm:py-24">
        {/* Why choose DSATGURU: highlight cards + checklist */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Stagger className="order-2 grid gap-px border border-line bg-line sm:grid-cols-2 lg:order-1">
            {highlightCards.map((card) => (
              <StaggerItem key={card.title} data-spotlight className="flex flex-col bg-surface p-6">
                <IconTile icon={card.icon} />
                <h3 className="mt-5 text-[18px] font-semibold">{card.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{card.description}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="order-1 lg:order-2">
            <Eyebrow n="07">Why choose us</Eyebrow>
            <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
              Why choose <em className="accent">DSATGURU?</em>
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
              SAT prep typically covers limited topics in Math and English. DSATGURU has researched the Digital SAT
              extensively and created a comprehensive preparation system that helps you perform better than your best.
            </p>
            <ul className="mt-6 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex gap-3 text-[15.5px] leading-snug text-ink-2">
                  <span className="mt-[7px] size-1.5 shrink-0 bg-brand" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={toPlans}
              className="group mt-8 inline-flex h-[52px] items-center gap-2 bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover active:translate-y-px"
            >
              Start Your DSAT Prep Journey <LuArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>

        <ComparisonSection />

        {/* The toolkit */}
        <Reveal className="mx-auto mt-20 max-w-[760px] text-center sm:mt-28">
          <Eyebrow center>The toolkit</Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Features that <em className="accent">make the difference.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-relaxed text-muted">
            Our comprehensive toolkit is designed to optimize your study time and maximize your results through structured
            SAT prep strategies and data-driven performance insights.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {featuresTop.map((f) => (
            <StaggerItem key={f.subtitle} className="border-b border-r border-line p-5 text-center">
              <f.icon className="mx-auto size-5 text-brand" />
              <p className="display mt-3 text-[1.9rem] leading-none">{f.title}</p>
              <p className="mt-2 font-code text-[11px] uppercase tracking-[0.1em] text-muted">{f.subtitle}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <Stagger className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuresBottom.map((item) => (
            <StaggerItem key={item.title} data-spotlight className="flex flex-col border border-line bg-surface p-6">
              <IconTile icon={item.icon} tone="solid" />
              <h3 className="mt-5 text-[17.5px] font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{item.description}</p>
            </StaggerItem>
          ))}
        </Stagger>

        {/* CTA banner */}
        <Reveal className="relative mt-16 overflow-hidden border border-line bg-panel p-8 text-panel-ink sm:p-12">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h2 className="display text-[2.2rem] leading-tight sm:text-[2.8rem]">
                Experience our <em className="accent">power learning tool.</em>
              </h2>
              <p className="mt-3 max-w-[560px] text-[16.5px] text-panel-ink-2">
                If you&apos;re looking for the best online SAT prep resources without overspending, DSATGuru stands out from
                the rest.
              </p>
            </div>
            <button
              type="button"
              onClick={toPlans}
              className="group inline-flex h-[52px] shrink-0 items-center gap-2 self-start bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover lg:self-auto"
            >
              Let&apos;s Start <LuArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          <p className="relative mt-8 border-t border-panel-line pt-4 text-[13px] text-panel-muted">
            *Score improvement guarantee applies to students who complete the recommended program requirements.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
