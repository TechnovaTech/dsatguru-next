import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

await mongoose.connect(process.env.MONGO_URI)

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  assignedTests: [mongoose.Schema.Types.ObjectId]
}, { strict: false }))

const TestSession = mongoose.model('TestSession', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  testId: mongoose.Schema.Types.ObjectId,
  status: String,
  showExplanation: Boolean,
  createdAt: Date
}, { strict: false }))

const Test = mongoose.model('Test', new mongoose.Schema({
  title: String
}, { strict: false }))

const student = await User.findOne({ email: 'user@gmail.com' }).lean()
if (!student) { console.log('User not found'); process.exit(1) }

console.log(`\nStudent: ${student.email} (${student._id})`)
console.log(`Assigned test IDs: ${(student.assignedTests || []).length}`)

// Get last 2 assigned test sessions
const sessions = await TestSession.find({ userId: student._id, status: 'Assigned' })
  .sort({ createdAt: -1 })
  .limit(2)
  .lean()

console.log(`\nLast 2 Assigned sessions:`)
for (const s of sessions) {
  const test = await Test.findById(s.testId).lean()
  console.log(`  - Session ID: ${s._id}`)
  console.log(`    Test: ${test?.title || s.testId}`)
  console.log(`    showExplanation: ${s.showExplanation}`)
  console.log(`    createdAt: ${s.createdAt}`)
  console.log()
}

// Also check completed sessions for those same test IDs
const assignedTestIds = sessions.map(s => s.testId)
console.log(`\nCompleted sessions for those tests:`)
const completed = await TestSession.find({
  userId: student._id,
  testId: { $in: assignedTestIds },
  status: 'Completed'
}).lean()

for (const s of completed) {
  const test = await Test.findById(s.testId).lean()
  console.log(`  - Session ID: ${s._id}`)
  console.log(`    Test: ${test?.title || s.testId}`)
  console.log(`    showExplanation: ${s.showExplanation}`)
  console.log(`    status: ${s.status}`)
  console.log()
}

await mongoose.disconnect()
