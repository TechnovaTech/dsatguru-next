'use client'

// Small building blocks of the public-site redesign (square edges, serif headings, mono labels).
// Only used inside PublicLayout's `.site` wrapper, whose CSS variables give these colours their values.
import Link from 'next/link'
import { LuArrowRight } from 'react-icons/lu'

export const cn = (...parts) => parts.filter(Boolean).join(' ')

export function Container({ className, children }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

// "01  FIND A COURSE": brand mono number, then a spaced uppercase label.
export function Eyebrow({ n, children, className, center = false }) {
  return (
    <p className={cn('flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink', center && 'justify-center', className)}>
      {n ? <span className="font-code text-brand">{n}</span> : null}
      <span>{children}</span>
    </p>
  )
}

const variants = {
  cta: 'bg-cta text-on-cta hover:bg-cta-hover',
  brand: 'bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-press',
  outline: 'border border-line-strong text-ink hover:border-ink hover:bg-ink/5',
  ghost: 'text-ink hover:bg-ink/5',
}
const sizes = {
  sm: 'h-9 px-3.5 text-[13.5px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-7 text-[15.5px]',
}

export function Button({ href, variant = 'cta', size = 'md', arrow = false, className, children, ...rest }) {
  const cls = cn(
    'group/btn inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
  const inner = (
    <>
      {children}
      {arrow ? (
        <LuArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover/btn:translate-x-1" />
      ) : null}
    </>
  )
  if (href) {
    const external = /^(https?:|tel:|mailto:)/.test(href)
    return external ? (
      <a href={href} className={cls} {...(href.startsWith('http') && { target: '_blank', rel: 'noreferrer' })} {...rest}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    )
  }
  return (
    <button className={cls} {...rest}>
      {inner}
    </button>
  )
}

// Underlined text link with a brand arrow ("Or browse every course ->").
export function RuleLink({ href, children, className, onClick }) {
  const inner = (
    <>
      <span className="link-rule">{children}</span>
      <LuArrowRight aria-hidden="true" className="size-4 text-brand transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-1" />
    </>
  )
  const cls = cn('group inline-flex items-center gap-2 text-[15px] font-medium text-ink', className)
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

// Square "D." mark plus the wordmark in the heading serif.
export function Logo({ className }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 text-ink', className)} aria-label="DSATGURU home">
      <span className="relative grid size-8 place-items-center bg-cta text-on-cta">
        <span className="display text-[22px] leading-none">D</span>
        <span className="absolute bottom-[7px] right-[6px] size-[5px] bg-brand" />
      </span>
      <span className="display text-[23px] leading-none tracking-[-0.02em]">DSATGURU</span>
    </Link>
  )
}

// Small square icon tile used in cards.
export function IconTile({ icon: Icon, tone = 'soft', className }) {
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center', tone === 'solid' ? 'bg-brand text-on-brand' : 'bg-sunken text-brand', className)}>
      <Icon aria-hidden="true" className="size-[18px]" />
    </span>
  )
}

// Section heading block: eyebrow, serif title with an italic accent, optional lead text.
export function SectionHead({ n, eyebrow, title, accent, lead, center = false, className }) {
  return (
    <div className={cn(center && 'mx-auto text-center', 'max-w-[760px]', className)}>
      <Eyebrow n={n} center={center}>
        {eyebrow}
      </Eyebrow>
      <h2 className="display mt-5 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
        {title} {accent ? <em className="accent">{accent}</em> : null}
      </h2>
      {lead ? <p className={cn('mt-4 text-[17px] leading-relaxed text-muted', center && 'mx-auto', 'max-w-[600px]')}>{lead}</p> : null}
    </div>
  )
}
