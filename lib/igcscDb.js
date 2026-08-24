import mongoose from 'mongoose'
import { connectDB } from './db'

// IGCSC is a SEPARATE platform: its data lives in its own `igcsc` database on the
// same Mongo server (no DsatGuru/SAT data ever leaks in). We reuse the main client's
// connection pool via .useDb(), and register IGCSE-specific models on that connection.

let igcscConn = null
export async function getIgcscConn() {
  await connectDB() // ensure the base mongoose connection is up
  if (!igcscConn) {
    igcscConn = mongoose.connection.useDb(process.env.IGCSC_DB_NAME || 'igcsc', { useCache: true })
  }
  return igcscConn
}

// ---- IGCSE schemas ----
// IGCSC's own auth users (admins / tutors / students) — fully separate from DsatGuru.
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  password: String,
  role: { type: String, enum: ['admin', 'tutor', 'student'], default: 'student' },
  yearGroup: String,
  subjects: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  yearGroup: String,                 // e.g. "Year 10", "Year 11"
  targetGrade: String,               // e.g. "A*", "7"
  targetDate: Date,
  subjects: [String],                // e.g. ["Mathematics", "Physics"]
  guardianEmail: String,
  isActive: { type: Boolean, default: true },
  assignedTests: [{ type: mongoose.Schema.Types.ObjectId }],
}, { timestamps: true })

const bankSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: String,
  description: String,
  totalQuestions: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
}, { timestamps: true })

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: String,
  testType: { type: String, default: 'SMS' },   // APT | SMS | CSQ | Mock | Oral
  totalQuestions: { type: Number, default: 0 },
  durationMin: { type: Number, default: 60 },
  maxMarks: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const sessionSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  studentName: String,
  studentEmail: String,
  testId: mongoose.Schema.Types.ObjectId,
  testTitle: String,
  subject: String,
  testType: String,
  marks: Number,
  maxMarks: Number,
  percentage: Number,               // 0..100
  grade: String,                    // A* .. U
  correct: Number,
  total: Number,
  durationMin: Number,
  state: { type: String, default: 'COMPLETED' }, // ASSIGNED | IN_PROGRESS | COMPLETED
  startTime: Date,
  endTime: Date,
  completedAt: Date,
}, { timestamps: true })

// IGCSE grade from a percentage (A*–U scale).
export function gradeFromPct(p) {
  if (p >= 90) return 'A*'
  if (p >= 80) return 'A'
  if (p >= 70) return 'B'
  if (p >= 60) return 'C'
  if (p >= 50) return 'D'
  if (p >= 40) return 'E'
  return 'U'
}

export async function igcscModels() {
  const c = await getIgcscConn()
  return {
    conn: c,
    IgcscUser: c.models.IgcscUser || c.model('IgcscUser', userSchema),
    Student: c.models.Student || c.model('Student', studentSchema),
    QuestionBank: c.models.QuestionBank || c.model('QuestionBank', bankSchema),
    Test: c.models.Test || c.model('Test', testSchema),
    Session: c.models.Session || c.model('Session', sessionSchema),
  }
}

// Schemas exported for the seed script (CommonJS side re-declares its own).
export const schemas = { studentSchema, bankSchema, testSchema, sessionSchema }
