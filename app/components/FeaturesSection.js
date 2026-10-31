'use client'
import Image from 'next/image'
import { LuMonitorSmartphone, LuUsers, LuVideo } from 'react-icons/lu'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow, IconTile } from './site/ui'

const features = [
  {
    icon: LuMonitorSmartphone,
    title: 'Realistic Immersive Interface',
    description:
      'Our interface mirrors the official DSAT exam, offering a realistic environment to build familiarity and confidence for peak test performance.',
  },
  {
    icon: LuVideo,
    title: 'Video and Text Questions and Answers',
    description:
      'We provide official-style questions with detailed explanations in both video and text, helping students understand concepts clearly and confidently.',
  },
  {
    icon: LuUsers,
    title: 'Self-Study, Live Prep or One-on-One',
    description:
      "Whether it's self-paced learning, live classes, or 1-on-1 tutoring—DSATGURU supports every learning style with practice tests and personalized help.",
  },
]

export default function FeaturesSection() {
  return (
    <section className="border-b border-line">
      <Container className="py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Eyebrow n="03">Study smarter</Eyebrow>
            <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
              Elevate your <em className="accent">SAT preparation.</em>
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
              SAT exam preparation becomes much easier if you follow the right method. At DSATGURU, we focus on effective
              and organized methods that actually work, helping you study smarter, not harder.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">
              Our live online SAT study courses let you practice at your own pace while building strong fundamentals.
              With interactive SAT test prep methods, we guide you step by step to build your confidence and perform your
              best on the exam.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border border-line bg-surface p-2.5">
              <Image
                src="/560aa162-2d99-44f3-86e2-0199644c37ab.png"
                alt="Elevate your SAT preparation with DSATGURU — smarter Digital SAT study methods"
                width={1536}
                height={1024}
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>
        </div>

        <Stagger className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16">
          {features.map((f) => (
            <StaggerItem key={f.title} data-spotlight className="flex flex-col border border-line bg-surface p-6 sm:p-7">
              <IconTile icon={f.icon} />
              <h3 className="mt-6 text-[19px] font-semibold leading-snug">{f.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{f.description}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
