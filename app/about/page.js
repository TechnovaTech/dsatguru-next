'use client'
import { LuBookOpen, LuClock, LuHeart, LuLightbulb, LuShieldCheck, LuTrophy, LuUsers, LuWallet } from 'react-icons/lu'
import { CountUp, Reveal, Stagger, StaggerItem, WordReveal } from '../components/site/motion'
import { Button, Container, Eyebrow, IconTile } from '../components/site/ui'

const stats = [
  { icon: LuClock, value: '10+', label: 'Years Experience' },
  { icon: LuBookOpen, value: '4,000+', label: 'Practice Questions' },
  { icon: LuTrophy, value: '99%', label: 'Success Rate' },
  { icon: LuUsers, value: '10,000+', label: 'Students Helped' },
]

const offers = [
  ['Expert Instructors', 'Top-notch teachers with proven success in DSAT/PSAT prep.'],
  ['Adaptive Practice Tests', 'The most realistic multistage adaptive tests available.'],
  ['Personalized Study Plans', 'Tailored to address your unique strengths and weaknesses.'],
  ['24/7 Support', 'Continuous guidance and mentorship every step of the way.'],
]

const whyCards = [
  {
    icon: LuLightbulb,
    title: 'Proven Methods',
    description:
      "Evidence-based techniques — strategic answer elimination, precise passage mapping, spaced learning, active recall and interleaved practice — ensure you're fully prepared for every question.",
  },
  {
    icon: LuWallet,
    title: 'Affordable Options',
    description:
      'High-quality test prep should be accessible to everyone. Our budget-friendly plans make it easy to get the help you need without breaking the bank.',
  },
  {
    icon: LuHeart,
    title: 'Unwavering Support',
    description: "From personalized study plans to 24/7 mentorship, we're with you at every step of your DSAT/PSAT journey.",
  },
]

export default function About() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative border-b border-line">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_50%_0%,#000,transparent_70%)]" />
        <Container className="relative py-16 text-center sm:py-24">
          <Eyebrow n="01" center>
            About DSATGURU
          </Eyebrow>
          <WordReveal
            text="Helping you achieve academic excellence"
            accent={2}
            className="mx-auto mt-6 max-w-[900px] text-balance text-[2.6rem] leading-[1.02] sm:text-[3.6rem] lg:text-[4.2rem]"
          />
          <p className="animate-rise mx-auto mt-6 max-w-[680px] text-[17.5px] leading-relaxed text-ink-2">
            At DSATGURU, we&apos;re passionate about helping students unlock their full potential and achieve their academic
            dreams. Our mission is simple: to provide the most effective, realistic, and affordable DSAT/PSAT preparation
            tools that empower students to excel on test day and beyond.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '.1s' }}>
            <Button href="/contact" variant="brand" arrow>
              Talk to Us
            </Button>
            <Button href="/demo-test" variant="outline">
              Try Free Demo
            </Button>
          </div>
        </Container>

        {/* Animated stats */}
        <div className="relative border-t border-line">
          <Container className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className={`border-line px-3 py-7 text-center sm:py-9 ${i % 2 ? '' : 'border-r'} ${i < 2 ? 'border-b lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}>
                <s.icon className="mx-auto size-5 text-brand" />
                <CountUp value={s.value} className="display mt-3 block text-[2.4rem] leading-none sm:text-[3rem]" />
                <span className="mt-2 block font-code text-[11px] uppercase tracking-[0.12em] text-muted sm:text-[12px]">{s.label}</span>
              </div>
            ))}
          </Container>
        </div>
      </section>

      {/* ===== WHO WE ARE + WHAT WE OFFER ===== */}
      <section className="border-b border-line">
        <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Eyebrow n="02">Who we are</Eyebrow>
            <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem]">
              Educators <em className="accent">who get it.</em>
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
              DSATGURU was founded by a team of experienced educators and test-prep experts who understand the challenges
              students face when preparing for standardized tests. We know that every student is unique, with different
              strengths, weaknesses, and learning styles. That&apos;s why we&apos;ve created a comprehensive suite of prep
              options designed to meet the needs of every learner, from beginners to advanced test-takers.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Eyebrow n="03">What we offer</Eyebrow>
            <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem]">
              Everything you need <em className="accent">to score higher.</em>
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
              We specialize in realistic, adaptive DSAT/PSAT practice tests and live online courses that mirror the actual
              exam — crafted to target knowledge gaps, build confidence, and boost scores.
            </p>
            <ul className="mt-6 border-t border-line">
              {offers.map(([t, d]) => (
                <li key={t} className="flex gap-3 border-b border-line py-3.5 text-[15.5px] leading-snug">
                  <span className="mt-[7px] size-1.5 shrink-0 bg-brand" />
                  <span className="text-muted">
                    <b className="font-semibold text-ink">{t}:</b> {d}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      {/* ===== GUARANTEE ===== */}
      <section id="guarantee" className="scroll-mt-20 border-b border-line">
        <Container className="py-16 sm:py-20">
          <Reveal className="relative overflow-hidden border border-line bg-panel p-8 text-panel-ink sm:p-12">
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
              <span className="grid size-14 place-items-center bg-brand text-on-brand">
                <LuShieldCheck className="size-7" />
              </span>
              <div>
                <h2 className="display text-[2.3rem] leading-tight sm:text-[2.9rem]">
                  Our <em className="accent">guarantee*</em>
                </h2>
                <p className="mt-4 max-w-[720px] text-[17px] leading-relaxed text-panel-ink-2">
                  We&apos;re so confident in the quality of our content and teaching methods that we guarantee* results.
                  Whether you&apos;re aiming for a 200+ point increase* or a score of 1420+*, we stand by our promise.
                </p>
                <p className="mt-5 border-t border-panel-line pt-4 text-[13px] text-panel-muted">*Terms and conditions apply. Please contact us for details.</p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section className="border-b border-line bg-canvas">
        <Container className="py-16 sm:py-24">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <Eyebrow n="04" center>
              Why us
            </Eyebrow>
            <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
              Why choose <em className="accent">DSATGURU?</em>
            </h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
            {whyCards.map((item) => (
              <StaggerItem key={item.title} data-spotlight className="lift flex flex-col border border-line bg-surface p-6 sm:p-7">
                <IconTile icon={item.icon} tone="solid" />
                <h3 className="mt-6 text-[19px] font-semibold">{item.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{item.description}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section>
        <Container className="py-16 text-center sm:py-24">
          <Reveal>
            <h2 className="display text-balance text-[2.4rem] leading-[1.02] sm:text-[3.2rem]">
              Get started <em className="accent">today.</em>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-relaxed text-muted">
              Join us today and let DSATGURU help you score higher, stress less, and succeed more. Your journey to academic
              excellence starts here!
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/" size="lg" arrow>
                Explore Our Courses
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  )
}
