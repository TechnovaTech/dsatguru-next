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
  highlights: [courseHighlightSchema],
  schedules: [courseScheduleSchema],
  faqs: [courseFAQSchema]
}, {
  timestamps: true
})

const courseEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true })

const questionBankEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true })

const CourseEnrollment = mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', courseEnrollmentSchema)
const QuestionBankEnrollment = mongoose.models.QuestionBankEnrollment || mongoose.model('QuestionBankEnrollment', questionBankEnrollmentSchema)

export { CourseEnrollment, QuestionBankEnrollment }
export default mongoose.models.Course || mongoose.model('Course', courseSchema)
