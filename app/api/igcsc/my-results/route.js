import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../lib/igcscAuth'

// A student's own attempts and the analysis built from them.
//   GET            → summary + every attempt
//   GET ?id=<sid>  → one attempt in full, with its per-question rows
//
// Scoped to the caller: a student can only ever read their own work.
export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const me = auth.decoded
    const myId = String(me.userId || me.id || '')
    const { Session } = await igcscModels()

    const id = new URL(request.url).searchParams.get('id')
    if (id) {
      const s = await Session.findById(id).lean()
      if (!s) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      if (String(s.studentId) !== myId) {
        return NextResponse.json({ error: 'This attempt is not yours.' }, { status: 403 })
      }
      return NextResponse.json({ session: { ...s, _id: s._id.toString() } })
    }

    const sessions = await Session.find({ studentId: myId, state: 'COMPLETED' })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(200)
      .lean()

    // Rows the shared SAT/mistake analysis understands. The IGCSC bank uses
    // topic/subtopic where the DSAT side uses domain/skill.
    const rows = []
    let correct = 0, total = 0
    for (const s of sessions) {
      for (const r of (s.responses || [])) {
        total += 1
        if (r.isCorrect) correct += 1
        rows.push({
          subject: r.subject || s.subject || '',
          domain: r.topic || '',
          skill: r.subtopic || r.topic || '',
          isCorrect: !!r.isCorrect,
          answered: !!(r.selectedAnswer && String(r.selectedAnswer).trim()),
          timeSpent: r.timeSpent || 0,
          difficulty: r.difficulty || '',
        })
      }
    }

    // Accuracy per topic — the practical unit a student revises.
    const byTopic = new Map()
    for (const r of rows) {
      const key = r.domain || 'General'
      const e = byTopic.get(key) || { topic: key, subject: r.subject, seen: 0, correct: 0 }
      e.seen += 1
      if (r.isCorrect) e.correct += 1
      byTopic.set(key, e)
    }
    const topics = [...byTopic.values()]
      .map((t) => ({ ...t, accuracy: t.seen ? Math.round((t.correct / t.seen) * 100) : null }))
      .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))

    return NextResponse.json({
      summary: {
        attempts: sessions.length,
        questions: total,
        correct,
        accuracy: total ? Math.round((correct / total) * 100) : null,
        lastGrade: sessions[0]?.grade || null,
      },
      sessions: sessions.map((s) => ({
        _id: s._id.toString(),
        testTitle: s.testTitle,
        subject: s.subject,
        curriculum: s.curriculum,
        mode: s.mode,
        correct: s.correct,
        total: s.total,
        percentage: s.percentage,
        grade: s.grade,
        completedAt: s.completedAt || s.createdAt,
      })),
      topics,
      rows,
    })
  } catch (e) {
    console.error('GET /api/igcsc/my-results failed:', e?.message)
    return NextResponse.json({ error: 'Could not load your results' }, { status: 500 })
  }
}
