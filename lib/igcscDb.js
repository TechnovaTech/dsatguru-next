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
// The ONE record for a person on IGCSC - their login and their profile.
//
// The profile half used to live in a separate `Student` document with no link
// back to here, which is why an admin-created student could never log in, a
// self-registered student never showed up in the admin's list, and an allocated
// test was filed under an id the student's own results page never reads.
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Unique, not merely indexed: every lookup in the product treats an email as
  // one person, and a check-then-insert cannot promise that on its own.
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  password: String,
  role: { type: String, enum: ['admin', 'tutor', 'student'], default: 'student' },
  // ── profile (students) ──
  yearGroup: String,
  subjects: [String],
  targetGrade: String,
  targetDate: Date,
  guardianEmail: String,
  assignedTests: [{ type: mongoose.Schema.Types.ObjectId }],
  isActive: { type: Boolean, default: true },
  // Test-paper credits bought in a pack: each one unlocks any single paper.
  // Only ever changed with an atomic $inc guarded by the balance, never by
  // reading it and writing it back.
  credits: { type: Number, default: 0 },
}, { timestamps: true })

// DEPRECATED - superseded by `IgcscUser` above, which now carries these fields.
// Kept registered only so an old script that still references it does not throw;
// nothing in the product reads or writes it any more. Do not add to it.
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
  // How this attempt came about. 'practice' is a student picking their own
  // questions from the bank; 'test' is something a tutor allocated.
  mode: { type: String, enum: ['practice', 'test'], default: 'test' },
  curriculum: String,
  // What the student was served, and what they did with it. Without per-question
  // rows a session can only ever say "7/10" — no topic breakdown, no mistake
  // analysis, no redo list.
  questionIds: [{ type: mongoose.Schema.Types.ObjectId }],
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    timeSpent: { type: Number, default: 0 },   // seconds
    // Denormalised so analysis never needs to re-read the whole bank.
    curriculum: String,
    subject: String,
    topic: String,
    subtopic: String,
    difficulty: String,
    isMCQ: Boolean,
  }],
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


// ─────────────────────────────────────────────────────────────────────────────
// The paper store: papers for sale, plans, orders, who may open what, and the
// attempts students make. See lib/igcscPapers.js and lib/igcscStore.js.
// ─────────────────────────────────────────────────────────────────────────────
const ObjectId = mongoose.Schema.Types.ObjectId

// One sellable paper = one source folder of the bank.
//
// The bank never stored papers: the exam-paper page groups questions by
// (curriculum, subject, sourceFolder) on every request and numbers them by sort
// position, so importing one folder renumbered every paper after it. Something
// people PAY for cannot be identified by a number that moves, so it is pinned
// here - by `key`, with the P-number frozen the first time it is seen.
const paperSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },   // curriculum|subject|sourceFolder
  curriculum: { type: String, index: true },
  subject: { type: String, index: true },
  course: String,                 // the one course this paper's questions come from
  sourceFolder: { type: String, default: '' },
  paperNo: Number,
  title: String,                  // "A-Level Physics P55"
  unit: String,                   // "Elastic & Plastic Behaviour — Easy"
  topic: String,
  subtopic: String,
  difficulty: { type: String, default: '' },
  questionCount: { type: Number, default: 0 },
  mcqCount: { type: Number, default: 0 },       // auto-marked online
  writtenCount: { type: Number, default: 0 },   // printed, photographed, AI-marked
  unscoredCount: { type: Number, default: 0 },  // MCQs with no answer key
  noSchemeCount: { type: Number, default: 0 },  // written with neither mark scheme nor final answer
  defectCount: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  mcqMarks: { type: Number, default: 0 },
  writtenMarks: { type: Number, default: 0 },
  durationMin: { type: Number, default: 45 },
  mcqDurationMin: { type: Number, default: 0 },
  // Every question can be marked, and nothing is broken. Only clean papers go on
  // sale automatically; the rest wait for an admin, with the reason recorded.
  clean: { type: Boolean, default: false },
  holdReason: { type: String, default: '' },
  price: { type: Number, default: 0 },           // major units (dollars), like the DSAT side
  isPublished: { type: Boolean, default: false, index: true },
  // Once an admin decides, a later resync must not undo it.
  publishedManually: { type: Boolean, default: false },
  priceSetManually: { type: Boolean, default: false },
  missingFromBank: { type: Boolean, default: false },
  syncedAt: Date,
}, { timestamps: true })
paperSchema.index({ curriculum: 1, subject: 1, paperNo: 1 })

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  currency: { type: String, default: 'usd' },
  defaultPaperPrice: { type: Number, default: 4.99 },
  // Closed until an admin opens it: the keys are live, and a store that opened
  // itself would start charging real cards at a price nobody chose.
  storeOpen: { type: Boolean, default: false },
  lastSyncAt: Date,
  lastSyncSummary: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

