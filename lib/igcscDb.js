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

// Real IGCSE questions imported from the past-paper / question-bank exports.
// Two shapes live here: true MCQs (A–D + a correct letter) and structured/theory
// questions (multi-part, mark scheme, final answer text). `isMCQ` discriminates.
const questionSchema = new mongoose.Schema({
  sourceId: { type: String, index: true },   // original export id (namespaced: "<zipIdx>-<id>")
  curriculum: { type: String, index: true }, // IGCSE | IBDP | A-Level | US Curriculum | Competition
  course: String,                            // human course name from the source pack
  subject: { type: String, index: true },    // Mathematics | Physics | Chemistry | ...
  stream: String,                            // Add Math | Extended Math | Cambridge | ...
  topic: { type: String, index: true },
  subtopic: String,
  topicPath: [String],
  // PDF/export appearance order. sourceFolder = the exact source index-page path
  // (before display topic/subtopic prettification collapses several folders — e.g.
  // an Easy and a Hard folder — into the same pair); order = that question's position
  // within its folder's listing. Sorting by these two together reproduces the order
  // questions appeared in the original PDF, which sourceId/topic alone cannot do.
  sourceFolder: { type: String, default: '', index: true },
  order: { type: Number, default: 0 },
  difficulty: { type: String, default: '' }, // Easy | Medium | Hard | Very Hard | ''
  isMCQ: { type: Boolean, default: false },
  questionText: String,
  options: { A: String, B: String, C: String, D: String, E: String }, // E for AMC/competition 5-choice items
  correctAnswer: String,                     // letter for MCQ, final answer text otherwise
  answerText: String,                        // full worked solution / mark scheme
  marks: { type: Number, default: 0 },
  hasFigure: { type: Boolean, default: false },
  questionImage: String,                     // /uploads/igcse/q_<id>.jpg
  answerImage: String,                       // /uploads/igcse/a_<id>.jpg
  bankId: { type: mongoose.Schema.Types.ObjectId, index: true },
  tags: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true })
questionSchema.index({ curriculum: 1, subject: 1, topic: 1, difficulty: 1 })
questionSchema.index({ curriculum: 1, subject: 1, course: 1, sourceFolder: 1, order: 1 })

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

// A live IGCSC class. Unlike the DSAT side (where meetings are embedded in a
// Course) these are standalone documents: an IGCSE session belongs to a subject
// and optionally to a named set of students.
const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['live-class', 'doubt-session', 'one-on-one', 'exam-review', 'workshop'],
    default: 'live-class',
  },
  curriculum: String,                 // IGCSE | IBDP | A-Level | …
  subject: String,
  scheduledAt: Date,
  durationMinutes: { type: Number, default: 60 },
  roomName: { type: String, index: true },
  status: { type: String, enum: ['scheduled', 'live', 'ended', 'cancelled'], default: 'scheduled' },
  startedAt: Date,
  endedAt: Date,
  hostName: String,
  // Empty = every IGCSC student may join; otherwise only these students.
  allowedStudentIds: [{ type: mongoose.Schema.Types.ObjectId }],
  guestAccess: {
    enabled: { type: Boolean, default: false },
    code: String,
  },
  notes: String,
  createdBy: String,
}, { timestamps: true })

// Waiting-room knocks for IGCSC guest links (self-destruct after 6h).
const meetingGuestSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  name: { type: String, required: true },
  claimId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending', index: true },
  decidedBy: String,
  decidedAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 6 },
})

export async function igcscModels() {
  const c = await getIgcscConn()
  return {
    conn: c,
    IgcscUser: c.models.IgcscUser || c.model('IgcscUser', userSchema),
    Student: c.models.Student || c.model('Student', studentSchema),
    QuestionBank: c.models.QuestionBank || c.model('QuestionBank', bankSchema),
    Question: c.models.Question || c.model('Question', questionSchema),
    Test: c.models.Test || c.model('Test', testSchema),
    Session: c.models.Session || c.model('Session', sessionSchema),
    Meeting: c.models.Meeting || c.model('Meeting', meetingSchema),
    MeetingGuest: c.models.MeetingGuest || c.model('MeetingGuest', meetingGuestSchema),
  }
}

// Schemas exported for the seed script (CommonJS side re-declares its own).
export const schemas = { studentSchema, bankSchema, testSchema, sessionSchema, questionSchema, meetingSchema }
