import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'

// GET /api/igcsc/exam-papers — powers the printable Exam Paper flow.
// Papers are the bank's real source groupings: one `sourceFolder` (one exported
// worksheet/paper page) = one printable paper, in original PDF order.
//   ?mode=subjects                        → curriculum·subject boxes with counts
//   ?mode=papers&curriculum=&subject=     → the papers of one subject
//   ?mode=paper&curriculum=&subject=&folder= → the questions of one paper
export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const { Question } = await igcscModels()
    const sp = new URL(request.url).searchParams
    const mode = sp.get('mode') || 'subjects'
    const active = { isActive: { $ne: false } }

    if (mode === 'subjects') {
      const rows = await Question.aggregate([
        { $match: active },
        { $group: {
          _id: { curriculum: '$curriculum', subject: '$subject' },
          questions: { $sum: 1 },
          // Normalize a missing folder to '' so legacy rows count as one paper
          // instead of vanishing from the count.
          folders: { $addToSet: { $ifNull: ['$sourceFolder', ''] } },
        } },
        { $project: { _id: 0, curriculum: '$_id.curriculum', subject: '$_id.subject', questions: 1, papers: { $size: '$folders' } } },
        { $sort: { curriculum: 1, subject: 1 } },
      ])
      return NextResponse.json({ subjects: rows.filter((r) => r.curriculum && r.subject) })
    }

    const curriculum = sp.get('curriculum') || ''
    const subject = sp.get('subject') || ''
    if (!curriculum || !subject) {
      return NextResponse.json({ error: 'curriculum and subject are required' }, { status: 400 })
    }

    if (mode === 'papers') {
      const rows = await Question.aggregate([
        { $match: { ...active, curriculum, subject } },
        { $group: {
          // Missing and '' sourceFolder are the same legacy bucket.
          _id: { $ifNull: ['$sourceFolder', ''] },
          count: { $sum: 1 },
          course: { $first: '$course' },
          topic: { $first: '$topic' },
          subtopic: { $first: '$subtopic' },
          mcq: { $sum: { $cond: ['$isMCQ', 1, 0] } },
          marks: { $sum: { $ifNull: ['$marks', 0] } },
        } },
        { $sort: { course: 1, _id: 1 } },
      ])
      const papers = rows.map((r, i) => ({
        n: i + 1,
        folder: r._id || '',
        course: r.course || '',
        topic: r.topic || '',
        subtopic: r.subtopic || '',
        count: r.count,
        mcq: r.mcq,
        marks: r.marks,
      }))
      return NextResponse.json({ curriculum, subject, papers })
    }

    if (mode === 'paper') {
      const folder = sp.get('folder')
      if (folder == null) return NextResponse.json({ error: 'folder is required' }, { status: 400 })
      // '' also matches rows where the field is missing — the same legacy bucket
      // the papers aggregation groups under ''.
      const folderMatch = folder === '' ? { $in: ['', null] } : folder
      const items = await Question.find({ ...active, curriculum, subject, sourceFolder: folderMatch })
        .sort({ order: 1, _id: 1 })
        .limit(400)
        .select('questionText options correctAnswer answerText marks isMCQ hasFigure questionImage topic subtopic course order')
        .lean()
      return NextResponse.json({
        curriculum, subject, folder,
        items: items.map((q) => ({ ...q, _id: q._id.toString() })),
      })
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  } catch (e) {
    console.error('GET /api/igcsc/exam-papers failed:', e?.message)
    return NextResponse.json({ error: 'Failed to load exam papers' }, { status: 500 })
  }
}
