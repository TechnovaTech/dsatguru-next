/**
 * Non-destructive demo seeder for Student Analysis.
 * Creates Test docs + completed TestSessions (with testId + responses linked to
 * real seeded questions) so the admin Student Analysis page shows real numbers.
 *
 * Everything is tagged { seededAnalytics: true } so re-running is idempotent and
 * removal never touches real data or the other seeder's data.
 *
 * Usage:  node scripts/seed-test-analytics.cjs          (seed)
 *         node scripts/seed-test-analytics.cjs --clean   (remove only this seed)
 */
const mongoose = require('mongoose')

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
const CLEAN = process.argv.includes('--clean')

const LETTERS = ['A', 'B', 'C', 'D']
const rnd = (n) => Math.floor(Math.random() * n)
const pick = (arr) => arr[rnd(arr.length)]
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1])

// 8 tests across the 4 analysis "types" (classified by these flags in the API)
const TEST_SPECS = [
  { title: '[DEMO] Full-Length Mock #1', testType: 'Mock', practiceMode: 'admin', isTutorTest: false, isModuleTest: false, weeksAgo: 6 },
  { title: '[DEMO] Full-Length Mock #2', testType: 'Mock', practiceMode: 'admin', isTutorTest: false, isModuleTest: false, weeksAgo: 1 },
  { title: '[DEMO] Adaptive Practice #1', testType: 'Adaptive', practiceMode: 'timed', isTutorTest: false, isModuleTest: false, weeksAgo: 5 },
  { title: '[DEMO] Adaptive Practice #2', testType: 'Adaptive', practiceMode: 'timed', isTutorTest: false, isModuleTest: false, weeksAgo: 3 },
  { title: '[DEMO] Adaptive Practice #3', testType: 'Adaptive', practiceMode: 'timed', isTutorTest: false, isModuleTest: false, weeksAgo: 2 },
  { title: '[DEMO] Tutor Assigned Test #1', testType: 'Practice', practiceMode: 'tutor', isTutorTest: true, isModuleTest: false, weeksAgo: 4 },
  { title: '[DEMO] Tutor Assigned Test #2', testType: 'Practice', practiceMode: 'tutor', isTutorTest: true, isModuleTest: false, weeksAgo: 2 },
  { title: '[DEMO] Module Test — Algebra', testType: 'Practice', practiceMode: 'tutor', isTutorTest: true, isModuleTest: true, weeksAgo: 3 },
]

