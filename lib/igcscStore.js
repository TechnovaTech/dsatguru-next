// The IGCSC paper store, server side: who may open what, and how money turns
// into access.
//
// Three rules hold everything up:
//
//   1. The price always comes from the database, never from the browser.
//   2. An order is fulfilled exactly once. Fulfilment starts by atomically
//      claiming the order (fulfilledAt), and every grant is itself idempotent
//      (unique orderId / creditKey indexes, a creditsGrantedAt stamp), so the
//      return page, the reconcile pass and a webhook can all race safely.
//   3. Access is read from the database on every request. Tokens last seven
//      days; a purchase, a refund or an expiry has to count immediately.
//
// There is no Stripe webhook configured for this account (the DSAT side has
// none either). If the buyer closes the tab before Stripe sends them back, the
// payment would be taken and nothing granted - so every visit to the store
// reconciles that person's pending orders against Stripe. A webhook, if one is
// configured later, is a third path into the same fulfilment.
import mongoose from 'mongoose'
import { getStripe, toMinor } from './stripe'
import { coversPaper, priceProblem, CURRENCIES } from './igcscStoreShared'

export class StoreError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const oid = (v) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)))
const isOid = (v) => mongoose.Types.ObjectId.isValid(String(v || '')) && /^[a-f0-9]{24}$/i.test(String(v))
export { isOid }

export function meId(decoded) {
  return String(decoded?.userId || decoded?.id || '')
}

export function isStaffRole(role) {
  return role === 'admin' || role === 'tutor'
}

