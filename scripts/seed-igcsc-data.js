// Seed the SEPARATE `igcsc` database with realistic IGCSE demo data.
//   node scripts/seed-igcsc-data.js
// Idempotent: clears the igcsc collections, then inserts a fresh demo dataset.
try { require('@next/env').loadEnvConfig(process.cwd()) } catch { try { require('dotenv').config() } catch {} }
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const base = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
const uri = process.env.IGCSC_MONGO_URI || base.replace(/\/([^/?]+)(\?|$)/, '/igcsc$2')

const gradeFromPct = (p) => p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : 'U'

const userSchema = new mongoose.Schema({ name: String, email: { type: String, lowercase: true }, password: String, role: { type: String, default: 'student' }, yearGroup: String, subjects: [String], isActive: { type: Boolean, default: true } }, { timestamps: true })
const studentSchema = new mongoose.Schema({ name: String, email: { type: String, lowercase: true }, yearGroup: String, targetGrade: String, targetDate: Date, subjects: [String], guardianEmail: String, isActive: { type: Boolean, default: true }, assignedTests: [mongoose.Schema.Types.ObjectId] }, { timestamps: true })
const bankSchema = new mongoose.Schema({ title: String, subject: String, description: String, totalQuestions: Number, status: { type: String, default: 'Active' } }, { timestamps: true })
const testSchema = new mongoose.Schema({ title: String, subject: String, testType: String, totalQuestions: Number, durationMin: Number, maxMarks: Number, isActive: { type: Boolean, default: true } }, { timestamps: true })
const sessionSchema = new mongoose.Schema({ studentId: mongoose.Schema.Types.ObjectId, studentName: String, studentEmail: String, testId: mongoose.Schema.Types.ObjectId, testTitle: String, subject: String, testType: String, marks: Number, maxMarks: Number, percentage: Number, grade: String, correct: Number, total: Number, durationMin: Number, state: { type: String, default: 'COMPLETED' }, startTime: Date, endTime: Date, completedAt: Date }, { timestamps: true })

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Language', 'Economics', 'Computer Science']
const FIRST = ['Aarav', 'Diya', 'Ishaan', 'Ananya', 'Vivaan', 'Saanvi', 'Advait', 'Myra', 'Reyansh', 'Aadhya', 'Kabir', 'Anika', 'Arjun', 'Kiara', 'Vihaan', 'Zara']
const LAST = ['Sharma', 'Patel', 'Khan', 'Reddy', 'Nair', 'Gupta', 'Shah', 'Mehta', 'Iyer', 'Bose', 'Kapoor', 'Rao', 'Menon', 'Das', 'Joshi', 'Sethi']

