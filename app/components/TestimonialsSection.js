'use client'
import { FaStar } from 'react-icons/fa'
import { LuQuote } from 'react-icons/lu'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow } from './site/ui'

const testimonials = [
  {
    initials: 'JD',
    name: 'Jamie D.',
    quote:
      "The pilot program for this website's adaptive practice tests were incredibly helpful. They really mirrored the actual DSAT format and helped me feel confident on test day. I improved by 270 points!",
    score: 'Score improved: 1210 → 1480',
    gradient: 'from-indigo-600 to-indigo-700',
  },
  {
    initials: 'MR',
    name: 'Michael R.',
    quote:
      'I was a part of pilot live prep course. My instructor Mr. G made complex topics easy to understand, and the practice tests were exactly like the real DSAT. The drills after each class made the difference.',
    score: 'Score improved: 1180 → 1500',
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    initials: 'AT',
    name: 'Aisha T.',
    quote:
      'I took the bootcamp session (initial free program) right before my test. It refreshed all the key concepts and strategies. My score jumped 260 points from my DSAT! The instructors were amazing.',
    score: 'Score improved: 1280 → 1540',
    gradient: 'from-emerald-500 to-teal-600',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="border-b border-line bg-canvas">
      <Container className="py-16 sm:py-24">
        <Reveal className="max-w-[760px]">
          <Eyebrow n="08">Testimonials (pilot program)</Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Success stories from <em className="accent">our students.</em>
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.name} data-spotlight className="lift flex flex-col border border-line bg-surface p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <LuQuote className="size-6 text-brand" />
                <span className="flex gap-0.5 text-star">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} size={12} />
                  ))}
                </span>
              </div>
              <p className="display mt-5 flex-1 text-[1.35rem] leading-snug text-ink">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <span className="grid size-10 place-items-center bg-sunken font-code text-[12px] text-ink-2">{t.initials}</span>
                <div>
                  <p className="text-[15px] font-semibold">{t.name}</p>
                  <p className="font-code text-[12.5px] text-brand">{t.score}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
