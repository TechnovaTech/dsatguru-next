import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import {
  StoreError, meId, isOid, isStaffRole, getStoreSettings, loadAccessContext, accessFor,
} from '../../../../../lib/igcscStore'

export const dynamic = 'force-dynamic'

// GET /api/igcsc/store/catalog - the papers a signed-in person can browse.
//   ?curriculum=&subject=&q=&difficulty=&format=mcq|written|mixed&owned=1&page=&limit=
//
// Students see what is on sale plus anything they already hold (a paper they
// bought stays theirs after it comes off sale); staff see every paper still in
// the bank. Filtering and paging happen in Mongo - there are thousands.

// Never key or sourceFolder: those say where the questions live in the bank.
const CARD_FIELDS =
  'title unit curriculum subject paperNo difficulty questionCount mcqCount writtenCount totalMarks durationMin mcqDurationMin price isPublished missingFromBank'

// A fresh object each time: mongoose casts filters in place.
const onSale = (extra = {}) => ({ isPublished: true, missingFromBank: { $ne: true }, ...extra })

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

function callerId(decoded) {
  const id = meId(decoded)
  if (!isOid(id)) throw new StoreError(401, 'Please sign in again.')
  return id
}

function toCard(paper, ctx, role) {
  const a = accessFor(ctx, paper, role)
  return {
    _id: String(paper._id),
    title: paper.title || '',
    unit: paper.unit || '',
    curriculum: paper.curriculum || '',
    subject: paper.subject || '',
    paperNo: paper.paperNo ?? null,
    difficulty: paper.difficulty || '',
    questionCount: paper.questionCount || 0,
    mcqCount: paper.mcqCount || 0,
    writtenCount: paper.writtenCount || 0,
    totalMarks: paper.totalMarks || 0,
    durationMin: paper.durationMin || 0,
    mcqDurationMin: paper.mcqDurationMin || 0,
    price: Number(paper.price || 0),
    isPublished: !!paper.isPublished,
    access: { allowed: !!a.allowed, via: a.via || null, expiresAt: a.expiresAt || null },
  }
}

// "Papers I can open" as one $or - the same rules as accessFor(), so a page of
// results never has to be filtered again in JS (which would break the paging).
function ownedFilter(ctx, heldIds) {
  const or = [{ _id: { $in: heldIds } }, onSale({ price: 0 })]
  for (const e of ctx.accessEnts) {
    if (e.scope === 'all') or.push(onSale())
    else if (e.scope === 'curriculum') or.push(onSale({ curriculum: e.curriculum || '' }))
    else if (e.scope === 'subject') or.push(onSale({ curriculum: e.curriculum || '', subject: e.subject || '' }))
  }
  return { $or: or }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const role = auth.decoded.role
    const userId = callerId(auth.decoded)
    const models = await igcscModels()
    const { Paper } = models

    const sp = new URL(request.url).searchParams
    const str = (k, max = 120) => String(sp.get(k) || '').trim().slice(0, max)
    const page = Math.min(5000, Math.max(1, Math.floor(Number(sp.get('page')) || 1)))
    const limit = Math.min(60, Math.max(1, Math.floor(Number(sp.get('limit')) || 24)))

    const staff = isStaffRole(role)
    const [settings, ctx] = await Promise.all([getStoreSettings(models), loadAccessContext(models, userId)])
    const heldIds = [...new Set([...ctx.paperEnts.keys(), ...ctx.assignByPaper.keys()])]

    const and = [
      staff ? { missingFromBank: { $ne: true } } : { $or: [onSale(), { _id: { $in: heldIds } }] },
    ]
    // Staff can open everything they can see, so "only mine" changes nothing for them.
    if (sp.get('owned') === '1' && !staff) and.push(ownedFilter(ctx, heldIds))

    const curriculum = str('curriculum')
    const subject = str('subject')
    const difficulty = str('difficulty', 40)
    if (curriculum) and.push({ curriculum })
    if (subject) and.push({ subject })
    if (difficulty) and.push({ difficulty })

    const format = str('format', 10)
    if (format === 'mcq') and.push({ mcqCount: { $gt: 0 }, writtenCount: 0 })
    else if (format === 'written') and.push({ writtenCount: { $gt: 0 }, mcqCount: 0 })
    else if (format === 'mixed') and.push({ mcqCount: { $gt: 0 }, writtenCount: { $gt: 0 } })

    const q = str('q', 100)
    if (q) {
      const rx = new RegExp(escapeRx(q), 'i')
      and.push({ $or: [{ title: rx }, { unit: rx }, { topic: rx }] })
    }

    const filter = { $and: and }
    const [total, rows, facetRows] = await Promise.all([
      Paper.countDocuments(filter),
      Paper.find(filter)
        .sort({ curriculum: 1, subject: 1, paperNo: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(CARD_FIELDS)
        .lean(),
      Paper.aggregate([
        { $match: onSale() },
        { $group: { _id: { curriculum: '$curriculum', subject: '$subject' }, papers: { $sum: 1 } } },
        { $sort: { '_id.curriculum': 1, '_id.subject': 1 } },
      ]),
    ])

    // Rows arrive sorted by curriculum, so each curriculum's subjects are adjacent.
    const facets = []
    for (const r of facetRows) {
      const c = r._id?.curriculum
      const s = r._id?.subject
      if (!c || !s) continue
      let f = facets[facets.length - 1]
      if (!f || f.curriculum !== c) {
        f = { curriculum: c, subjects: [] }
        facets.push(f)
      }
      f.subjects.push({ subject: s, papers: r.papers })
    }

    return NextResponse.json({
      papers: rows.map((p) => toCard(p, ctx, role)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      currency: settings.currency,
      credits: ctx.credits,
      facets,
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/store/catalog') }
}