async function run() {
  await mongoose.connect(uri)
  console.log('Connected to IGCSC DB:', mongoose.connection.name)
  const IgcscUser = mongoose.model('IgcscUser', userSchema)
  const Student = mongoose.model('Student', studentSchema)
  const QuestionBank = mongoose.model('QuestionBank', bankSchema)
  const Test = mongoose.model('Test', testSchema)
  const Session = mongoose.model('Session', sessionSchema)

  await Promise.all([IgcscUser.deleteMany({}), Student.deleteMany({}), QuestionBank.deleteMany({}), Test.deleteMany({}), Session.deleteMany({})])
  console.log('Cleared existing igcsc collections')

  // Students
  const students = []
  for (let i = 0; i < FIRST.length; i++) {
    const name = `${FIRST[i]} ${LAST[i]}`
    const subs = [SUBJECTS[i % SUBJECTS.length], SUBJECTS[(i + 2) % SUBJECTS.length], SUBJECTS[(i + 4) % SUBJECTS.length]]
    students.push({
      name,
      email: `${FIRST[i].toLowerCase()}.${LAST[i].toLowerCase()}@igcsc.edu`,
      yearGroup: i % 2 === 0 ? 'Year 11' : 'Year 10',
      targetGrade: ['A*', 'A', 'B', 'A*', 'A'][i % 5],
      targetDate: new Date(2027, 4 + (i % 3), 1),
      subjects: subs,
      guardianEmail: `parent.${LAST[i].toLowerCase()}@gmail.com`,
      isActive: i % 9 !== 0,
    })
  }
  const studentDocs = await Student.insertMany(students)
  console.log(`Inserted ${studentDocs.length} students`)

  // IGCSC login accounts (own auth, own DB): 1 admin + a login per demo student.
  const adminPw = await bcrypt.hash(process.env.IGCSC_ADMIN_PASSWORD || 'admin@igcsc', 12)
  const studentPw = await bcrypt.hash('igcsc123', 12)
  const userDocs = [{ name: 'IGCSC Administrator', email: 'admin@igcsc.com', password: adminPw, role: 'admin', isActive: true }]
  for (const s of studentDocs) {
    userDocs.push({ name: s.name, email: s.email, password: studentPw, role: 'student', yearGroup: s.yearGroup, subjects: s.subjects, isActive: s.isActive })
  }
  await IgcscUser.insertMany(userDocs)
  console.log(`Inserted ${userDocs.length} IGCSC login accounts (admin@igcsc.com / admin@igcsc; students / igcsc123)`)

  // Question banks (one per subject)
  const banks = SUBJECTS.map((s, i) => ({
    title: `IGCSE ${s}`, subject: s,
    description: `Cambridge IGCSE ${s} — topic-wise question bank (past papers + practice).`,
    totalQuestions: 180 + i * 65, status: 'Active',
  }))
  const bankDocs = await QuestionBank.insertMany(banks)
  console.log(`Inserted ${bankDocs.length} question banks`)

  // Tests: APT + SMS(per subject) + CSQ + Mock
  const testsSpec = [
    { title: 'IGCSE Aptitude Test (APT)', subject: 'General', testType: 'APT', totalQuestions: 40, durationMin: 60, maxMarks: 40 },
    { title: 'Mathematics — Subject Mastery (SMS)', subject: 'Mathematics', testType: 'SMS', totalQuestions: 50, durationMin: 90, maxMarks: 100 },
    { title: 'Physics — Subject Mastery (SMS)', subject: 'Physics', testType: 'SMS', totalQuestions: 45, durationMin: 90, maxMarks: 90 },
    { title: 'Chemistry — Subject Mastery (SMS)', subject: 'Chemistry', testType: 'SMS', totalQuestions: 45, durationMin: 90, maxMarks: 90 },
    { title: 'Biology — Concept & Skill Quiz (CSQ)', subject: 'Biology', testType: 'CSQ', totalQuestions: 20, durationMin: 30, maxMarks: 20 },
    { title: 'English Language — CSQ', subject: 'English Language', testType: 'CSQ', totalQuestions: 25, durationMin: 40, maxMarks: 50 },
    { title: 'Economics — Subject Mastery (SMS)', subject: 'Economics', testType: 'SMS', totalQuestions: 40, durationMin: 75, maxMarks: 80 },
    { title: 'Full Mock — May Series', subject: 'General', testType: 'Mock', totalQuestions: 100, durationMin: 150, maxMarks: 200 },
    { title: 'Computer Science — CSQ', subject: 'Computer Science', testType: 'CSQ', totalQuestions: 20, durationMin: 30, maxMarks: 40 },
  ]
  const testDocs = await Test.insertMany(testsSpec)
  console.log(`Inserted ${testDocs.length} tests`)

  // Completed sessions: spread across students & tests with varied scores.
  const sessions = []
  const now = Date.now()
  let n = 0
  for (const st of studentDocs) {
    const count = 2 + (n % 3) // 2-4 sessions each
    for (let k = 0; k < count; k++) {
      const test = testDocs[(n + k) % testDocs.length]
      const pct = Math.max(28, Math.min(98, 55 + ((n * 7 + k * 13) % 45) - 5))
      const marks = Math.round((pct / 100) * test.maxMarks)
      const correct = Math.round((pct / 100) * test.totalQuestions)
      const completedAt = new Date(now - ((n * 3 + k) * 36) * 3600 * 1000)
      sessions.push({
        studentId: st._id, studentName: st.name, studentEmail: st.email,
        testId: test._id, testTitle: test.title, subject: test.subject, testType: test.testType,
        marks, maxMarks: test.maxMarks, percentage: pct, grade: gradeFromPct(pct),
        correct, total: test.totalQuestions, durationMin: Math.round(test.durationMin * 0.8),
        state: 'COMPLETED',
        startTime: new Date(completedAt.getTime() - test.durationMin * 60000),
        endTime: completedAt, completedAt,
      })
      n++
    }
  }
  // A couple of live (in-progress) sessions for the tracker
  sessions.push({
    studentId: studentDocs[0]._id, studentName: studentDocs[0].name, studentEmail: studentDocs[0].email,
    testId: testDocs[1]._id, testTitle: testDocs[1].title, subject: testDocs[1].subject, testType: testDocs[1].testType,
    maxMarks: testDocs[1].maxMarks, correct: 18, total: testDocs[1].totalQuestions, state: 'IN_PROGRESS',
    startTime: new Date(now - 25 * 60000),
  })
  const sessionDocs = await Session.insertMany(sessions)
  console.log(`Inserted ${sessionDocs.length} sessions`)

  console.log('✅ IGCSC demo data seeded.')
  process.exit(0)
}

run().catch((e) => { console.error('❌ seed failed:', e); process.exit(1) })