// A bundle: either a pack of N credits (any N papers), or access to a whole
// slice of the bank - everything, one curriculum, or one subject - optionally
// for a limited time.
const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  kind: { type: String, enum: ['credits', 'access'], required: true },
  credits: { type: Number, default: 0 },
  scope: { type: String, enum: ['all', 'curriculum', 'subject'], default: 'all' },
  curriculum: { type: String, default: '' },
  subject: { type: String, default: '' },
  durationDays: { type: Number, default: 0 },    // 0 = never expires
  price: { type: Number, default: 0 },
  features: [String],
  highlight: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

const orderSchema = new mongoose.Schema({
  userId: { type: ObjectId, required: true, index: true },
  userName: String,
  userEmail: String,
  kind: { type: String, enum: ['paper', 'plan', 'grant'], required: true },
  paperId: ObjectId,
  planId: ObjectId,
  title: String,
  amount: { type: Number, default: 0 },          // major units, as charged
  currency: { type: String, default: 'usd' },
  // What the plan WAS when bought - an admin editing the plan later must not
  // change what an existing buyer receives.
  planSnapshot: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], default: 'pending', index: true },
  stripeSessionId: String,
  stripePaymentIntent: String,
  paidAt: Date,
  // Claimed atomically: an order is fulfilled exactly once however many times
  // the return page, the reconcile pass and the webhook all see it paid.
  fulfilledAt: Date,
  // Stamped BEFORE credits are added, so a retried fulfilment can never add
  // them twice (there are no multi-document transactions to lean on here).
  creditsGrantedAt: Date,
  refundedAt: Date,
  // Access taken back without moving money - the order stays "paid", because
  // it was.
  revokedAt: Date,
  lastCheckedAt: Date,
  grantedBy: String,
  note: String,
  // "<userId>:<planId>" on a free plan's order only.
  freeClaimKey: String,
}, { timestamps: true })
orderSchema.index({ stripeSessionId: 1 }, { unique: true, partialFilterExpression: { stripeSessionId: { $type: 'string' } } })
orderSchema.index({ freeClaimKey: 1 }, { unique: true, partialFilterExpression: { freeClaimKey: { $type: 'string' } } })

// What a person may open. Assignments live in their own collection; free papers
// need no row at all.
const entitlementSchema = new mongoose.Schema({
  userId: { type: ObjectId, required: true, index: true },
  type: { type: String, enum: ['paper', 'access'], required: true },
  paperId: { type: ObjectId, index: true },
  scope: { type: String, enum: ['all', 'curriculum', 'subject'] },
  curriculum: String,
  subject: String,
  source: { type: String, enum: ['purchase', 'plan', 'credit', 'grant'], required: true },
  orderId: ObjectId,
  planId: ObjectId,
  planName: String,
  grantedBy: String,
  expiresAt: Date,
  revokedAt: Date,
  revokedReason: String,
  // Set only on a credit unlock, so the database itself refuses to spend two
  // credits on the same paper for the same person.
  creditKey: String,
}, { timestamps: true })
entitlementSchema.index({ creditKey: 1 }, { unique: true, partialFilterExpression: { creditKey: { $type: 'string' } } })
entitlementSchema.index({ orderId: 1 }, { unique: true, partialFilterExpression: { orderId: { $type: 'objectId' } } })

