import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF, IGCSC_ADMIN } from '../../../../../lib/igcscAuth'
import { StoreError, isOid, getStoreSettings } from '../../../../../lib/igcscStore'
import { priceProblem } from '../../../../../lib/igcscStoreShared'
import { syncPapers } from '../../../../../lib/igcscPapers'
import { settingsView } from '../store-settings/route'

// The paper catalogue as staff manage it.
//
//   GET   ?curriculum&subject&q&status&format&page&limit   (staff; tutors read only)
//   POST  { action: 'sync' }                               (admin) rebuild from the bank
//   PATCH { ids | filter, set: { price?, isPublished? } }  (admin) bulk price / publish
//
// GET and a filter-mode PATCH share one filter builder, so "apply to all N
// matching" changes exactly the papers the list was showing.
export const dynamic = 'force-dynamic'

const STATUSES = ['all', 'published', 'unpublished', 'held', 'missing']
const MAX_IDS = 5000

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const bad = (message) => NextResponse.json({ error: message }, { status: 400 })

const text = (v, max = 120) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '')
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)
const int = (v, fallback) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

// { curriculum, subject, q, status, format } -> a Paper query. Every value is
// compared against a fixed list or turned into a plain string first, so a body
// can never smuggle a Mongo operator in.
function paperFilter(input) {
  const src = input && typeof input === 'object' ? input : {}
  const where = {}
  const curriculum = text(src.curriculum)
  const subject = text(src.subject)
  if (curriculum) where.curriculum = curriculum
  if (subject) where.subject = subject

  // Papers whose folder left the bank stay out of sight unless asked for:
  // people may own them, but nobody manages them day to day.
  const status = STATUSES.includes(src.status) ? src.status : ''
  if (status === 'missing') where.missingFromBank = true
  else if (status !== 'all') where.missingFromBank = { $ne: true }
  if (status === 'published') where.isPublished = true
  else if (status === 'unpublished') where.isPublished = { $ne: true }
  else if (status === 'held') where.clean = { $ne: true }

  if (src.format === 'mcq') Object.assign(where, { mcqCount: { $gt: 0 }, writtenCount: 0 })
  else if (src.format === 'written') Object.assign(where, { writtenCount: { $gt: 0 }, mcqCount: 0 })
  else if (src.format === 'mixed') Object.assign(where, { mcqCount: { $gt: 0 }, writtenCount: { $gt: 0 } })

  const q = text(src.q, 100)
  if (q) {
    const rx = new RegExp(escapeRe(q), 'i')
    where.$or = [{ title: rx }, { unit: rx }, { topic: rx }, { subtopic: rx }]
  }
  return where
}

