import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import TestSession from '@/lib/models/TestSession'
import Question from '@/lib/models/Question'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request) {
  await dbConnect()
  const decoded = verifyToken(getTokenFromRequest(request))
  if (!decoded || !['Tutor', 'TutorAdmin', 'Admin'].includes(decoded.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tutor's students
  const students = await User.find({ assignedTutors: decoded.userId, role: 'Student' }, '_id name').lean()
  const studentIds = students.map(s => s._id)

  // Get completed sessions for these students
  const sessions = await TestSession.find({
    userId: { $in: studentIds },
    status: 'Completed'
  }, 'userId responses').lean()

  // Collect all incorrect questionIds with studentId
  const incorrectMap = {} // questionId -> Set of studentIds
  const seenMap = {}      // questionId -> count

  for (const session of sessions) {
    for (const r of session.responses || []) {
      if (!r.isCorrect && r.questionId) {
        const qid = r.questionId.toString()
        if (!incorrectMap[qid]) incorrectMap[qid] = new Set()
        incorrectMap[qid].add(session.userId.toString())
        seenMap[qid] = (seenMap[qid] || 0) + 1
      }
    }
  }

  // Filter: only questions missed by 2+ students
  const filteredQids = Object.keys(incorrectMap).filter(qid => incorrectMap[qid].size >= 2)

  if (filteredQids.length === 0) return NextResponse.json([])

  const questions = await Question.find(
    { _id: { $in: filteredQids } },
    'skill domain subject difficulty createdAt content'
  ).lean()

  // Build studentId -> name map
  const studentMap = {}
  students.forEach(s => { studentMap[s._id.toString()] = s.name })

  // Group by skill+domain
  const grouped = {}
  for (const q of questions) {
    const key = `${q.skill || 'Unknown'}__${q.domain || q.subject || 'General'}`
    const qid = q._id.toString()
    if (!grouped[key]) {
      grouped[key] = {
        topic: q.skill || 'Unknown',
        section: q.domain || q.subject || 'General',
        studentsAffected: new Set(),
        timesSeen: 0,
        difficulty: q.difficulty || 'Medium',
        dateFirstSeen: q.createdAt,
        questions: []
      }
    }
    const g = grouped[key]
    const affectedStudentIds = [...(incorrectMap[qid] || [])]
    affectedStudentIds.forEach(sid => g.studentsAffected.add(sid))
    g.timesSeen += seenMap[qid] || 0
    g.questions.push({
      id: qid,
      content: q.content,
      difficulty: q.difficulty || 'Medium',
      students: affectedStudentIds.map(sid => studentMap[sid] || 'Unknown')
    })
    if (q.createdAt < g.dateFirstSeen) g.dateFirstSeen = q.createdAt
  }

  const result = Object.values(grouped).map(g => ({
    topic: g.topic,
    section: g.section,
    studentsAffected: g.studentsAffected.size,
    studentNames: [...g.studentsAffected].map(sid => studentMap[sid] || 'Unknown'),
    timesSeen: g.timesSeen,
    difficulty: g.difficulty,
    dateFirstSeen: g.dateFirstSeen,
    questions: g.questions,
    recommendedFix: '',
    taughtInSession: false
  })).sort((a, b) => b.studentsAffected - a.studentsAffected)

  return NextResponse.json(result)
}