// A tutor handing a paper to a student. One row per (paper, student) for good;
// revoking stamps it, assigning again clears the stamp.
const paperAssignmentSchema = new mongoose.Schema({
  paperId: { type: ObjectId, required: true, index: true },
  studentId: { type: ObjectId, required: true, index: true },
  assignedBy: String,
  assignedByName: String,
  dueAt: Date,
  note: { type: String, default: '' },
  revokedAt: Date,
}, { timestamps: true })
paperAssignmentSchema.index({ paperId: 1, studentId: 1 }, { unique: true })

// One sitting of one paper. Deliberately NOT a Session: GET /my-results?id=
// returns a Session whole in any state, answer keys included, and the practice
// PATCH re-grades any Session its owner points it at. Paper attempts have their
// own routes, and nothing here is readable until it is meant to be.
const attemptSchema = new mongoose.Schema({
  userId: { type: ObjectId, required: true, index: true },
  userName: String,
  userEmail: String,
  paperId: { type: ObjectId, required: true, index: true },
  paperTitle: String,
  paperUnit: String,
  curriculum: String,
  subject: String,
  via: String,                    // purchase|plan|credit|grant|assignment|free|staff
  // { [questionId]: number as printed } fixed when the attempt starts. If the
  // bank is edited mid-attempt, the student's "Q3" must still mean the
  // question they were given as 3 - for the grader as much as for them.
  numbers: { type: mongoose.Schema.Types.Mixed, default: {} },
  // { [questionId]: marks } fixed at the same moment, for the same reason: the
  // section maximum was frozen then, and every question must add up to it.
  marks: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['in_progress', 'grading', 'needs_review', 'completed'], default: 'in_progress', index: true },
  mcq: {
    state: { type: String, enum: ['none', 'not_started', 'in_progress', 'submitted'], default: 'not_started' },
    questionIds: [ObjectId],
    // { [questionId]: { selected, flagged, timeSpent, at } } - a map so one
    // answer is one atomic $set, never a read-modify-write of the whole list.
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    durationMin: Number,
    startedAt: Date,
    deadline: Date,
    submittedAt: Date,
    autoSubmitted: Boolean,
    score: Number,
    max: Number,
    correct: Number,
    total: Number,
  },
  written: {
    state: { type: String, enum: ['none', 'not_started', 'grading', 'graded', 'needs_review', 'error'], default: 'not_started' },
    questionIds: [ObjectId],
    uploads: [{
      _id: false,
      id: String,
      file: String,
      mime: String,
      size: Number,
      uploadedAt: Date,
    }],
    submittedAt: Date,
    gradingStartedAt: Date,
    gradedAt: Date,
    provider: String,
    model: String,
    error: String,
    tries: { type: Number, default: 0 },
    score: Number,
    max: Number,
    reviewedBy: String,
    reviewedAt: Date,
  },
  results: [{
    _id: false,
    questionId: ObjectId,
    n: Number,                    // number as printed on the paper
    kind: String,                 // mcq | written
    maxMarks: Number,
    marksAwarded: Number,
    selected: String,
    correctAnswer: String,
    isCorrect: Boolean,
    transcription: String,
    feedback: String,
    confidence: Number,
    basis: String,                // key | scheme | final | none
    flagged: Boolean,
    flagReason: String,
    overridden: Boolean,
    topic: String,
    subtopic: String,
    difficulty: String,
  }],
  score: Number,
  maxScore: Number,
  percentage: Number,
  grade: String,
  completedAt: Date,
}, { timestamps: true })
attemptSchema.index({ userId: 1, paperId: 1, createdAt: -1 })

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
    Paper: c.models.Paper || c.model('Paper', paperSchema),
    StoreSettings: c.models.StoreSettings || c.model('StoreSettings', storeSettingsSchema),
    Plan: c.models.Plan || c.model('Plan', planSchema),
    Order: c.models.Order || c.model('Order', orderSchema),
    Entitlement: c.models.Entitlement || c.model('Entitlement', entitlementSchema),
    PaperAssignment: c.models.PaperAssignment || c.model('PaperAssignment', paperAssignmentSchema),
    PaperAttempt: c.models.PaperAttempt || c.model('PaperAttempt', attemptSchema),
  }
}

// Schemas exported for the seed script (CommonJS side re-declares its own).
export const schemas = { studentSchema, bankSchema, testSchema, sessionSchema, questionSchema, meetingSchema }