;(async () => {
  await mongoose.connect(URI)
  const db = mongoose.connection.db
  console.log('DB:', db.databaseName)

  const Tests = db.collection('tests')
  const Sessions = db.collection('testsessions')
  const Users = db.collection('users')
  const Questions = db.collection('questions')

  // Always clear our own previous seed first (idempotent + non-destructive)
  const delT = await Tests.deleteMany({ seededAnalytics: true })
  const delS = await Sessions.deleteMany({ seededAnalytics: true })
  console.log(`Cleaned previous demo -> tests: ${delT.deletedCount}, sessions: ${delS.deletedCount}`)
  if (CLEAN) { console.log('Clean done.'); await mongoose.disconnect(); return }

  const questions = await Questions.find({})
    .project({ subject: 1, skill: 1, difficulty: 1, correctAnswer: 1 })
    .toArray()
  if (!questions.length) { console.log('No questions found — aborting.'); await mongoose.disconnect(); return }

  const mathQs = questions.filter((q) => q.subject === 'Math')
  const rwQs = questions.filter((q) => q.subject === 'Reading and Writing')
  console.log(`Questions -> Math: ${mathQs.length}, R&W: ${rwQs.length}`)

  const students = await Users.find({ role: 'Student' }).project({ name: 1, email: 1 }).toArray()
  console.log(`Students: ${students.length}`)

  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000

  // 1) Insert the Test docs
  const testDocs = TEST_SPECS.map((s) => ({
    title: s.title,
    description: 'Demo test for analytics',
    testType: s.testType,
    practiceMode: s.practiceMode,
    isTutorTest: s.isTutorTest,
    isModuleTest: s.isModuleTest,
    sections: { math: true, rw: true },
    duration: 180,
    totalQuestions: 20,
    isActive: true,
    subject: 'Math',
    questions: questions.slice(0, 20).map((q) => q._id),
    seededAnalytics: true,
    createdAt: new Date(now - s.weeksAgo * week),
    updatedAt: new Date(now - s.weeksAgo * week),
  }))
  const insT = await Tests.insertMany(testDocs)
  const testIds = Object.values(insT.insertedIds)
  console.log(`Inserted ${testIds.length} tests`)

  // 2) For each student, attempt a random subset of tests
  const sessionDocs = []
  for (const stu of students) {
    const baseSkill = 0.5 + Math.random() * 0.35 // 0.50 - 0.85
    // each student attempts 5-8 of the 8 tests
    const chosen = shuffle(TEST_SPECS.map((s, i) => i)).slice(0, 5 + rnd(4))
    for (const i of chosen) {
      const spec = TEST_SPECS[i]
      const testId = testIds[i]

      // sample 6-9 questions, mixing both subjects
      const nMath = 3 + rnd(3)
      const nRw = 3 + rnd(3)
      const chosenQs = [...shuffle(mathQs).slice(0, nMath), ...shuffle(rwQs).slice(0, nRw)]

      const sessionDate = new Date(now - spec.weeksAgo * week + rnd(3) * 24 * 60 * 60 * 1000)
      let correctCount = 0
      let mathTotal = 0, mathCorrect = 0, rwTotal = 0, rwCorrect = 0
      const responses = chosenQs.map((q) => {
        const diffAdj = q.difficulty === 'Easy' ? 0.15 : q.difficulty === 'Hard' ? -0.18 : 0
        const p = Math.min(0.95, Math.max(0.15, baseSkill + diffAdj))
        const isCorrect = Math.random() < p
        if (isCorrect) correctCount++
        if (q.subject === 'Math') { mathTotal++; if (isCorrect) mathCorrect++ }
        else { rwTotal++; if (isCorrect) rwCorrect++ }
        const correct = q.correctAnswer || 'A'
        const selectedAnswer = isCorrect ? correct : pick(LETTERS.filter((l) => l !== correct))
        return {
          questionId: q._id,
          selectedAnswer,
          isCorrect,
          timeSpent: 30 + rnd(90),
          answeredAt: sessionDate,
        }
      })

      const total = responses.length
      const score = Math.round((correctCount / total) * 100)
      const mathScore = mathTotal ? Math.round((mathCorrect / mathTotal) * 100) : 0
      const rwScore = rwTotal ? Math.round((rwCorrect / rwTotal) * 100) : 0

      sessionDocs.push({
        userId: stu._id,
        testId,
        subject: 'Math',
        sessionType: spec.testType === 'Mock' ? 'Mock' : spec.testType === 'Adaptive' ? 'Adaptive' : 'Practice',
        status: 'Completed',
        state: 'COMPLETED',
        startTime: sessionDate,
        endTime: sessionDate,
        completedAt: sessionDate,
        totalQuestions: total,
        answeredQuestions: total,
        correctAnswers: correctCount,
        score,
        mathScore,
        rwScore,
        totalScore: score,
        timeSpent: responses.reduce((s, r) => s + r.timeSpent, 0),
        responses,
        analysisSubmitted: true,
        seededAnalytics: true,
        createdAt: sessionDate,
        updatedAt: sessionDate,
      })
    }
  }

  const insS = await Sessions.insertMany(sessionDocs)
  console.log(`Inserted ${Object.keys(insS.insertedIds).length} completed sessions across ${students.length} students`)

  await mongoose.disconnect()
  console.log('Done.')
})().catch((e) => { console.error(e); process.exit(1) })
