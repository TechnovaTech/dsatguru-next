import { connectDB } from './lib/db.js'
import Comparison from './lib/models/Comparison.js'

async function cleanup() {
  try {
    await connectDB()
    await Comparison.deleteMany({})
    console.log('All comparison data deleted')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

cleanup()