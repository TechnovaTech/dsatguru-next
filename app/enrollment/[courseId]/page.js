'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaStar } from 'react-icons/fa'
import { LuArrowRight, LuBookOpen, LuCalendarCheck, LuCheck, LuClock, LuPresentation, LuQuote, LuShieldCheck, LuX } from 'react-icons/lu'
import { useCourses } from '../../components/CourseContext'
import { useAuth } from '../../components/AuthContext'
import { useToast } from '../../components/ui/UIProvider'
import axios from 'axios'
import FloatingContact from '../../components/site/FloatingContact'
import { Reveal, Stagger, StaggerItem } from '../../components/site/motion'
import { Container, Eyebrow, IconTile, cn } from '../../components/site/ui'

export default function EnrollmentPage() {
  const toast = useToast()
  const { courseId } = useParams()
  const router = useRouter()
  const { courses, loading: coursesLoading, refreshCourses } = useCourses()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const resumedRef = useRef(false)

  // Remember the intent to enroll, then send the guest to sign in / sign up.
  // After auth they return here (via returnTo) and checkout resumes automatically.
  const goLogin = () => {
    try { sessionStorage.setItem('dg_pending_enroll', String(courseId)) } catch {}
    router.push(`/login?returnTo=/enrollment/${courseId}`)
  }

  useEffect(() => {
    if (courses.length > 0) {
      const foundCourse = courses.find((c) => c.courseId === courseId || c.id === courseId)
      setCourse(foundCourse)
    }
  }, [courseId, courses])

  useEffect(() => {
    refreshCourses()
  }, [courseId])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleEnroll = async (scheduleId = null) => {
    if (!user) {
      goLogin()
      return
    }
    if (course.discountedPrice > 0 || course.originalPrice > 0) {
      try {
        setEnrollLoading(true)
        const token = localStorage.getItem('token')
        const response = await axios.post(
          '/api/create-payment-intent',
          { courseId: course.id, amount: course.discountedPrice || course.originalPrice, courseTitle: course.title, scheduleId },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        window.location.href = response.data.url
      } catch (error) {
        toast.error('Payment setup failed')
        setEnrollLoading(false)
      }
    } else {
      try {
        setEnrollLoading(true)
        const response = await axios.post('/api/enrollment', { courseId, scheduleId })
        if (response.data.success) {
          toast.success('Enrollment successful!')
          router.push('/dashboard/courses')
        }
      } catch (error) {
        console.error('Enrollment error:', error)
        toast.error('Failed to enroll. Please try again.')
      } finally {
        setEnrollLoading(false)
      }
    }
  }

  const handleScheduleSelection = () => {
    if (!user) {
      goLogin()
      return
    }
    if (course.courseSchedules?.length === 1) {
      handleEnroll(course.courseSchedules[0].id)
    } else if (course.courseSchedules?.length > 1) {
      setShowScheduleModal(true)
    } else {
      handleEnroll(null)
    }
  }

  // Resume checkout automatically when the user comes back authenticated after
  // being sent to sign in mid-enroll. (They still actively pay on Stripe.)
  useEffect(() => {
    if (resumedRef.current || !user || !course) return
    let pending = null
    try { pending = sessionStorage.getItem('dg_pending_enroll') } catch {}
    if (pending && pending === String(courseId)) {
      resumedRef.current = true
      try { sessionStorage.removeItem('dg_pending_enroll') } catch {}
      handleScheduleSelection()
    }
  }, [user, course])

  if (coursesLoading) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto size-12 animate-spin rounded-full border-2 border-line border-t-brand" />
          <p className="mt-4 text-muted">Loading course details...</p>
        </div>
      </Container>
    )
  }

  if (!course) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-20">
        <div className="text-center">
          <h2 className="display text-[2.6rem] leading-tight">Course not found</h2>
          <p className="mt-3 text-muted">The course you&apos;re looking for doesn&apos;t exist.</p>
          <button onClick={() => router.push('/')} className="mt-7 inline-flex h-11 items-center bg-cta px-6 text-[15px] font-medium text-on-cta hover:bg-cta-hover">
            Go Home
          </button>
        </div>
      </Container>
    )
  }

  const hasPrice = course.originalPrice > 0 || course.discountedPrice > 0
  const benefits = [
    { icon: LuPresentation, title: 'Expert Instructors', desc: 'Learn from experienced educators with proven track records of helping students achieve exceptional DSAT/PSAT scores.' },
    { icon: LuShieldCheck, title: 'Score Guarantee', desc: "We're confident in our methods. Complete all course requirements and we guarantee a significant score improvement." },
    { icon: LuBookOpen, title: 'Comprehensive Materials', desc: 'Access to extensive practice materials, realistic practice tests, and detailed explanations for all questions.' },
  ]
  const enrollButton = (extra) => (
    <button
      onClick={handleScheduleSelection}
      disabled={enrollLoading}
      className={cn(
        'group inline-flex h-[52px] items-center justify-center gap-2 bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
        extra,
      )}
    >
      {enrollLoading ? 'Processing...' : 'Enroll Now'}
      <LuArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </button>
  )
  const price = (big) =>
    hasPrice ? (
      <p className="flex items-baseline gap-3">
        <span className={cn('display leading-none', big ? 'text-[3.4rem]' : 'text-[2.8rem]')}>${course.discountedPrice || course.originalPrice}</span>
        {course.originalPrice ? <s className="font-code text-[15px] text-muted decoration-brand decoration-2">${course.originalPrice}</s> : null}
      </p>
    ) : null

  return (
    <>
      <FloatingContact />

      {/* ===== HERO ===== */}
      <section className="relative border-b border-line">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_80%_20%,#000,transparent_70%)]" />
        <Container className="relative grid items-center gap-12 py-14 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <Eyebrow n="01">Let&apos;s score higher</Eyebrow>
            <h1 className="display animate-rise mt-6 text-balance text-[2.6rem] uppercase leading-[1] sm:text-[3.6rem]">{course.title}</h1>
            {course.subtitle && <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-ink-2">{course.subtitle}</p>}
            <ul className="mt-7 grid gap-2.5 border-t border-line pt-6 sm:grid-cols-2">
              {course.included?.slice(0, 4).map((item, idx) => (
                <li key={idx} className="flex gap-2.5 text-[15px] leading-snug text-ink-2">
                  <LuCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              {price(true)}
              {enrollButton()}
            </div>
            {course.enrollmentNote && <p className="mt-4 text-[14px] text-muted">{course.enrollmentNote}</p>}
          </div>

          <Reveal>
            <div className="border border-line bg-surface p-2.5 shadow-[0_40px_80px_-40px_#000000cc]">
              <Image src="/course-hero-art.png" alt={`${course.title} — score growth with DSATGURU`} width={900} height={980} priority className="h-auto w-full" />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ===== OVERVIEW + BENEFITS ===== */}
      <section className="border-b border-line">
        <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <Reveal>
            <Eyebrow n="02">Course overview</Eyebrow>
            <h2 className="display mt-6 text-[2.3rem] leading-[1.04] sm:text-[2.9rem]">
              What you&apos;ll <em className="accent">master.</em>
            </h2>
            {course.description && <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{course.description}</p>}
            <ul className="mt-6 border-t border-line">
              {course.included?.map((item, idx) => (
                <li key={idx} className="flex gap-3 border-b border-line py-3 text-[15.5px] leading-snug text-ink-2">
                  <LuCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Stagger className="grid content-start gap-4">
            {benefits.map((b) => (
              <StaggerItem key={b.title} data-spotlight className="flex gap-5 border border-line bg-surface p-5 sm:p-6">
                <IconTile icon={b.icon} />
                <div>
                  <h3 className="text-[17.5px] font-semibold">{b.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{b.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ===== PRICING + INFO + SCHEDULES ===== */}
      <section className="border-b border-line bg-canvas">
        <Container className={cn('grid gap-5 py-16 sm:py-20', hasPrice && course.courseSchedules?.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
          {hasPrice && (
            <Reveal className="relative overflow-hidden border border-brand bg-surface p-7">
              <span className="font-code text-[12px] uppercase tracking-[0.12em] text-brand">% Special offer</span>
              <div className="mt-4">{price(false)}</div>
              {course.priceNote && <p className="mt-3 text-[14px] text-muted">{course.priceNote}</p>}
              {enrollButton('mt-6 w-full')}
            </Reveal>
          )}

          <Reveal delay={0.05} className="grid gap-5">
            <div className="border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-code text-[12px] uppercase tracking-[0.12em] text-muted">Class duration</h3>
                <LuClock className="size-5 text-brand" />
              </div>
              <p className="display mt-3 text-[1.8rem] leading-tight">Multiple Sessions</p>
              <p className="mt-1 text-[14.5px] text-muted">Comprehensive course with regular classes</p>
            </div>
            <div className="border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-code text-[12px] uppercase tracking-[0.12em] text-muted">Class format</h3>
                <LuPresentation className="size-5 text-brand" />
              </div>
              <p className="display mt-3 text-[1.8rem] leading-tight">Live Online Classes</p>
              <p className="mt-1 text-[14.5px] text-muted">Interactive sessions with expert instructors</p>
            </div>
          </Reveal>

          {course.courseSchedules?.length > 0 ? (
            <Reveal delay={0.1} className="border border-line bg-surface p-6">
              <div className="flex items-center gap-3">
                <LuCalendarCheck className="size-5 text-brand" />
                <h3 className="font-code text-[12px] uppercase tracking-[0.12em] text-muted">Upcoming schedules</h3>
              </div>
              <ul className="mt-4 grid gap-3">
                {course.courseSchedules.map((schedule, idx) => (
                  <li key={idx} className="border-l-2 border-brand pl-4">
                    <p className="text-[15.5px] font-semibold">{schedule.batchTag}</p>
                    <ul className="mt-1 space-y-0.5 font-code text-[12.5px] text-muted">
                      {schedule.labels?.map((label, lidx) => (
                        <li key={lidx}>{label.replace(/[()]/g, '')}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </Container>
      </section>

      {/* ===== Testimonial / trust card ===== */}
      <section className="border-b border-line">
        <Container className="py-16 sm:py-20">
          <Reveal className="grid gap-10 border border-line bg-surface p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <LuQuote className="size-7 text-brand" />
              <p className="display mt-5 text-[1.9rem] leading-snug">
                &ldquo;Our students consistently see significant score improvements after completing this course — with expert
                guidance every step of the way.&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex gap-0.5 text-star">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} size={13} />
                  ))}
                </span>
                <span className="text-[14px] text-muted">DSAT/PSAT Students</span>
              </div>
            </div>
            <div className="grid grid-cols-3 border border-line">
              {[['4,000+', 'Questions'], ['99%', 'Success'], ['+260', 'Avg Gain']].map(([n, l]) => (
                <div key={l} className="border-r border-line p-4 text-center last:border-r-0">
                  <div className="display text-[2rem] leading-none">{n}</div>
                  <div className="mt-2 font-code text-[11px] uppercase tracking-[0.1em] text-muted">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ===== CTA ===== */}
      <section>
        <Container className="py-16 sm:py-20">
          <Reveal className="relative overflow-hidden border border-line bg-panel p-8 text-center text-panel-ink sm:p-12">
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <h2 className="display text-balance text-[2.3rem] leading-tight sm:text-[3rem]">
                Ready to <em className="accent">boost your score?</em>
              </h2>
              <p className="mx-auto mt-4 max-w-[600px] text-[16.5px] text-panel-ink-2">
                Enroll in our DSAT/PSAT programs and get expert training, real practice tests, and a clear strategy to
                success. Join today and see the difference!
              </p>
              <div className="mt-8 flex justify-center">{enrollButton()}</div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Schedule Selection Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
          <button type="button" aria-label="Close" onClick={() => setShowScheduleModal(false)} className="absolute inset-0 bg-black/60" />
          <div className="animate-pop relative w-full max-w-md border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 id="schedule-title" className="display text-[2rem] leading-tight">
                Select schedule
              </h3>
              <button type="button" onClick={() => setShowScheduleModal(false)} aria-label="Close" className="grid size-9 place-items-center border border-line text-ink-2 hover:text-ink">
                <LuX className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid max-h-[50vh] gap-2.5 overflow-y-auto">
              {course.courseSchedules?.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => setSelectedSchedule(schedule.id)}
                  className={cn(
                    'w-full border p-3.5 text-left transition-colors',
                    selectedSchedule === schedule.id ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong',
                  )}
                >
                  <div className="text-[15.5px] font-semibold">{schedule.batchTag}</div>
                  {schedule.labels?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 font-code text-[12.5px] text-muted">
                      {schedule.labels.map((label, lidx) => (
                        <li key={lidx}>{label.replace(/[()]/g, '')}</li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowScheduleModal(false)} className="h-11 border border-line-strong text-[15px] font-medium text-ink hover:border-ink">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedSchedule) {
                    setShowScheduleModal(false)
                    handleEnroll(selectedSchedule)
                  }
                }}
                disabled={!selectedSchedule}
                className="h-11 bg-brand text-[15px] font-medium text-on-brand hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
