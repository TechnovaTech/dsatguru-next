// Script to fix existing tests in database
const mongoose = require('mongoose')

const testSchema = new mongoose.Schema({
  title: String,
  subject: String,
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  duration: Number,
  isTimed: Boolean,
  isTutorTest: Boolean,
  practiceMode: String,
  testType: String,
  isActive: Boolean,
  customQuestions: mongoose.Schema.Types.Mixed
}, { timestamps: true })

const Test = mongoose.models.Test || mongoose.model('Test', testSchema)

async function fixTests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dsatguru')
    
    console.log('Connected to database')
    
    // Find all tests (not just tutor tests)
    const tests = await Test.find({})
    
    console.log(`Found ${tests.length} total tests`)
    
    for (const test of tests) {
      console.log(`\nTest: ${test.title}`)
      console.log(`  isTutorTest: ${test.isTutorTest}`)
      console.log(`  practiceMode: ${test.practiceMode}`)
      console.log(`  Current isTimed: ${test.isTimed}`)
      console.log(`  Current duration: ${test.duration}`)
      
      // Fix: If duration exists and is > 0, set isTimed to true
      if (test.duration && test.duration > 0) {
        test.isTimed = true
        await test.save()
        console.log(`  ✓ Fixed: Set isTimed to true`)
      } else {
        test.isTimed = false
        test.duration = 0
        await test.save()
        console.log(`  ✓ Fixed: Set isTimed to false, duration to 0`)
      }
    }
    
    console.log('\n✓ All tests fixed!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixTests()
