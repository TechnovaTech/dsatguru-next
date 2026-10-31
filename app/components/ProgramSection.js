'use client'
import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuArrowRight, LuCheck, LuPhone } from 'react-icons/lu'
import { useCourses } from './CourseContext'
import { Reveal, Stagger, StaggerItem } from './site/motion'
import { Container, Eyebrow, cn } from './site/ui'

const ProgramCard = ({ data, isEnrolled, featured }) => {
  const router = useRouter()

  const discountPercentage = useMemo(() => {
    if (data.originalPrice && data.discountedPrice) {
      return Math.round(((Number(data.originalPrice) - Number(data.discountedPrice)) / Number(data.originalPrice)) * 100)
    }
    return null
  }, [data.originalPrice, data.discountedPrice])

  const IconComponent = data.icon
  const isTutoring = data?.slug === 'individual-tutoring' || !data.originalPrice

  const enroll = () => {
    const id = data.courseId || data.id || data._id
    router.push(isEnrolled ? `/dashboard/courses/${id}` : `/enrollment/${id}`)
  }

  return (
    <StaggerItem
      data-spotlight
      className={cn('lift flex h-full flex-col border bg-surface', featured ? 'border-brand shadow-[0_30px_60px_-30px_var(--brand)]' : 'border-line')}
    >
      {/* header */}
      <div className={cn('relative border-b p-6 sm:p-7', featured ? 'border-brand bg-brand-soft' : 'border-line bg-canvas')}>
        <div className="flex items-start justify-between gap-3">
          <span className={cn('grid size-11 place-items-center', featured ? 'bg-brand text-on-brand' : 'bg-sunken text-brand')}>
            {IconComponent ? <IconComponent size={20} /> : <span>📚</span>}
          </span>
          <span className="flex flex-col items-end gap-1.5">
            {featured ? <span className="bg-brand px-2 py-0.5 font-code text-[11px] uppercase tracking-[0.08em] text-on-brand">★ Most popular</span> : null}
            {discountPercentage ? (
              <span className="bg-brand-soft px-2 py-0.5 font-code text-[11px] uppercase tracking-[0.08em] text-brand">{discountPercentage}% off</span>
            ) : null}
          </span>
        </div>
        <h3 className="display mt-6 text-[1.7rem] uppercase leading-[1.05] tracking-[-0.005em]">{data.title}</h3>
        <p className="mt-2 text-[14.5px] text-muted">{data.subtitle}</p>
        {data.batch ? (
          <p className="mt-4 whitespace-pre-line border-l-2 border-brand pl-3 font-code text-[12.5px] leading-relaxed text-ink-2">
            {Array.isArray(data.batch) ? data.batch.join('\n') : data.batch}
          </p>
        ) : null}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <p className="font-code text-[12px] uppercase tracking-[0.1em] text-muted">Price</p>
        {isTutoring ? (
          <p className="mt-1">
            <span className="display block text-[2.4rem] leading-none">Call us</span>
            <a href="tel:+13292398577" className="mt-2 block font-code text-[14px] text-brand">
              1-329-239-8577
            </a>
          </p>
        ) : (
          <p className="mt-1 flex items-baseline gap-3">
            <span className="display text-[3rem] leading-none">${data.discountedPrice}</span>
            <s className="font-code text-[15px] text-muted decoration-brand decoration-2">${data.originalPrice}</s>
          </p>
        )}

        <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
          {data.included?.map((f, idx) => (
            <li key={idx} className="flex gap-3 text-[14.5px] leading-snug text-ink-2">
              <LuCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {isTutoring ? (
            <button
              type="button"
              onClick={() => router.push('/contact')}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 border border-line-strong text-[15px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
            >
              Contact Us <LuPhone className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={enroll}
              className={cn(
                'group inline-flex h-12 w-full items-center justify-center gap-2 text-[15px] font-medium transition-colors active:translate-y-px',
                featured ? 'bg-brand text-on-brand hover:bg-brand-hover' : 'bg-cta text-on-cta hover:bg-cta-hover',
              )}
            >
              {isEnrolled ? 'Access Course' : 'Enroll Now'}
              <LuArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </StaggerItem>
  )
}

export default function ProgramSection({ landingPlanRef }) {
  const { courses } = useCourses()
  const [enrolledIds, setEnrolledIds] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setEnrolledIds([])
    }
  }, [courses.length])

  return (
    <section id="programs" ref={landingPlanRef} className="scroll-mt-20 border-b border-line">
      <Container className="py-16 sm:py-24">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <Eyebrow n="04" center>
            Our programs
          </Eyebrow>
          <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
            Choose your <em className="accent">path to success.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-relaxed text-muted">
            Select the SAT preparation course that best fits your needs and learning style. All options are designed to
            maximize your score improvement.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <ProgramCard
              key={i}
              data={course}
              featured={i === 1}
              isEnrolled={enrolledIds.includes(course.id) || enrolledIds.includes(course.courseId) || enrolledIds.includes(course._id)}
            />
          ))}
        </Stagger>

        <p className="mx-auto mt-10 max-w-[640px] text-center text-[13.5px] leading-relaxed text-muted">
          Score increase guarantee applies to students who complete all course requirements and practice tests.
          <br />
          Concept videos provide comprehensive review of core DSAT/PSAT topics.
        </p>
      </Container>
    </section>
  )
}
