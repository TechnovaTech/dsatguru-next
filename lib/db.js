import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return
  
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
    await mongoose.connect(uri)
    isConnected = true
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

export default connectDB