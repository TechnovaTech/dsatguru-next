'use client'
import { LuGraduationCap, LuRocket, LuSmile } from 'react-icons/lu'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow, IconTile } from './site/ui'

const benefits = [
  {
    icon: LuGraduationCap,
    title: 'Key to Maximize College Prospects',
    description:
      'Our proven methods and expert guidance ensure measurable improvement on your DSAT/PSAT score to boost your college application prospects and scholarships.',
  },
  {
    icon: LuSmile,
    title: 'Reduce Test-Related Anxiety',
    description:
      'Our realistic practice tests and comprehensive preparation tools help students feel confident and prepared, reducing test anxiety on the actual exam day.',
  },
  {
    icon: LuRocket,
    title: 'Get the Confidence You Need',
    description:
      "With over 4,000 practice questions and 25+ adaptive tests, our program ensures you'll walk into test day with the confidence to perform at your very best.",
  },
]

export default function BenefitsSection() {
  return (
    <section className="border-b border-line bg-canvas">
      <Container className="py-16 sm:py-24">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <Eyebrow n="06" center>
            Why it matters
          </Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Benefits of <em className="accent">affordable SAT exam preparation.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-relaxed text-muted">
            We offer a budget-friendly SAT study course designed to help students achieve higher scores without
            compromising on quality, structure, or expert guidance.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
          {benefits.map((b, i) => (
            <StaggerItem key={b.title} data-spotlight className="lift flex flex-col border border-line bg-surface p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <IconTile icon={b.icon} tone="solid" />
                <span className="font-code text-[12px] text-subtle">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-[19px] font-semibold leading-snug">{b.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{b.description}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
