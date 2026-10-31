'use client'
import Image from 'next/image'
import { CountUp, Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow } from './site/ui'

const stats = [
  { number: '4,000+', label: 'Practice Questions' },
  { number: '10+', label: 'Years Experience' },
  { number: '99%+', label: 'Success Rate' },
]

export default function IntroSection() {
  return (
    <section className="border-b border-line">
      <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative">
          <div className="border border-line bg-surface p-2.5">
            <Image
              src="/70f38349-b4a8-4414-b6d0-d1f119675428.png"
              alt="10+ Years Experience - DSATGURU"
              width={1402}
              height={1122}
              className="h-auto w-full"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Eyebrow n="02">Smarter SAT prep</Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Get closer to your dream college with <em className="accent">smarter SAT preparation.</em>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            An innovative SAT preparation platform, empowering students with personalized SAT exam prep, advanced study
            tools, and proven strategies. We offer structured courses, live and online classes, adaptive practice tests,
            and over 4,000 realistic questions to strengthen your weak areas and maximize your score.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            With over 10 years of experience, we focus on what truly matters — helping students make the most of their
            limited time and achieve their highest college-bound potential.
          </p>
          <Stagger className="mt-8 grid grid-cols-3 border border-line">
            {stats.map((stat) => (
              <StaggerItem key={stat.label} className="border-r border-line p-4 last:border-r-0 sm:p-5">
                <CountUp value={stat.number} className="display block text-[2rem] leading-none sm:text-[2.4rem]" />
                <span className="mt-2 block font-code text-[11px] uppercase tracking-[0.1em] text-muted">{stat.label}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
      </Container>
    </section>
  )
}
