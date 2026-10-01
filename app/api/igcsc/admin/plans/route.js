import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN } from '../../../../../lib/igcscAuth'
import { StoreError, getStoreSettings } from '../../../../../lib/igcscStore'
import { priceProblem, planSummary } from '../../../../../lib/igcscStoreShared'

// Plans as the admin manages them: credit packs and access passes.
//
//   GET  → { plans (all, inactive too), currency }
//   POST → create one → 201 { plan }
//
// Editing and deleting one live in ./[id]/route.js, which validates with
// readPlan() below so a plan can never be saved in a shape create would refuse.
export const dynamic = 'force-dynamic'

const KINDS = ['credits', 'access']
const SCOPES = ['all', 'curriculum', 'subject']

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)

export function planView(p) {
  return { ...p, _id: String(p._id), summary: planSummary(p) }
}

// A plan from a request body, laid over `base` (the stored plan when editing,
// {} when creating). Returns { plan } with every field, or { error }.
export function readPlan(body, base, currency) {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  const from = base || {}
  const has = (k) => b[k] !== undefined
  const pick = (k, fallback) => (has(k) ? b[k] : from[k] ?? fallback)

  const name = str(pick('name', '')).trim()
  if (!name || name.length > 80) return { error: 'Give the plan a name of up to 80 characters.' }

  const description = str(pick('description', '')).trim()
  if (description.length > 400) return { error: 'Keep the description to 400 characters or fewer.' }

  const kind = pick('kind')
  if (!KINDS.includes(kind)) return { error: 'Choose a credits pack or an access plan.' }

  let credits = 0
  let scope = 'all'
  let curriculum = ''
  let subject = ''
  let durationDays = 0
  if (kind === 'credits') {
    credits = num(pick('credits', 0))
    if (!Number.isInteger(credits) || credits < 1 || credits > 500) {
      return { error: 'A credits pack holds a whole number of credits from 1 to 500.' }
    }
    // Credits never expire once bought (fulfilment ignores durationDays for a
    // pack), so a duration here would only promise something that never happens.
  } else {
    scope = pick('scope', 'all')
    if (!SCOPES.includes(scope)) return { error: 'Choose what the plan covers: everything, a curriculum or a subject.' }
    if (scope !== 'all') {
      curriculum = str(pick('curriculum', '')).trim()
      if (!curriculum) return { error: 'Choose a curriculum.' }
    }
    if (scope === 'subject') {
      subject = str(pick('subject', '')).trim()
      if (!subject) return { error: 'Choose a subject.' }
    }
    durationDays = num(pick('durationDays', 0))
    if (!Number.isInteger(durationDays) || durationDays < 0 || durationDays > 3650) {
      return { error: 'Duration must be a whole number of days from 0 (never expires) to 3650.' }
    }
  }

  // A new plan must state its price: a missing one would default to 0 and put
  // the plan on sale for free. On an edit it is checked only when sent - the
  // stored price was valid when saved, and an admin switching a plan off must
  // not be blocked by a currency change since.
  if (!from._id && !has('price')) return { error: 'Set a price (0 makes the plan free).' }
  const price = has('price') ? num(b.price) : Number(from.price ?? 0)
  if (has('price')) {
    const problem = priceProblem(price, currency)
    if (problem) return { error: problem }
  }

  let features = pick('features', [])
  if (typeof features === 'string') features = features.split('\n')
  if (!Array.isArray(features)) return { error: 'Features must be a list.' }
  features = features.map((f) => str(f).trim()).filter(Boolean)
  if (features.length > 8) return { error: 'Up to 8 features.' }
  if (features.some((f) => f.length > 120)) return { error: 'Keep each feature to 120 characters or fewer.' }

  const highlight = pick('highlight', false)
  if (typeof highlight !== 'boolean') return { error: 'highlight must be true or false.' }
  const isActive = pick('isActive', true)
  if (typeof isActive !== 'boolean') return { error: 'isActive must be true or false.' }

  const sortOrder = num(pick('sortOrder', 0))
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) return { error: 'Sort order must be a whole number.' }

  return {
    plan: {
      name, description, kind, credits, scope, curriculum, subject, durationDays,
      price, features, highlight, isActive, sortOrder,
    },
  }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const [plans, settings] = await Promise.all([
      models.Plan.find({}).sort({ sortOrder: 1, price: 1, createdAt: 1 }).lean(),
      getStoreSettings(models),
    ])
    return NextResponse.json({ plans: plans.map(planView), currency: settings.currency })
  } catch (e) { return fail(e, 'GET /api/igcsc/admin/plans') }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const models = await igcscModels()
    const { currency } = await getStoreSettings(models)
    const { plan, error } = readPlan(body, {}, currency)
    if (error) return NextResponse.json({ error }, { status: 400 })
    const doc = await models.Plan.create(plan)
    return NextResponse.json({ plan: planView(doc.toObject()) }, { status: 201 })
  } catch (e) { return fail(e, 'POST /api/igcsc/admin/plans') }
}
