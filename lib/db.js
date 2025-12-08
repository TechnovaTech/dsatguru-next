import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsat_psat_lms'
  await mongoose.connect(uri)
  isConnected = true
}
