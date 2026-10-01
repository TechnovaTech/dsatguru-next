// Store helpers that are safe in the browser - no database, no Stripe.
// Pages import these; lib/igcscStore.js builds on them on the server.

// Two-decimal currencies only: toMinor() multiplies by 100.
export const CURRENCIES = ['usd', 'gbp', 'eur', 'inr', 'aed', 'sgd', 'aud', 'cad']

// Stripe will not take a card payment below these.
export const MIN_CHARGE = { usd: 0.5, gbp: 0.3, eur: 0.5, inr: 0.5, aed: 2, sgd: 0.5, aud: 0.5, cad: 0.5 }

export function formatPrice(amount, currency = 'usd') {
  const n = Number(amount || 0)
  if (!n) return 'Free'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency).toUpperCase() }).format(n)
  } catch {
    return `${n.toFixed(2)} ${String(currency).toUpperCase()}`
  }
}

// A price is either free or something Stripe will actually charge.
export function priceProblem(amount, currency = 'usd') {
  const n = Number(amount)
  if (!Number.isFinite(n) || n < 0) return 'Price must be zero or more.'
  if (n === 0) return ''
  const min = MIN_CHARGE[currency] ?? 0.5
  if (n < min) return `The lowest price Stripe can charge is ${formatPrice(min, currency)} (or set it to 0 for free).`
  if (Math.round(n * 100) / 100 !== n) return 'Use at most two decimal places.'
  return ''
}

export function scopeLabel({ scope, curriculum, subject }) {
  if (scope === 'subject') return `${curriculum} ${subject}`.trim()
  if (scope === 'curriculum') return curriculum || 'one curriculum'
  return 'the whole bank'
}

export function durationLabel(days) {
  const d = Number(days || 0)
  if (!d) return 'never expires'
  if (d % 365 === 0) return `${d / 365} year${d / 365 > 1 ? 's' : ''}`
  if (d % 30 === 0) return `${d / 30} month${d / 30 > 1 ? 's' : ''}`
  return `${d} day${d > 1 ? 's' : ''}`
}

// One line a buyer can read: "Any 5 test papers" / "Every IGCSE paper for 3 months".
export function planSummary(plan) {
  if (!plan) return ''
  if (plan.kind === 'credits') {
    const n = Number(plan.credits || 0)
    return `Any ${n} test paper${n === 1 ? '' : 's'} of your choice`
  }
  const what = plan.scope === 'all' ? 'Every test paper' : `Every ${scopeLabel(plan)} paper`
  return Number(plan.durationDays) ? `${what} for ${durationLabel(plan.durationDays)}` : `${what}, for good`
}

// Does an access grant (or a plan) cover this paper? Only papers that are on
// sale: a held-back paper is incomplete, and "everything" means everything
// we sell, not everything in the database.
export function coversPaper(grant, paper) {
  if (!grant || !paper) return false
  if (!paper.isPublished || paper.missingFromBank) return false
  if (grant.scope === 'all') return true
  if (grant.scope === 'curriculum') return grant.curriculum === paper.curriculum
  if (grant.scope === 'subject') return grant.curriculum === paper.curriculum && grant.subject === paper.subject
  return false
}

export const VIA_LABEL = {
  purchase: 'Purchased',
  plan: 'In your plan',
  credit: 'Unlocked with a credit',
  grant: 'Given to you',
  assignment: 'Assigned by your tutor',
  free: 'Free',
  staff: 'Staff access',
}

export const ATTEMPT_STATUS = {
  in_progress: { label: 'In progress', tone: 'amber' },
  grading: { label: 'Being marked', tone: 'blue' },
  needs_review: { label: 'Tutor checking', tone: 'violet' },
  completed: { label: 'Marked', tone: 'green' },
}

// IGCSE grade from a percentage (A*–U). Same scale as lib/igcscDb.js.
export function gradeFromPct(p) {
  if (p >= 90) return 'A*'
  if (p >= 80) return 'A'
  if (p >= 70) return 'B'
  if (p >= 60) return 'C'
  if (p >= 50) return 'D'
  if (p >= 40) return 'E'
  return 'U'
}
