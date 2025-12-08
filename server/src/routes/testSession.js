import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import TestSession from '../models/TestSession.js'
import Question from '../models/Question.js'

const router = express.Router()

router.post('/start', requireAuth, async (req, res) => {
  const { moduleType = 'base' } = req.body
  const countMap = { base: 20, 'base-math': 27, 'base-reading-writing': 27, 'adaptive-easy': 15, 'adaptive-medium': 15, 'adaptive-hard': 15 }
  const questionCount = countMap[moduleType] || 20
  let query = { isActive: true }
  if (moduleType.includes('math')) query.subject = 'Math'
  else if (moduleType.includes('reading') || moduleType.includes('writing')) query.subject = { $in: ['English', 'Reading & Writing', 'Reading', 'Writing', 'Verbal'] }
  const questions = await Question.find(query).limit(questionCount)
  const session = await TestSession.create({ userId: req.user.id, moduleRoute: moduleType, totalQuestions: questions.length, correctAnswers: 0, score: 0, questions: questions.map(q => ({ content: q.content, subject: q.subject, difficulty: q.difficulty, correctAnswer: q.correctAnswer, userAnswer: '', timeSpent: 0 })) })
  res.json({ sessionId: session._id, questions: session.questions.map((q, i) => ({ id: i, content: q.content, options: [], subject: q.subject, difficulty: q.difficulty })), moduleInfo: { type: moduleType, timeLimit: 1800, totalQuestions: session.totalQuestions }, timeLimit: 1800 })
})

router.post('/save-progress', requireAuth, async (req, res) => {
  const { sessionId, answers } = req.body
  const session = await TestSession.findById(sessionId)
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' })
  Object.entries(answers || {}).forEach(([key, val]) => {
    const idx = Number(key)
    if (!Number.isNaN(idx) && session.questions[idx]) {
      session.questions[idx].userAnswer = val.selectedAnswer || ''
      session.questions[idx].timeSpent = val.timeSpent || 0
    }
  })
  await session.save()
  res.json({ success: true, message: 'Progress saved' })
})

router.post('/submit', requireAuth, async (req, res) => {
  const { sessionId, moduleType, timeSpent } = req.body
  const session = await TestSession.findById(sessionId)
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' })
  const correct = session.questions.filter(q => q.correctAnswer === q.userAnswer).length
  session.correctAnswers = correct
  session.score = session.totalQuestions ? Math.round(correct / session.totalQuestions * 100) : 0
  session.endTime = new Date()
  await session.save()
  const route = session.score >= 80 ? 'adaptive-hard' : session.score >= 60 ? 'adaptive-medium' : 'adaptive-easy'
  res.json({ success: true, sessionId, score: session.score, correctAnswers: correct, totalQuestions: session.totalQuestions, irtResult: { calculationMethod: 'Simplified', reliability: 0.85 }, routeToAdaptive: moduleType === 'base', adaptiveRoute: moduleType === 'base' ? route : '', timeSpent })
})

router.get('/:sessionId', requireAuth, async (req, res) => {
  const s = await TestSession.findById(req.params.sessionId)
  if (!s) return res.status(404).json({ success: false, message: 'Session not found' })
  res.json({ sessionId: s._id, moduleType: s.moduleRoute, startTime: s.startTime, endTime: s.endTime, totalQuestions: s.totalQuestions, correctAnswers: s.correctAnswers, score: s.score, questions: s.questions })
})

router.get('/history', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit || 10)
  const sessions = await TestSession.find({ userId: req.user.id, endTime: { $ne: null } }).sort({ startTime: -1 }).limit(limit)
  const data = sessions.map(s => ({ sessionId: s._id, moduleType: s.moduleRoute, startTime: s.startTime, endTime: s.endTime, score: s.score, correctAnswers: s.correctAnswers, totalQuestions: s.totalQuestions, percentCorrect: s.totalQuestions ? Math.round(s.correctAnswers / s.totalQuestions * 1000) / 10 : 0 }))
  res.json({ success: true, data })
})

router.post('/adaptive-routing', requireAuth, async (req, res) => {
  const { baseModuleScore } = req.body
  const adaptiveModule = baseModuleScore >= 80 ? 'adaptive-hard' : baseModuleScore >= 60 ? 'adaptive-medium' : 'adaptive-easy'
  res.json({ success: true, shouldRoute: true, adaptiveModule, recommendation: 'Auto-determined' })
})

router.post('/calculate-irt', requireAuth, async (req, res) => {
  res.json({ success: true, data: { mathAbility: 0, readingWritingAbility: 0, calculationMethod: 'Simplified' } })
})

export default router
