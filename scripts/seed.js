const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

// --- Wipe guard --------------------------------------------------------------
// This script DELETES every user and course before re-seeding, so it only runs
// with an explicit --yes-wipe flag, and says so loudly when the target is not a
// local database.
const WIPE_FLAG = '--yes-wipe'
const isLocalMongo = (u) => {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(u).hostname) }
  catch { return /^mongodb(\+srv)?:\/\/(?:[^@/]*@)?(?:localhost|127\.0\.0\.1)(?::\d+)?(?:[/?]|$)/i.test(u) }
}
const redactedUri = uri.replace(/\/\/[^@/]+@/, '//***@')
if (!process.argv.includes(WIPE_FLAG)) {
  console.error(`Refusing to run: scripts/seed.js DELETES every user and course in ${redactedUri}${isLocalMongo(uri) ? '' : ' (NOT a localhost database!)'}.`)
  console.error(`Re-run with the ${WIPE_FLAG} flag to confirm:  node scripts/seed.js ${WIPE_FLAG}`)
  process.exit(1)
}
if (!isLocalMongo(uri)) console.warn(`WARNING: ${WIPE_FLAG} given; wiping a NON-local database: ${redactedUri}`)
// -----------------------------------------------------------------------------

mongoose.connect(uri)

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin'], default: 'Student' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  discountedPrice: Number,
  type: { type: String, default: 'course' },
  highlights: [{
    text: String,
    sequenceOrder: Number
  }]
}, { timestamps: true })

const Course = mongoose.model('Course', courseSchema)

async function seedData() {
  try {
    await User.deleteMany({})
    await Course.deleteMany({})

    const adminPassword = await bcrypt.hash('admin123', 12)
    await User.create({
      name: 'Admin User',
      email: 'admin@dsatmain.com',
      password: adminPassword,
      role: 'Admin'
    })

    const studentPassword = await bcrypt.hash('student123', 12)
    await User.create({
      name: 'John Student',
      email: 'student@dsatmain.com',
      password: studentPassword,
      role: 'Student'
    })

    await Course.create([
      {
        title: 'DSAT Math Mastery',
        description: 'Complete DSAT Math preparation with adaptive learning',
        price: 299,
        discountedPrice: 199,
        highlights: [
          { text: '500+ Practice Questions', sequenceOrder: 1 },
          { text: 'Adaptive Learning System', sequenceOrder: 2 },
          { text: 'Expert Video Explanations', sequenceOrder: 3 },
          { text: 'Progress Tracking', sequenceOrder: 4 }
        ]
      },
      {
        title: 'DSAT English Excellence',
        description: 'Master DSAT English with comprehensive practice',
        price: 249,
        discountedPrice: 149,
        highlights: [
          { text: '400+ Reading Passages', sequenceOrder: 1 },
          { text: 'Grammar & Writing Skills', sequenceOrder: 2 },
          { text: 'Vocabulary Building', sequenceOrder: 3 },
          { text: 'Mock Tests', sequenceOrder: 4 }
        ]
      },
      {
        title: 'PSAT Prep Complete',
        description: 'Full PSAT preparation course',
        price: 199,
        discountedPrice: 99,
        highlights: [
          { text: 'Full-Length Practice Tests', sequenceOrder: 1 },
          { text: 'Score Improvement Guarantee', sequenceOrder: 2 },
          { text: 'Live Tutoring Sessions', sequenceOrder: 3 },
          { text: 'Study Schedule Planning', sequenceOrder: 4 }
        ]
      }
    ])

    console.log('✅ Database seeded successfully!')
    console.log('Admin: admin@dsatmain.com / admin123')
    console.log('Student: student@dsatmain.com / student123')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedData()
