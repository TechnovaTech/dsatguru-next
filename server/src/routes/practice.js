import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Question from '../models/Question.js'
import PracticeSession from '../models/PracticeSession.js'
import PracticeAnswer from '../models/PracticeAnswer.js'

const router = express.Router()
const AllowedSubjects = ['Math', 'Reading and Writing']

router.get('/options', requireAuth, async (req, res) => {
  const { subject } = req.query
  let query = { isActive: true, subject: { $in: AllowedSubjects } }
  if (subject && AllowedSubjects.includes(subject)) query.subject = subject
  const questions = await Question.find(query)
  const subjects = await Question.distinct('subject', { isActive: true, subject: { $in: AllowedSubjects } })
  const difficultyDistribution = questions.reduce((acc, q) => { acc[q.difficulty] = (acc[q.difficulty] || 0) + 1; return acc }, {})
  const domains = []
  res.json({ success: true, data: { subjects, statusCounts: { unused: questions.length, incorrect: 0, correct: 0, mastered: 0, flagged: 0 }, difficultyDistribution, domains, totalQuestions: questions.length } })
})

router.post('/start', requireAuth, async (req, res) => {
  const { subject, questionCount = 10, mode = 'Tutor', difficulty } = req.body
  let query = { isActive: true }
  if (subject && AllowedSubjects.includes(subject)) query.subject = subject
  if (difficulty) query.difficulty = difficulty
  const all = await Question.find(query)
  const selected = all.sort(() => Math.random() - 0.5).slice(0, questionCount)
  if (!selected.length) return res.status(400).json({ success: false, message: 'No questions available' })
  const session = await PracticeSession.create({ userId: req.user.id, subject: subject || 'Mixed', mode, difficulty: difficulty || 'Easy', status: 'InProgress', totalQuestions: selected.length })
  await PracticeAnswer.insertMany(selected.map((q, idx) => ({ practiceSessionId: session._id, questionId: q._id, questionOrder: idx + 1 })))
  const first = selected[0]
  res.json({ success: true, sessionId: session._id, totalQuestions: session.totalQuestions, currentQuestion: 1, question: { id: first._id, content: first.content, options: first.options ? JSON.parse(first.options) : [], difficulty: first.difficulty, subject: first.subject, points: 1 }, mode })
})

router.post('/answer', requireAuth, async (req, res) => {
  const { sessionId, questionId, userAnswer, timeSpent, confidenceLevel, answerChanges } = req.body
  const pa = await PracticeAnswer.findOne({ practiceSessionId: sessionId, questionId }).populate('questionId')
  if (!pa) return res.status(404).json({ success: false, message: 'Question not found in session' })
  const isCorrect = pa.questionId.correctAnswer?.trim().toLowerCase() === (userAnswer || '').trim().toLowerCase()
  pa.userAnswer = userAnswer
  pa.isCorrect = isCorrect
  pa.timeSpent = timeSpent
  pa.answeredAt = new Date()
  pa.confidenceLevel = confidenceLevel
  pa.answerChanges = answerChanges || 0
  await pa.save()
  const next = await PracticeAnswer.findOne({ practiceSessionId: sessionId, questionOrder: pa.questionOrder + 1 }).populate('questionId')
  res.json({ success: true, isCorrect, correctAnswer: pa.questionId.correctAnswer, explanation: mode === 'Tutor' ? pa.questionId.explanation : null, nextQuestion: next ? { id: next.questionId._id, content: next.questionId.content, options: next.questionId.options ? JSON.parse(next.questionId.options) : [], difficulty: next.questionId.difficulty, subject: next.questionId.subject, points: 1 } : null })
})

router.post('/submit', requireAuth, async (req, res) => {
  const { sessionId } = req.body
  const session = await PracticeSession.findById(sessionId)
  const answers = await PracticeAnswer.find({ practiceSessionId: sessionId })
  const answered = answers.filter(a => a.userAnswer)
  const correct = answered.filter(a => a.isCorrect).length
  const totalTimeSpent = answered.reduce((s, a) => s + (a.timeSpent || 0), 0)
  session.status = 'Completed'
  session.completedAt = new Date()
  session.correctAnswers = correct
  session.totalTimeSpent = totalTimeSpent
  session.score = session.totalQuestions ? Math.round(correct / session.totalQuestions * 100) : 0
  await session.save()
  res.json({ success: true, results: { sessionId, totalQuestions: session.totalQuestions, answeredQuestions: answered.length, correctAnswers: correct, score: session.score, totalTimeSpent, averageTimePerQuestion: answered.length ? Math.round(totalTimeSpent / answered.length) : 0 } })
})

export default router