// [{ curriculum, subjects: [{ subject, papers, published }] }] over every paper
// still in the bank - the filter dropdowns, so they never depend on the page.
async function paperFacets(Paper) {
  const rows = await Paper.aggregate([
    { $match: { missingFromBank: { $ne: true } } },
    { $group: {
      _id: { curriculum: '$curriculum', subject: '$subject' },
      papers: { $sum: 1 },
      published: { $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] } },
    } },
    { $sort: { '_id.curriculum': 1, '_id.subject': 1 } },
  ])
  const byCurriculum = new Map()
  for (const r of rows) {
    const { curriculum, subject } = r._id || {}
    if (!curriculum || !subject) continue
    if (!byCurriculum.has(curriculum)) byCurriculum.set(curriculum, [])
    byCurriculum.get(curriculum).push({ subject, papers: r.papers, published: r.published })
  }
  return [...byCurriculum].map(([curriculum, subjects]) => ({ curriculum, subjects }))
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const sp = new URL(request.url).searchParams
    const page = Math.max(1, int(sp.get('page'), 1))
    const limit = Math.min(100, Math.max(1, int(sp.get('limit'), 50)))
    const where = paperFilter({
      curriculum: sp.get('curriculum'),
      subject: sp.get('subject'),
      q: sp.get('q'),
      status: sp.get('status'),
      format: sp.get('format'),
    })

    const models = await igcscModels()
    const { Paper } = models
    const [papers, total, facets, settings] = await Promise.all([
      Paper.find(where)
        .select('-key')
        .sort({ curriculum: 1, subject: 1, paperNo: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Paper.countDocuments(where),
      paperFacets(Paper),
      getStoreSettings(models),
    ])

    return NextResponse.json({
      papers: papers.map((p) => ({ ...p, _id: String(p._id) })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      facets,
      settings: settingsView(settings),
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/admin/papers') }
}

// One sync at a time in this process: two at once would number the same new
// folders twice and one of them would die on the unique key.
let syncRunning = false

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    if (body?.action !== 'sync') return bad('Unknown action.')
    if (syncRunning) {
      return NextResponse.json({ error: 'A sync is already running. Give it a minute.' }, { status: 409 })
    }
    syncRunning = true
    try {
      const models = await igcscModels()
      const settings = await getStoreSettings(models)
      const summary = await syncPapers(models, { defaultPrice: settings.defaultPaperPrice })
      await models.StoreSettings.updateOne(
        { key: 'global' },
        { $set: { lastSyncAt: new Date(), lastSyncSummary: summary } },
      )
      return NextResponse.json({ summary })
    } finally {
      syncRunning = false
    }
  } catch (e) { return fail(e, 'POST /api/igcsc/admin/papers') }
}

export async function PATCH(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))

    const hasIds = Array.isArray(body?.ids)
    const hasFilter = !!body?.filter && typeof body.filter === 'object' && !Array.isArray(body.filter)
    if (hasIds === hasFilter) return bad('Send either a list of papers or a filter - exactly one of them.')

    let base
    if (hasIds) {
      if (body.ids.length > MAX_IDS) return bad(`At most ${MAX_IDS} papers at a time.`)
      const ids = [...new Set(body.ids.map((v) => (typeof v === 'string' ? v : '')))]
      if (!ids.length) return bad('Choose at least one paper.')
      if (!ids.every((id) => isOid(id))) return bad('Unknown paper.')
      base = { _id: { $in: ids } }
    } else {
      base = paperFilter(body.filter)
    }

    const set = body?.set && typeof body.set === 'object' && !Array.isArray(body.set) ? body.set : {}
    const hasPrice = set.price !== undefined
    const hasPublish = set.isPublished !== undefined
    if (!hasPrice && !hasPublish) return bad('Nothing to change.')
    if (hasPublish && typeof set.isPublished !== 'boolean') return bad('isPublished must be true or false.')

    const models = await igcscModels()
    const changes = {}
    if (hasPrice) {
      const { currency } = await getStoreSettings(models)
      const price = num(set.price)
      const problem = priceProblem(price, currency)
      if (problem) return bad(problem)
      // Marked as the admin's call, so the next sync leaves it alone.
      Object.assign(changes, { price, priceSetManually: true })
    }
    if (hasPublish) Object.assign(changes, { isPublished: set.isPublished, publishedManually: true })

    // No updatedAt bump, so `modified` counts papers that really changed rather
    // than every paper matched. (Every sync rewrites updatedAt anyway.)
    let matched = 0
    let modified = 0
    const apply = async (where, $set) => {
      const r = await models.Paper.updateMany(where, { $set }, { timestamps: false })
      matched += r.matchedCount || 0
      modified += r.modifiedCount || 0
    }

    if (changes.isPublished === true) {
      // A paper gone from the bank, or one with not a single question that can
      // be marked (every MCQ keyless), has nothing to sit - it is never put on
      // sale, or a student would pay for a test they cannot start. The two
      // halves are disjoint, so the counts simply add up.
      const sittable = { missingFromBank: { $ne: true }, $or: [{ mcqCount: { $gt: 0 } }, { writtenCount: { $gt: 0 } }] }
      await apply({ $and: [base, sittable] }, changes)
      if (hasPrice) {
        await apply({ $and: [base, { $nor: [sittable] }] }, { price: changes.price, priceSetManually: true })
      }
    } else {
      await apply(base, changes)
    }

    return NextResponse.json({ matched, modified })
  } catch (e) { return fail(e, 'PATCH /api/igcsc/admin/papers') }
}
