import { NextResponse } from 'next/server'
import { igcscModels, gradeFromPct } from '../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../lib/igcscAuth'

// Student practice against the IGCSC question bank.
//
//   GET  ?facets=1                    → what the student can choose from
//   POST { curriculum, subject, topic, difficulty, count }
//                                     → start an attempt (answers withheld)
//   PATCH { sessionId, responses[] }  → submit, grade, store, return the result
//
// Answers are NEVER sent with the questions: the client grades nothing, the
// server does, so a student cannot read the key out of the network tab.

const MAX_QUESTIONS = 50

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const { Question } = await igcscModels()
    const sp = new URL(request.url).searchParams
    const active = { isActive: { $ne: false } }

    const curriculum = sp.get('curriculum') || ''
    const subject = sp.get('subject') || ''

    // Facets narrow as the student chooses, so the lists stay usable across a
    // 39k-question bank.
    const scope = { ...active }
    if (curriculum) scope.curriculum = curriculum
    if (subject) scope.subject = subject

    const [curricula, subjects, topics] = await Promise.all([
      Question.distinct('curriculum', active),
      Question.distinct('subject', curriculum ? { ...active, curriculum } : active),
      Question.distinct('topic', scope),
    ])
    const available = await Question.countDocuments(scope)

    return NextResponse.json({
      curricula: curricula.filter(Boolean).sort(),
      subjects: subjects.filter(Boolean).sort(),
      topics: topics.filter(Boolean).sort().slice(0, 300),
      difficulties: ['Easy', 'Medium', 'Hard', 'Very Hard'],
      available,
    })
  } catch (e) {
    console.error('GET /api/igcsc/practice failed:', e?.message)
    return NextResponse.json({ error: 'Could not load practice options' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const me = auth.decoded
    const body = await request.json().catch(() => ({}))

    const filter = { isActive: { $ne: false } }
    for (const k of ['curriculum', 'subject', 'topic', 'difficulty']) {
      if (body?.[k]) filter[k] = String(body[k])
    }
    // Only MCQs can be auto-marked; structured answers need a human.
    filter.isMCQ = true

    const count = Math.min(Math.max(Number(body?.count) || 10, 1), MAX_QUESTIONS)
    const { Question, Session } = await igcscModels()

    // $sample gives a different set each time without loading the bank.
    const picked = await Question.aggregate([
      { $match: filter },
      { $sample: { size: count } },
      { $project: { questionText: 1, options: 1, curriculum: 1, subject: 1, topic: 1, subtopic: 1, difficulty: 1, questionImage: 1, marks: 1 } },
    ])

    if (!picked.length) {
      return NextResponse.json(
        { error: 'No multiple-choice questions match that selection yet. Try a different topic or difficulty.' },
        { status: 404 }
      )
    }

    const session = await Session.create({
      studentId: me.userId || me.id,
      studentName: me.name || me.email,
      studentEmail: me.email,
      testTitle: [body?.curriculum, body?.subject, body?.topic].filter(Boolean).join(' · ') || 'Practice',
      subject: body?.subject || '',
      curriculum: body?.curriculum || '',
      testType: 'Practice',
      mode: 'practice',
      state: 'IN_PROGRESS',
      startTime: new Date(),
      total: picked.length,
      maxMarks: picked.length,
      questionIds: picked.map((q) => q._id),
    })

    return NextResponse.json({
      sessionId: session._id.toString(),
      // No correctAnswer in this payload — grading happens server-side.
      questions: picked.map((q) => ({
        _id: q._id.toString(),
        questionText: q.questionText,
        options: q.options,
        questionImage: q.questionImage || '',
        topic: q.topic || '',
        subtopic: q.subtopic || '',
        difficulty: q.difficulty || '',
        subject: q.subject || '',
      })),
    }, { status: 201 })
  } catch (e) {
    console.error('POST /api/igcsc/practice failed:', e?.message)
    return NextResponse.json({ error: 'Could not start practice' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const me = auth.decoded
    const body = await request.json().catch(() => ({}))
    const sessionId = String(body?.sessionId || '')
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    const { Question, Session } = await igcscModels()
    const session = await Session.findById(sessionId)
    if (!session) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    // An attempt belongs to exactly one student.
    if (String(session.studentId) !== String(me.userId || me.id)) {
      return NextResponse.json({ error: 'This attempt is not yours.' }, { status: 403 })
    }
    if (session.state === 'COMPLETED') {
      return NextResponse.json({ error: 'This attempt was already submitted.' }, { status: 409 })
    }

    // Grade against the bank — never against anything the client sent.
    const questions = await Question.find({ _id: { $in: session.questionIds } })
      .select('correctAnswer curriculum subject topic subtopic difficulty isMCQ').lean()
    const byId = new Map(questions.map((q) => [String(q._id), q]))

    const sent = Array.isArray(body?.responses) ? body.responses : []
    const answerOf = new Map(sent.map((r) => [String(r.questionId), r]))

    let correct = 0
    const responses = session.questionIds.map((qid) => {
      const q = byId.get(String(qid))
      const given = answerOf.get(String(qid))
      const selected = given?.selectedAnswer != null ? String(given.selectedAnswer).trim() : ''
      const key = String(q?.correctAnswer || '').trim()
      // Letter comparison, case-insensitive: the bank stores A/B/C/D.
      const isCorrect = !!selected && !!key && selected.toUpperCase() === key.toUpperCase()
      if (isCorrect) correct += 1
      return {
        questionId: qid,
        selectedAnswer: selected,
        correctAnswer: key,
        isCorrect,
        timeSpent: Math.max(0, Number(given?.timeSpent) || 0),
        curriculum: q?.curriculum || '',
        subject: q?.subject || '',
        topic: q?.topic || '',
        subtopic: q?.subtopic || '',
        difficulty: q?.difficulty || '',
        isMCQ: q?.isMCQ !== false,
      }
    })

    const total = responses.length
    const percentage = total ? Math.round((correct / total) * 100) : 0
    session.responses = responses
    session.correct = correct
    session.total = total
    session.marks = correct
    session.maxMarks = total
    session.percentage = percentage
    session.grade = gradeFromPct(percentage)
    session.state = 'COMPLETED'
    session.endTime = new Date()
    session.completedAt = new Date()
    if (session.startTime) session.durationMin = Math.round((Date.now() - new Date(session.startTime)) / 60000)
    await session.save()

    return NextResponse.json({
      sessionId: session._id.toString(),
      correct, total, percentage, grade: session.grade,
      responses,
    })
  } catch (e) {
    console.error('PATCH /api/igcsc/practice failed:', e?.message)
    return NextResponse.json({ error: 'Could not submit your answers' }, { status: 500 })
  }
}