// Where Stripe should send the buyer back to. Behind nginx the request's own
// origin can come out as http://localhost:3000.
export function siteOrigin(request) {
  const configured = String(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || '')
  if (/^https?:\/\/[^/]+/.test(configured)) return configured.replace(/\/+$/, '').replace(/\/api$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return host ? `${proto}://${host}` : new URL(request.url).origin
}

export async function getStoreSettings({ StoreSettings }) {
  const doc = await StoreSettings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
  if (!CURRENCIES.includes(doc.currency)) doc.currency = 'usd'
  return doc
}

// ─────────────────────────────────────────────────────────────────────────────
// Access
// ─────────────────────────────────────────────────────────────────────────────

// Everything that decides what one person may open, loaded once per request.
export async function loadAccessContext({ Entitlement, PaperAssignment, IgcscUser }, userId) {
  const now = new Date()
  const uid = oid(userId)
  const [ents, assigns, user] = await Promise.all([
    Entitlement.find({ userId: uid, revokedAt: null, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).lean(),
    PaperAssignment.find({ studentId: uid, revokedAt: null }).lean(),
    IgcscUser.findById(uid).select('name email role credits isActive').lean(),
  ])
  const paperEnts = new Map()
  const accessEnts = []
  for (const e of ents) {
    if (e.type === 'paper' && e.paperId) paperEnts.set(String(e.paperId), e)
    else if (e.type === 'access') accessEnts.push(e)
  }
  return {
    user,
    credits: Number(user?.credits || 0),
    paperEnts,
    accessEnts,
    assignByPaper: new Map(assigns.map((a) => [String(a.paperId), a])),
  }
}

// May this person open this paper, and how did they get in?
//   { allowed, via: staff|assignment|purchase|credit|grant|plan|free|null, expiresAt?, assignment? }
export function accessFor(ctx, paper, role) {
  if (!paper) return { allowed: false, via: null }
  if (isStaffRole(role)) return { allowed: true, via: 'staff' }
  const pid = String(paper._id)
  const assignment = ctx.assignByPaper.get(pid)
  if (assignment) return { allowed: true, via: 'assignment', assignment }
  // A paper someone paid for stays theirs even if it is later taken off sale.
  const own = ctx.paperEnts.get(pid)
  if (own) return { allowed: true, via: own.source, expiresAt: own.expiresAt || null }
  const plan = ctx.accessEnts.find((e) => coversPaper(e, paper))
  if (plan) return { allowed: true, via: 'plan', expiresAt: plan.expiresAt || null, planName: plan.planName || '' }
  if (paper.isPublished && !paper.missingFromBank && Number(paper.price) === 0) return { allowed: true, via: 'free' }
  return { allowed: false, via: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fulfilment
// ─────────────────────────────────────────────────────────────────────────────

const dup = (e) => e?.code === 11000

async function grantPaper(models, order, source) {
  try {
    await models.Entitlement.create({
      userId: order.userId, type: 'paper', paperId: order.paperId, source,
      orderId: order._id, grantedBy: order.grantedBy || '',
    })
  } catch (e) {
    if (!dup(e)) throw e   // already granted for this order
  }
}

async function grantPlan(models, order, source) {
  const plan = order.planSnapshot || {}
  if (plan.kind === 'credits') {
    // One atomic write on the user: the credits and the record that this order
    // gave them. Retried, it matches nothing and adds nothing.
    await models.IgcscUser.updateOne(
      { _id: order.userId, creditOrders: { $ne: order._id } },
      { $inc: { credits: Math.max(0, Number(plan.credits || 0)) }, $push: { creditOrders: order._id } },
    )
    await models.Order.updateOne({ _id: order._id, creditsGrantedAt: null }, { $set: { creditsGrantedAt: new Date() } })
    return
  }
  const days = Number(plan.durationDays || 0)
  // Buying the same time-limited plan again extends it from where the current
  // one ends, rather than running a second copy alongside it.
  let start = Date.now()
  if (days && order.planId) {
    const current = await models.Entitlement.findOne({
      userId: order.userId, type: 'access', planId: order.planId, revokedAt: null, expiresAt: { $gt: new Date() },
      orderId: { $ne: order._id },
    }).sort({ expiresAt: -1 }).lean()
    if (current) start = new Date(current.expiresAt).getTime()
  }
  try {
    await models.Entitlement.create({
      userId: order.userId, type: 'access',
      scope: plan.scope || 'all', curriculum: plan.curriculum || '', subject: plan.subject || '',
      source, orderId: order._id, planId: order.planId, planName: plan.name || order.title || '',
      grantedBy: order.grantedBy || '',
      expiresAt: days ? new Date(start + days * 86400000) : null,
    })
  } catch (e) {
    if (!dup(e)) throw e
  }
}

// Turn a PAID order into access, exactly once.
export async function fulfilOrder(models, order) {
  const claimed = await models.Order.findOneAndUpdate(
    { _id: order._id, status: 'paid', fulfilledAt: null },
    { $set: { fulfilledAt: new Date() } },
    { new: true },
  ).lean()
  if (!claimed) return { fulfilled: false }
  const source = claimed.kind === 'grant' ? 'grant' : claimed.kind === 'paper' ? 'purchase' : 'plan'
  try {
    if (claimed.paperId) await grantPaper(models, claimed, source)
    else await grantPlan(models, claimed, source)
  } catch (e) {
    // Release the claim so the next pass can finish the job.
    await models.Order.updateOne({ _id: claimed._id }, { $set: { fulfilledAt: null } })
    throw e
  }
  return { fulfilled: true }
}

function planSnapshotOf(plan) {
  return {
    name: plan.name, kind: plan.kind, credits: plan.credits || 0, scope: plan.scope || 'all',
    curriculum: plan.curriculum || '', subject: plan.subject || '', durationDays: plan.durationDays || 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout
// ─────────────────────────────────────────────────────────────────────────────

// Start buying a paper or a plan. Returns { url } for Stripe, or { granted: true }
// when nothing needs paying.
export async function startCheckout(models, { decoded, paperId, planId, origin }) {
  const settings = await getStoreSettings(models)
  if (!settings.storeOpen) throw new StoreError(403, 'The store is closed right now.')
  const userId = meId(decoded)
  const user = await models.IgcscUser.findById(userId).select('name email role isActive').lean()
  if (!user || user.isActive === false) throw new StoreError(403, 'Your account cannot make purchases.')
  if (isStaffRole(user.role)) throw new StoreError(409, 'Staff accounts already open every paper.')

  // A payment whose return trip never happened must count before deciding
  // whether this person already has what they are about to pay for again.
  try { await reconcilePending(models, userId) } catch (e) { console.error('igcsc checkout reconcile:', e?.message) }

  let item
  if (paperId) {
    if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
    const paper = await models.Paper.findById(paperId).lean()
    if (!paper || !paper.isPublished || paper.missingFromBank) throw new StoreError(404, 'That paper is not on sale.')
    if (!((paper.mcqCount || 0) + (paper.writtenCount || 0))) throw new StoreError(409, 'This paper has no questions that can be marked yet.')
    const ctx = await loadAccessContext(models, userId)
    if (accessFor(ctx, paper, user.role).allowed) throw new StoreError(409, 'You already have this paper.')
    item = { kind: 'paper', paperId: paper._id, title: paper.title + (paper.unit ? ` — ${paper.unit}` : ''), amount: Number(paper.price || 0) }
  } else if (planId) {
    if (!isOid(planId)) throw new StoreError(400, 'Unknown plan.')
    const plan = await models.Plan.findById(planId).lean()
    if (!plan || !plan.isActive) throw new StoreError(404, 'That plan is not available.')
    if (plan.kind === 'access' && !Number(plan.durationDays)) {
      const held = await models.Entitlement.findOne({ userId: oid(userId), type: 'access', planId: plan._id, revokedAt: null, expiresAt: null }).lean()
      if (held) throw new StoreError(409, 'You already have this plan, and it never expires.')
    }
    item = { kind: 'plan', planId: plan._id, title: plan.name, amount: Number(plan.price || 0), planSnapshot: planSnapshotOf(plan) }
  } else {
    throw new StoreError(400, 'Choose a paper or a plan.')
  }

  const currency = settings.currency
  const problem = priceProblem(item.amount, currency)
  if (problem) throw new StoreError(409, 'This item has an invalid price. Please tell your centre.')

  // A checkout already open for the same item (a double click, a second tab,
  // a "back" from Stripe) is reused: two open sessions are two possible charges.
  if (item.amount > 0) {
    const open = await models.Order.findOne({
      userId: oid(userId), status: 'pending', kind: item.kind,
      ...(item.paperId ? { paperId: item.paperId } : { planId: item.planId }),
      amount: item.amount, currency, stripeSessionId: { $type: 'string' },
      createdAt: { $gt: new Date(Date.now() - 23 * 3600 * 1000) },
    }).sort({ createdAt: -1 }).lean()
    const stripe = getStripe()
    if (open && stripe) {
      try {
        const s = await stripe.checkout.sessions.retrieve(open.stripeSessionId)
        if (s.status === 'open' && s.url) return { url: s.url, orderId: String(open._id) }
      } catch { /* fall through to a fresh session */ }
    }
  }

  let order
  try {
    order = await models.Order.create({
      userId, userName: user.name, userEmail: user.email,
      kind: item.kind, paperId: item.paperId, planId: item.planId, title: item.title,
      amount: item.amount, currency, planSnapshot: item.planSnapshot, status: 'pending',
      // Free plans: one claim per person, for good.
      freeClaimKey: item.amount === 0 && item.planId ? `${userId}:${item.planId}` : undefined,
    })
  } catch (e) {
    if (e?.code === 11000) throw new StoreError(409, 'You have already claimed this free plan.')
    throw e
  }

  if (item.amount === 0) {
    // A free plan: no card, straight to fulfilment.
    await models.Order.updateOne({ _id: order._id }, { $set: { status: 'paid', paidAt: new Date() } })
    await fulfilOrder(models, { _id: order._id })
    return { granted: true, orderId: String(order._id) }
  }

  const stripe = getStripe()
  if (!stripe) throw new StoreError(503, 'Payments are not configured.')
  const metadata = { product: 'igcsc', orderId: String(order._id), userId: String(userId), kind: item.kind }
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: { currency, unit_amount: toMinor(item.amount), product_data: { name: item.title.slice(0, 250) } },
      }],
      customer_email: user.email || undefined,
      client_reference_id: String(order._id),
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/igcsc/store/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/igcsc/store?cancelled=1`,
    })
  } catch (e) {
    await models.Order.updateOne({ _id: order._id }, { $set: { status: 'failed', note: String(e?.message || '').slice(0, 300) } })
    throw new StoreError(502, 'Could not start the payment. Please try again.')
  }
  await models.Order.updateOne({ _id: order._id }, { $set: { stripeSessionId: session.id } })
  return { url: session.url, orderId: String(order._id) }
}

// Check a Checkout Session with Stripe and fulfil its order if it was paid.
// `userId` restricts it to the buyer (the return page); a webhook passes none.
export async function confirmSession(models, sessionId, { userId } = {}) {
  const stripe = getStripe()
  if (!stripe) throw new StoreError(503, 'Payments are not configured.')
  if (!/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) throw new StoreError(400, 'Unknown payment.')

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (e) {
    if (e?.code === 'resource_missing' || e?.statusCode === 404) throw new StoreError(404, 'Unknown payment.')
    throw e
  }
  if (session?.metadata?.product !== 'igcsc' || !isOid(session?.metadata?.orderId)) {
    throw new StoreError(404, 'That payment is not for this store.')
  }
  const order = await models.Order.findById(session.metadata.orderId).lean()
  if (!order) throw new StoreError(404, 'Order not found.')
  if (userId && String(order.userId) !== String(userId)) throw new StoreError(403, 'That order belongs to someone else.')
  if (order.stripeSessionId && order.stripeSessionId !== session.id) throw new StoreError(409, 'That payment does not match the order.')

  await models.Order.updateOne({ _id: order._id }, { $set: { lastCheckedAt: new Date() } })

  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
  if (!paid) {
    if (session.status === 'expired' && order.status === 'pending') {
      await models.Order.updateOne({ _id: order._id, status: 'pending' }, { $set: { status: 'cancelled' } })
    }
    return { order: { ...order, status: session.status === 'expired' ? 'cancelled' : order.status }, paid: false }
  }

  // Paid - but for the right amount? A changed price must not hand out access
  // for less than it costs.
  // With Stripe Adaptive Pricing the buyer may pay in their own currency; the
  // amount we priced is then under currency_conversion, in our currency.
  const expected = toMinor(order.amount)
  const conv = session.currency_conversion
  const paidAmount = conv?.source_currency ? Number(conv.amount_total) : Number(session.amount_total)
  const paidCurrency = conv?.source_currency ? String(conv.source_currency) : String(session.currency)
  if (paidAmount !== expected || paidCurrency !== String(order.currency)) {
    await models.Order.updateOne({ _id: order._id }, { $set: { note: `amount mismatch: got ${paidAmount} ${paidCurrency}` } })
    throw new StoreError(409, 'The amount paid does not match this order. Please contact your centre.')
  }

  if (order.status === 'pending' || order.status === 'failed' || order.status === 'cancelled') {
    await models.Order.updateOne(
      { _id: order._id, status: { $in: ['pending', 'failed', 'cancelled'] } },
      { $set: { status: 'paid', paidAt: new Date(), stripePaymentIntent: String(session.payment_intent || '') } },
    )
  }
  const fresh = await models.Order.findById(order._id).lean()
  if (fresh.status === 'paid') await fulfilOrder(models, fresh)
  const final = await models.Order.findById(order._id).lean()
  // A stale return link for an order since refunded must not read as success.
  return { order: final, paid: final.status === 'paid' && !final.revokedAt }
}

// Finish any of this person's payments that went through while their browser
// did not come back. Cheap: at most a few recent pending orders, each checked
// at most every 20 seconds.
export async function reconcilePending(models, userId) {
  // A paid order whose fulfilment failed part-way (the claim was released) is
  // finished here, whatever the Stripe state - it is already known to be paid.
  const unfinished = await models.Order.find({ userId: oid(userId), status: 'paid', fulfilledAt: null, revokedAt: null })
    .limit(10).lean()
  for (const o of unfinished) {
    try { await fulfilOrder(models, o) } catch (e) { console.error('igcsc refulfil failed for order', String(o._id), e?.message) }
  }
  if (!getStripe()) return 0
  // Checkout sessions live 24 hours; a week covers a buyer who comes back late.
  const since = new Date(Date.now() - 7 * 86400000)
  const stale = new Date(Date.now() - 20000)
  const pending = await models.Order.find({
    userId: oid(userId), status: 'pending', stripeSessionId: { $type: 'string' }, createdAt: { $gt: since },
    $or: [{ lastCheckedAt: null }, { lastCheckedAt: { $lt: stale } }],
  }).sort({ createdAt: -1 }).limit(10).lean()
  let done = unfinished.length
  for (const o of pending) {
    try {
      const r = await confirmSession(models, o.stripeSessionId, { userId })
      if (r.paid) done += 1
    } catch (e) {
      console.error('igcsc reconcile failed for order', String(o._id), e?.message)
    }
  }
  return done
}

// A Stripe webhook event, if a webhook is ever configured.
export async function handleStripeEvent(models, event) {
  const types = ['checkout.session.completed', 'checkout.session.async_payment_succeeded']
  if (!types.includes(event?.type)) return { ignored: true }
  const session = event.data?.object
  if (session?.metadata?.product !== 'igcsc') return { ignored: true }
  const r = await confirmSession(models, session.id)
  return { ok: true, paid: r.paid }
}

// ─────────────────────────────────────────────────────────────────────────────
// Credits
// ─────────────────────────────────────────────────────────────────────────────

// Spend one credit on one paper. The unique creditKey index is the guard: the
// entitlement is written first, and only a write that actually lands is paid
// for. A double click, or two tabs, can never spend two credits on one paper.
export async function redeemCredit(models, { decoded, paperId }) {
  const userId = meId(decoded)
  if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
  const paper = await models.Paper.findById(paperId).lean()
  if (!paper || !paper.isPublished || paper.missingFromBank) throw new StoreError(404, 'That paper is not available.')
  if (!((paper.mcqCount || 0) + (paper.writtenCount || 0))) throw new StoreError(409, 'This paper has no questions that can be marked yet.')
  const ctx = await loadAccessContext(models, userId)
  if (accessFor(ctx, paper, decoded.role).allowed) throw new StoreError(409, 'You already have this paper.')
  if (ctx.credits < 1) throw new StoreError(402, 'You have no credits left. Buy a pack to unlock more papers.')

  const creditKey = `${userId}:${paperId}`
  let ent
  try {
    ent = await models.Entitlement.create({ userId, type: 'paper', paperId: paper._id, source: 'credit', creditKey })
  } catch (e) {
    if (dup(e)) throw new StoreError(409, 'You already unlocked this paper.')
    throw e
  }
  const spent = await models.IgcscUser.updateOne({ _id: oid(userId), credits: { $gte: 1 } }, { $inc: { credits: -1 } })
  if (spent.modifiedCount !== 1) {
    await models.Entitlement.deleteOne({ _id: ent._id })
    throw new StoreError(402, 'You have no credits left. Buy a pack to unlock more papers.')
  }
  const after = await models.IgcscUser.findById(userId).select('credits').lean()
  return { ok: true, credits: Number(after?.credits || 0) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: grants and refunds
// ─────────────────────────────────────────────────────────────────────────────

// Give someone a paper, a plan, or credits without payment (cash at the desk,
// a scholarship, a mistake to put right). Recorded as a zero-amount order so
// it shows in the sales list with who granted it.
export async function adminGrant(models, { decoded, userId, paperId, planId, credits }) {
  if (!isOid(userId)) throw new StoreError(400, 'Choose a student.')
  const user = await models.IgcscUser.findById(userId).select('name email').lean()
  if (!user) throw new StoreError(404, 'That student no longer exists.')
  const by = decoded?.name || decoded?.email || 'admin'
  let item
  if (paperId) {
    if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
    const paper = await models.Paper.findById(paperId).lean()
    if (!paper) throw new StoreError(404, 'Unknown paper.')
    item = { paperId: paper._id, title: paper.title }
  } else if (planId) {
    if (!isOid(planId)) throw new StoreError(400, 'Unknown plan.')
    const plan = await models.Plan.findById(planId).lean()
    if (!plan) throw new StoreError(404, 'Unknown plan.')
    item = { planId: plan._id, title: plan.name, planSnapshot: planSnapshotOf(plan) }
  } else if (Number(credits) >= 1) {
    const n = Math.min(500, Math.floor(Number(credits)))
    item = { title: `${n} credit${n > 1 ? 's' : ''}`, planSnapshot: { name: `${n} credits`, kind: 'credits', credits: n } }
  } else {
    throw new StoreError(400, 'Choose a paper, a plan or a number of credits.')
  }
  const order = await models.Order.create({
    userId: user._id, userName: user.name, userEmail: user.email, kind: 'grant',
    ...item, amount: 0, currency: (await getStoreSettings(models)).currency,
    status: 'paid', paidAt: new Date(), grantedBy: by,
  })
  await fulfilOrder(models, order)
  return { ok: true, orderId: String(order._id) }
}

// Refund on Stripe (when there was a charge) and take back what it bought.
// `revokeOnly` takes the access back without moving money.
export async function refundOrder(models, { decoded, orderId, revokeOnly = false }) {
  if (!isOid(orderId)) throw new StoreError(400, 'Unknown order.')
  const before = await models.Order.findById(orderId).lean()
  if (!before) throw new StoreError(404, 'Unknown order.')
  if (before.status !== 'paid') throw new StoreError(409, 'Only a paid order can be refunded.')
  if (!revokeOnly && Number(before.amount) > 0 && !before.stripePaymentIntent) {
    throw new StoreError(409, 'This order has no card payment to refund.')
  }

  // Claim the order before touching money or access, so two clicks (or two
  // admins) act once. A refund claims refundedAt; a revoke claims revokedAt.
  const now = new Date()
  const claimField = revokeOnly ? 'revokedAt' : 'refundedAt'
  const abandoned = new Date(now.getTime() - 5 * 60 * 1000)
  const order = await models.Order.findOneAndUpdate(
    {
      _id: before._id, status: 'paid',
      $or: revokeOnly ? [{ revokedAt: null }] : [{ refundedAt: null }, { refundedAt: { $lt: abandoned } }],
    },
    { $set: { [claimField]: now } },
    { new: false },
  ).lean()
  if (!order) throw new StoreError(409, revokeOnly ? 'Access for this order was already taken back.' : 'This order is already being refunded.')

  if (!revokeOnly && Number(order.amount) > 0) {
    try {
      await getStripe().refunds.create({ payment_intent: order.stripePaymentIntent })
    } catch (e) {
      // Refunded by an earlier attempt that died before finishing here: carry on.
      if (e?.code !== 'charge_already_refunded') {
        await models.Order.updateOne({ _id: order._id }, { $set: { refundedAt: null } })
        throw new StoreError(502, `Stripe refused the refund: ${e?.message || 'unknown error'}`)
      }
    }
  }

  const by = decoded?.name || decoded?.email || 'admin'
  await models.Entitlement.updateMany(
    { orderId: order._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: revokeOnly ? `revoked by ${by}` : `refunded by ${by}` } },
  )
  // Credits already spent cannot be clawed back from papers already opened;
  // take back whatever of the pack is still unspent - once per order (a revoke
  // followed by a refund must not take a second pack's worth), and in one
  // atomic step that can never drive the balance below zero.
  if (order.planSnapshot?.kind === 'credits' && !order.revokedAt) {
    const n = Math.max(0, Number(order.planSnapshot.credits || 0))
    // Matched only while this order's credits are still recorded on the user,
    // and un-recorded in the same write: it happens once, and never below zero.
    await models.IgcscUser.updateOne(
      { _id: order.userId, creditOrders: order._id },
      [{
        $set: {
          credits: { $max: [0, { $subtract: [{ $ifNull: ['$credits', 0] }, n] }] },
          creditOrders: { $filter: { input: '$creditOrders', cond: { $ne: ['$$this', order._id] } } },
        },
      }],
    )
  }
  // Revoking keeps the order "paid" - it was paid - so revenue figures stay true.
  await models.Order.updateOne(
    { _id: order._id },
    revokeOnly
      ? { $set: { note: `access revoked by ${by}` } }
      // A refund also takes the access back, so it counts as revoked too.
      : { $set: { status: 'refunded', revokedAt: order.revokedAt || now, note: `refunded by ${by}` } },
  )
  return { ok: true }
}
