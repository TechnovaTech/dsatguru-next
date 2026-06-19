/**
 * Seeds Tutor + TutorAdmin + Student accounts and a connected dataset so all three
 * roles have real data to show: tutor tests, student assignments, and completed
 * results. Idempotent — the demo accounts are upserted (passwords reset) and all
 * generated tests/sessions are tagged { seededTutorData: true } so re-running
 * cleans and recreates only this seed's data.
 *
 *   node scripts/seed-tutor-data.cjs
 *   node scripts/seed-tutor-data.cjs --clean   (remove only this seed's tests/sessions)
 */
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !process.env[m[1]]) {
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        process.env[m[1]] = v
      }
    }
  }
}
loadEnv()

const URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dsatmain'
const CLEAN = process.argv.includes('--clean')
const LETTERS = ['A', 'B', 'C', 'D']
const rnd = (n) => Math.floor(Math.random() * n)
const pick = (a) => a[rnd(a.length)]
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1])

const ACCOUNTS = [
  { email: 'tutoradmin@dsatguru.com', name: 'Demo Tutor Admin', role: 'TutorAdmin', pw: 'tutoradmin123' },
  { email: 'tutor@dsatguru.com', name: 'Demo Tutor', role: 'Tutor', pw: 'tutor123' },
  { email: 'student@dsatguru.com', name: 'Demo Student', role: 'Student', pw: 'student123' },
]

const TEST_SPECS = [
  { title: 'Tutor Test — Algebra Basics', subject: 'Math', weeksAgo: 3 },
  { title: 'Tutor Test — Reading Comprehension', subject: 'Reading and Writing', weeksAgo: 2 },
  { title: 'Tutor Test — Mixed Practice', subject: 'Math', weeksAgo: 1 },
]

