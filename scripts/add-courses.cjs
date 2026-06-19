const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

const highlight = new mongoose.Schema({ text: String, sequenceOrder: { type: Number, default: 0 } })
const schedule = new mongoose.Schema({ day: String, time: String })
const faq = new mongoose.Schema({ question: String, answer: String })

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    overview: String,
    courseDetails: String,
    bannerImageUrl: String,
    price: { type: Number, required: true },
    discountedPrice: Number,
    discountPercentage: Number,
    type: { type: String, default: 'course' },
    highlights: [highlight],
    schedules: [schedule],
    faqs: [faq],
  },
  { timestamps: true, strict: false }
)

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema)

const courses = [
  {
    title: 'DSAT/PSAT Live Bootcamp Course',
    description: 'Intensive Weekend Preparation',
    overview: 'An intensive weekend bootcamp covering all DSAT/PSAT sections with expert instructors.',
    type: 'course',
    price: 625,
    discountedPrice: 500,
    discountPercentage: 20,
    schedules: [{ day: '1st August,', time: '2026' }],
    highlights: [
      '20+ hours of intensive instruction over one weekend',
      'Strategic approach to all DSAT/PSAT sections',
      'Intensive training formats with expert instructors',
      'All key concepts and test-taking techniques revision',
      '11+ realistic full-length practice tests',
      'Take-home materials and practice tests',
      'Guaranteed score increase — 120+ score',
      '7 days access to online practice tests & bootcamp video resources (when available)',
    ].map((text, i) => ({ text, sequenceOrder: i })),
  },
  {
    title: 'DSAT/PSAT Live Prep Course',
    description: 'Be Prepared for the DSAT',
    overview: 'A comprehensive live prep program to master the Digital SAT/PSAT end to end.',
    type: 'course',
    price: 1600,
    discountedPrice: 1500,
    discountPercentage: 6,
    schedules: [{ day: '14th June,', time: '2026' }],
    highlights: [
      '60+ hours of live, structured classes to master DSAT/PSAT comprehensively',
      'Expert instructors delivering top-tier Digital SAT/PSAT guidance',
      '25+ full-length realistic multistage adaptive practice tests for DSAT/PSAT',
      'In-depth score report for every practice test',
      'Thorough reinforcement of fundamental concepts for DSAT/PSAT success',
      '2,500+ targeted drill questions ($4,000+ value)',
      'Guaranteed score increase — 1420+ (most students score 1500+)',
    ].map((text, i) => ({ text, sequenceOrder: i })),
  },
]

;(async () => {
  try {
    await mongoose.connect(uri)
    console.log('Connected:', uri)
    for (const c of courses) {
      const res = await Course.findOneAndUpdate(
        { title: c.title },
        { $set: c },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      console.log('Upserted:', res.title, '=>', res._id.toString())
    }
    const total = await Course.countDocuments({ type: 'course' })
    console.log('Total course-type documents now:', total)
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
})()
