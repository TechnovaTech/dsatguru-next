'use client'

// Shared layout for the log-in, sign-up and password-reset pages: a brand panel (left, from tablet width up) and the
// form panel (right). Only the look lives here; every page keeps its own form logic.
import Link from 'next/link'
import { LuArrowLeft, LuCircleAlert } from 'react-icons/lu'
import { Container, cn } from './ui'

export function AuthShell({ kicker, title, subtitle, perks = [], helpTitle, children }) {
  return (
    <section className="border-b border-line">
      <Container className="py-10 sm:py-14">
        <div className="animate-rise grid overflow-hidden border border-line bg-surface md:grid-cols-[1fr_1.1fr]">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-10 text-panel-ink md:flex">
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] text-panel-muted transition-colors hover:text-panel-ink">
                <LuArrowLeft className="size-4" /> Back to home
              </Link>
              <p className="mt-10 font-code text-[12px] uppercase tracking-[0.14em] text-panel-accent">{kicker}</p>
              <h1 className="display mt-4 text-[2.6rem] leading-[1.02]">{title}</h1>
              <p className="mt-4 max-w-[380px] text-[15.5px] leading-relaxed text-panel-ink-2">{subtitle}</p>
              {perks.length ? (
                <ul className="mt-8 border-t border-panel-line">
                  {perks.map((p) => (
                    <li key={p} className="flex gap-3 border-b border-panel-line py-3 text-[14.5px] text-panel-ink-2">
                      <span className="mt-[7px] size-1.5 shrink-0 bg-panel-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="relative mt-10 text-[13.5px] text-panel-muted">
              <p className="font-semibold text-panel-ink">{helpTitle}</p>
              <p className="mt-1">
                Email{' '}
                <a className="underline underline-offset-4 hover:text-panel-ink" href="mailto:info@dsatguru.com">
                  info@dsatguru.com
                </a>{' '}
                or call 1-329-239-8577.
              </p>
            </div>
          </div>

          {/* Form panel */}
          <div className="p-6 sm:p-10">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink md:hidden">
              <LuArrowLeft className="size-4" /> Back to home
            </Link>
            <div className="mt-6 md:mt-0">{children}</div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function FormTitle({ icon: Icon, title, subtitle }) {
  return (
    <div>
      {Icon ? (
        <span className="mb-5 grid size-11 place-items-center bg-brand text-on-brand">
          <Icon size={20} />
        </span>
      ) : null}
      <h2 className="display text-[2.4rem] leading-tight">{title}</h2>
      {subtitle ? <p className="mt-2 text-[15.5px] text-muted">{subtitle}</p> : null}
    </div>
  )
}

// A labelled field. The frame lights up on focus and turns red on error; `children` is the input itself.
export function Field({ label, htmlFor, icon: Icon, error, after, children }) {
  return (
    <div>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-medium text-ink">
          {label}
        </label>
      ) : null}
      <div className={cn('flex items-center gap-3 border bg-page px-3.5 transition-colors focus-within:border-brand', error ? 'border-negative' : 'border-line-strong')}>
        {Icon ? <Icon className="shrink-0 text-muted" /> : null}
        {children}
        {after}
      </div>
      {error ? <p className="mt-1.5 text-[13px] text-negative">{error}</p> : null}
    </div>
  )
}

// Class for an <input> inside <Field>.
export const fieldInput = 'h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle'

// Class for the big 6-digit code box.
export const codeInput = (error) =>
  cn(
    'h-16 w-full border bg-page text-center font-code text-[1.9rem] tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-subtle focus:border-brand',
    error ? 'border-negative' : 'border-line-strong',
  )

export function Alert({ children }) {
  return (
    <p role="alert" className="mt-5 flex items-start gap-2 border border-negative bg-negative/10 p-3.5 text-[14.5px] text-ink">
      <LuCircleAlert className="mt-0.5 size-4 shrink-0 text-negative" /> <span>{children}</span>
    </p>
  )
}

// Show/hide password toggle placed at the end of a <Field>.
export function EyeToggle({ shown, onToggle, Eye, EyeOff }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? 'Hide password' : 'Show password'} className="shrink-0 text-muted transition-colors hover:text-ink">
      {shown ? <EyeOff /> : <Eye />}
    </button>
  )
}

export const primaryButton =
  'group inline-flex h-[52px] w-full items-center justify-center gap-2 bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60'

export const textLink = 'font-medium text-brand underline-offset-4 hover:underline'