;(async () => {
  await mongoose.connect(URI)
  const db = mongoose.connection.db
  console.log('DB:', db.databaseName)
  const Users = db.collection('users')
  const Tests = db.collection('tests')
  const Sessions = db.collection('testsessions')
  const Questions = db.collection('questions')

  // Idempotent: clear our previous demo tutor data first.
  const delT = await Tests.deleteMany({ seededTutorData: true })
  const delS = await Sessions.deleteMany({ seededTutorData: true })
  console.log(`Cleaned previous -> tests: ${delT.deletedCount}, sessions: ${delS.deletedCount}`)
  if (CLEAN) { console.log('Clean done.'); await mongoose.disconnect(); return }

  // 1) Upsert the three demo accounts (passwords always reset to known values).
  const ids = {}
  for (const a of ACCOUNTS) {
    const hash = await bcrypt.hash(a.pw, 12)
    await Users.updateOne(
      { email: a.email },
      { $set: { name: a.name, password: hash, role: a.role, isActive: true }, $setOnInsert: { createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    )
    const doc = await Users.findOne({ email: a.email }, { projection: { _id: 1 } })
    ids[a.role] = doc._id
  }
  const tutorId = ids.Tutor
  const demoStudentId = ids.Student
  console.log('Accounts ready: TutorAdmin, Tutor, Student')

  // 2) Questions pool (for test contents + realistic responses).
  const questions = await Questions.find({}).project({ subject: 1, correctAnswer: 1, difficulty: 1 }).toArray()
  const mathQs = questions.filter((q) => q.subject === 'Math')
  const rwQs = questions.filter((q) => q.subject === 'Reading and Writing')
  const poolFor = (subj) => {
    const p = subj === 'Math' ? mathQs : rwQs
    return p.length ? p : questions
  }
  console.log(`Questions -> total: ${questions.length}, Math: ${mathQs.length}, R&W: ${rwQs.length}`)

  // 3) Choose the students for this tutor (up to 6 existing + always the demo student).
  let studentDocs = await Users.find({ role: 'Student' }).project({ name: 1, email: 1 }).limit(6).toArray()
  if (!studentDocs.some((s) => String(s._id) === String(demoStudentId))) {
    const ds = await Users.findOne({ _id: demoStudentId }, { projection: { name: 1, email: 1 } })
    if (ds) studentDocs.unshift(ds)
  }
  console.log(`Students linked to tutor: ${studentDocs.length}`)

  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000

  // 4) Create the tutor tests.
  const testDocs = TEST_SPECS.map((s) => {
    const qIds = shuffle(poolFor(s.subject)).slice(0, 20).map((q) => q._id)
    return {
      title: s.title,
      description: 'Tutor-assigned practice test (demo data).',
      testType: 'Practice',
      practiceMode: 'tutor',
      isTutorTest: true,
      isModuleTest: false,
      isActive: true,
      subject: s.subject,
      sections: { math: s.subject === 'Math', rw: s.subject !== 'Math' },
      duration: 60,
      totalQuestions: qIds.length || 20,
      questions: qIds,
      seededTutorData: true,
      createdAt: new Date(now - s.weeksAgo * week),
      updatedAt: new Date(now - s.weeksAgo * week),
    }
  })
  const insT = await Tests.insertMany(testDocs)
  const tutorTestIds = Object.values(insT.insertedIds)
  console.log(`Inserted ${tutorTestIds.length} tutor tests`)

  // 5) Wire up the relationships:
  //    - tutor.assignedTests  -> so the tutor's "Test Sheets" lists them
  //    - student.assignedTutor (singular, used by the results API) + assignedTutors
  //    - student.assignedTests -> so students see them as assigned
  await Users.updateOne({ _id: tutorId }, { $addToSet: { assignedTests: { $each: tutorTestIds } } })
  const studentIds = studentDocs.map((s) => s._id)
  await Users.updateMany(
    { _id: { $in: studentIds } },
    { $set: { assignedTutor: tutorId }, $addToSet: { assignedTutors: tutorId, assignedTests: { $each: tutorTestIds } } }
  )

  // 6) Completed sessions (gives Tutor/TutorAdmin "Test Results" + each student's history).
  const sessionDocs = []
  for (const stu of studentDocs) {
    const baseSkill = 0.5 + Math.random() * 0.35
    for (let i = 0; i < tutorTestIds.length; i++) {
      const spec = TEST_SPECS[i]
      const chosenQs = shuffle(poolFor(spec.subject)).slice(0, 10)
      const sessionDate = new Date(now - spec.weeksAgo * week + rnd(3) * 24 * 60 * 60 * 1000)
      let correct = 0, mathT = 0, mathC = 0, rwT = 0, rwC = 0
      const responses = chosenQs.map((q) => {
        const adj = q.difficulty === 'Easy' ? 0.15 : q.difficulty === 'Hard' ? -0.18 : 0
        const p = Math.min(0.95, Math.max(0.15, baseSkill + adj))
        const ok = Math.random() < p
        if (ok) correct++
        if (q.subject === 'Math') { mathT++; if (ok) mathC++ } else { rwT++; if (ok) rwC++ }
        const c = q.correctAnswer || 'A'
        return { questionId: q._id, selectedAnswer: ok ? c : pick(LETTERS.filter((l) => l !== c)), isCorrect: ok, timeSpent: 30 + rnd(90), answeredAt: sessionDate }
      })
      const total = responses.length || 10
      const score = Math.round((correct / (total || 1)) * 100)
      sessionDocs.push({
        userId: stu._id,
        testId: tutorTestIds[i],
        subject: spec.subject,
        sessionType: 'Practice',
        status: 'Completed',
        state: 'COMPLETED',
        startTime: sessionDate,
        endTime: sessionDate,
        completedAt: sessionDate,
        totalQuestions: total,
        answeredQuestions: total,
        correctAnswers: correct,
        score,
        mathScore: mathT ? Math.round((mathC / mathT) * 100) : 0,
        rwScore: rwT ? Math.round((rwC / rwT) * 100) : 0,
        totalScore: score,
        timeSpent: responses.reduce((a, r) => a + r.timeSpent, 0),
        responses,
        analysisSubmitted: Math.random() < 0.6,
        seededTutorData: true,
        createdAt: sessionDate,
        updatedAt: sessionDate,
      })
    }
  }
  const insS = await Sessions.insertMany(sessionDocs)
  console.log(`Inserted ${Object.keys(insS.insertedIds).length} completed sessions`)

  console.log('\n✅ Done. Log in at /login:')
  console.log('   TUTOR ADMIN   tutoradmin@dsatguru.com  /  tutoradmin123')
  console.log('   TUTOR         tutor@dsatguru.com       /  tutor123')
  console.log('   STUDENT       student@dsatguru.com     /  student123')

  await mongoose.disconnect()
})().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
