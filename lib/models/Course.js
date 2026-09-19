import mongoose from 'mongoose'

const courseHighlightSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  text: { type: String, required: true },
  sequenceOrder: { type: Number, default: 0 }
})

const courseScheduleSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  day: String,
  time: String
})

const courseFAQSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  question: String,
  answer: String
})

const courseMeetingSchema = new mongoose.Schema({
  title: String,
  // Session kind — drives duration defaults, whether students may speak, and
  // how the card is labelled. See lib/meetingStatus.js MEETING_TYPES.
  type: {
    type: String,
    enum: ['live-class', 'doubt-session', 'one-on-one', 'exam-review', 'workshop'],
    default: 'live-class',
  },
  // `date` is the legacy datetime-local string (NO timezone — it was parsed in
  // each viewer's local zone, so the same class showed at different instants
  // for different students). `scheduledAt` is the real instant and wins.
  date: String,
  scheduledAt: Date,
  durationMinutes: { type: Number, default: 60 },
  // `link` historically held EITHER a LiveKit room name OR an external URL.
  // `roomName` is the canonical LiveKit room; `externalUrl` an outside link.
  link: String,
  roomName: String,
  externalUrl: String,
  // Lifecycle, written when a host starts/ends the session. 'live' keeps the
  // room joinable even if it overruns its scheduled window.
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled',
  },
  startedAt: Date,
  endedAt: Date,
  hostName: String,
  // For 1-on-1s: restrict the room to these students (empty = whole course).
  allowedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attendance: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    joinedAt: Date,
    leftAt: Date,
  }],
  transcript: String,
  transcriptSummary: String,
  transcriptLanguage: String,
  transcriptGeneratedAt: Date,
  snapshots: [{
    timestamp: String,
    imageUrl: String,
    title: String
  }]
})

const subMaterialSchema = new mongoose.Schema({
  name: String,
  link: String,
  type: String
})

const courseMaterialSchema = new mongoose.Schema({
  title: String, // For backward compatibility
  link: String,  // For backward compatibility
  type: String,  // For backward compatibility
  mainName: String,
  hasSubMaterials: { type: Boolean, default: false },
  subMaterials: [subMaterialSchema]
})

const courseSyllabusSchema = new mongoose.Schema({
  week: Number,
  title: String,
  description: String
})

const courseAssignmentSchema = new mongoose.Schema({
  title: String,
  dueDate: String,
  status: { type: String, default: 'Pending' },
  description: String,
  materials: [subMaterialSchema]
})

const courseCalendarEventSchema = new mongoose.Schema({
  title: String,
  date: Date,
  type: { type: String, default: 'notification' }, // notification, note
  description: String
})

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  overview: String,
  courseDetails: String,
  bannerImageUrl: String,
  price: { type: Number, required: true },
  discountedPrice: Number,
  discountPercentage: Number,
  stripeProductId: String,
  stripePriceId: String,
  type: { type: String, default: 'course' },
  questionBankType: { type: String, enum: ['Reading and Writing', 'Mathematics'], default: 'Reading and Writing' },
  highlights: [courseHighlightSchema],
  schedules: [courseScheduleSchema],
  faqs: [courseFAQSchema],
  meetings: [courseMeetingSchema],
  materials: [courseMaterialSchema],
  syllabus: [courseSyllabusSchema],
  assignments: [courseAssignmentSchema],
  calendarEvents: [courseCalendarEventSchema]
}, {
  timestamps: true
})

const courseEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  accessType: { type: String, enum: ['days', 'months', 'years', 'lifetime'], default: 'lifetime' },
  accessDuration: { type: Number, default: null },
  expiresAt: { type: Date, default: null },
  scheduleId: { type: String, default: null },
  // Per-course access flag. Toggling a student's status from a course affects ONLY this
  // enrollment — it must never touch the student's global User.isActive.
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

courseEnrollmentSchema.index({ userId: 1, courseId: 1 })
courseEnrollmentSchema.index({ courseId: 1 })

const questionBankEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  accessType: { type: String, enum: ['stripe', 'admin'], default: 'stripe' }
}, { timestamps: true })

const CourseEnrollment = mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', courseEnrollmentSchema)
const QuestionBankEnrollment = mongoose.models.QuestionBankEnrollment || mongoose.model('QuestionBankEnrollment', questionBankEnrollmentSchema)

export { CourseEnrollment, QuestionBankEnrollment }
export default mongoose.models.Course || mongoose.model('Course', courseSchema)
