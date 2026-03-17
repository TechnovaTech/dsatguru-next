import mongoose from 'mongoose'

const MONGO_URI = 'mongodb://localhost:27017/dsatmain'

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db
  const collection = db.collection('questions')

  // Find questions where content looks like the bad placeholder text
  const badPattern = /QUESTION\s*\d+.*Fill-in-the-Blank.*Options.*EMPTY/i

  const badQuestions = await collection.find({
    content: { $regex: 'QUESTION.*Fill-in-the-Blank.*Options.*EMPTY', $options: 'i' }
  }).toArray()

  console.log(`Found ${badQuestions.length} bad questions`)

  if (badQuestions.length === 0) {
    console.log('Nothing to delete.')
    await mongoose.disconnect()
    return
  }

  // Print them first
  badQuestions.forEach((q, i) => {
    console.log(`  ${i + 1}. ID: ${q._id} | content: ${String(q.content).slice(0, 80)}`)
  })

  const ids = badQuestions.map(q => q._id)
  const result = await collection.deleteMany({ _id: { $in: ids } })

  console.log(`\nDeleted ${result.deletedCount} bad questions.`)
  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
