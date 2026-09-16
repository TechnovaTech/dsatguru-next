import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF, IGCSC_ADMIN } from '../../../../lib/igcscAuth'

// GET /api/igcsc/questions
//   ?subject=&stream=&topic=&difficulty=&isMCQ=&q=&limit=&skip=&facets=1
// Staff-only. Answers are always included (this is the staff-facing bank browser).
export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const { Question } = await igcscModels()
    const sp = new URL(request.url).searchParams
    const filter = { isActive: { $ne: false } }
    for (const k of ['curriculum', 'course', 'subject', 'stream', 'topic', 'subtopic', 'difficulty']) {
      const v = sp.get(k)
      if (v) filter[k] = v
    }
    if (sp.get('isMCQ') === 'true') filter.isMCQ = true
    if (sp.get('isMCQ') === 'false') filter.isMCQ = { $ne: true }
    const term = (sp.get('q') || '').trim()
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ questionText: rx }, { topic: rx }, { subtopic: rx }, { sourceId: rx }]
    }
    const limit = Math.min(Number(sp.get('limit')) || 50, 200)
    const skip = Math.max(Number(sp.get('skip')) || 0, 0)
    const [items, total] = await Promise.all([
      // sourceFolder + order (not sourceId/topic) reproduce PDF/export appearance
      // order — see the schema comment on those fields for why.
      Question.find(filter).sort({ curriculum: 1, subject: 1, course: 1, sourceFolder: 1, order: 1 }).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ])
    const payload = { total, skip, limit, items: items.map((q) => ({ ...q, _id: q._id.toString() })) }
    // Facets power the browser's filter dropdowns without a second round-trip.
    if (sp.get('facets')) {
      // Facets narrow with the current selection so the dropdowns stay usable
      // across a 40k-question, multi-curriculum bank.
      const scope = {}
      if (filter.curriculum) scope.curriculum = filter.curriculum
      if (filter.subject) scope.subject = filter.subject
      const [currs, subjects, courses, topics, diffs] = await Promise.all([
        Question.distinct('curriculum', { isActive: { $ne: false } }),
        Question.distinct('subject', filter.curriculum ? { curriculum: filter.curriculum } : {}),
        Question.distinct('course', scope),
        Question.distinct('topic', scope),
        Question.distinct('difficulty', { isActive: { $ne: false } }),
      ])
      payload.facets = {
        curricula: currs.filter(Boolean).sort(),
        subjects: subjects.filter(Boolean).sort(),
        courses: courses.filter(Boolean).sort(),
        topics: topics.filter(Boolean).sort().slice(0, 400),
        difficulties: diffs.filter(Boolean).sort(),
      }
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error('GET /api/igcsc/questions failed:', e?.message)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

// POST /api/igcsc/questions — bulk import (admin only).
// Body: { questions: [...] }. Idempotent on sourceId so re-running an import
// updates rather than duplicating.
export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json()
    const list = Array.isArray(body?.questions) ? body.questions : []
    if (!list.length) return NextResponse.json({ error: 'questions[] is required' }, { status: 400 })
    const { Question } = await igcscModels()
    const ops = list.map((q) => ({
      updateOne: {
        filter: { sourceId: String(q.sourceId) },
        update: {
          $set: {
            sourceId: String(q.sourceId),
            subject: q.subject || '', stream: q.stream || '',
            topic: q.topic || '', subtopic: q.subtopic || '', topicPath: q.topicPath || [],
            sourceFolder: q.sourceFolder || '', order: Number(q.order) || 0,
            difficulty: q.difficulty || '', isMCQ: !!q.isMCQ,
            questionText: q.questionText || '',
            options: q.options || { A: '', B: '', C: '', D: '', E: '' },
            correctAnswer: q.correctAnswer || '', answerText: q.answerText || '',
            marks: Number(q.marks) || 0, hasFigure: !!q.hasFigure,
            questionImage: q.questionImage || '', answerImage: q.answerImage || '',
            tags: q.tags || [], isActive: true,
          },
        },
        upsert: true,
      },
    }))
    const res = await Question.bulkWrite(ops, { ordered: false })
    return NextResponse.json({
      inserted: res.upsertedCount || 0,
      updated: res.modifiedCount || 0,
      total: await Question.countDocuments({ isActive: { $ne: false } }),
    }, { status: 201 })
  } catch (e) {
    console.error('POST /api/igcsc/questions failed:', e?.message)
    return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 })
  }
}
