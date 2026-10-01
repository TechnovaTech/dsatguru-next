import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN } from '../../../../../lib/igcscAuth'
import { StoreError, isOid, getStoreSettings, adminGrant } from '../../../../../lib/igcscStore'

// Sales, and handing out access without a sale.
//
//   GET  ?status&q&page&limit → { orders, total, page, pages, totals, currency }
//   POST { userId, paperId | planId | credits } → 201 { ok, orderId }
//
// Refunds and revokes are POST ./[id]. Admin only.
export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded']
const ORDER_FIELDS = 'userId userName userEmail kind title amount currency status createdAt paidAt refundedAt revokedAt grantedBy note'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const bad = (message) => NextResponse.json({ error: message }, { status: 400 })

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)
const int = (v, fallback) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}
const money = (n) => Math.round(Number(n || 0) * 100) / 100

function orderView(o) {
  return {
    _id: String(o._id),
    userId: String(o.userId || ''),
    userName: o.userName || '',
    userEmail: o.userEmail || '',
    kind: o.kind,
    title: o.title || '',
    amount: Number(o.amount || 0),
    currency: o.currency || 'usd',
    status: o.status,
    createdAt: o.createdAt || null,
    paidAt: o.paidAt || null,
    refundedAt: o.refundedAt || null,
    revokedAt: o.revokedAt || null,
    grantedBy: o.grantedBy || '',
    note: o.note || '',
  }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const sp = new URL(request.url).searchParams
    const page = Math.max(1, int(sp.get('page'), 1))
    const limit = Math.min(100, Math.max(1, int(sp.get('limit'), 50)))

    const search = {}
    const q = String(sp.get('q') || '').trim().slice(0, 100)
    if (q) {
      const rx = new RegExp(escapeRe(q), 'i')
      search.$or = [{ userName: rx }, { userEmail: rx }, { title: rx }]
    }
    const status = sp.get('status')
    const where = STATUSES.includes(status) ? { ...search, status } : search

    const models = await igcscModels()
    const { Order } = models
    const { currency } = await getStoreSettings(models)
    const sale = { $and: [{ $eq: ['$status', 'paid'] }, { $ne: ['$kind', 'grant'] }] }

    // Totals follow the search but not the status tab - they ARE the status
    // breakdown - and only count the store's current currency, since dollars
    // and pounds cannot be added up.
    const [orders, total, sums] = await Promise.all([
      Order.find(where).select(ORDER_FIELDS).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(where),
      Order.aggregate([
        { $match: { ...search, currency } },
        { $group: {
          _id: null,
          revenue: { $sum: { $cond: [sale, '$amount', 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
          paidCount: { $sum: { $cond: [sale, 1, 0] } },
        } },
      ]),
    ])

    const t = sums[0] || {}
    return NextResponse.json({
      orders: orders.map(orderView),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      totals: { revenue: money(t.revenue), refunded: money(t.refunded), paidCount: Number(t.paidCount || 0) },
      currency,
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/admin/orders') }
}

// Cash at the desk, a scholarship, a mistake to put right: recorded as a
// zero-amount order so it shows in the sales list with who gave it.
export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const id = (v) => (typeof v === 'string' ? v.trim() : '')
    const userId = id(body?.userId)
    const paperId = id(body?.paperId)
    const planId = id(body?.planId)
    // 0 or blank means "no credits"; anything else, even junk, counts as an
    // attempt to give some and is validated as such.
    const credits = body?.credits === undefined || body?.credits === null || body?.credits === '' ? 0 : num(body.credits)
    const givingCredits = credits !== 0

    if (!isOid(userId)) return bad('Choose a student.')
    if ([paperId, planId, givingCredits].filter(Boolean).length !== 1) {
      return bad('Choose one thing to give: a paper, a plan or a number of credits.')
    }
    if (paperId && !isOid(paperId)) return bad('Unknown paper.')
    if (planId && !isOid(planId)) return bad('Unknown plan.')
    if (givingCredits && (!Number.isInteger(credits) || credits < 1 || credits > 500)) {
      return bad('Give a whole number of credits from 1 to 500.')
    }

    const models = await igcscModels()
    // Staff open every paper already; a grant to them would only clutter sales.
    const person = await models.IgcscUser.findById(userId).select('role').lean()
    if (!person) return NextResponse.json({ error: 'That student no longer exists.' }, { status: 404 })
    if (person.role !== 'student') return bad('Papers, plans and credits can only be given to a student.')

    const r = await adminGrant(models, {
      decoded: auth.decoded,
      userId,
      paperId: paperId || undefined,
      planId: planId || undefined,
      credits: credits || undefined,
    })
    return NextResponse.json({ ok: true, orderId: r.orderId }, { status: 201 })
  } catch (e) { return fail(e, 'POST /api/igcsc/admin/orders') }
}
