import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI && process.env.NODE_ENV === 'production') {
  throw new Error('MONGO_URI environment variable is not set')
}

// Cache the connection promise on the global so concurrent requests (and dev hot-reloads)
// share a single connection instead of racing multiple mongoose.connect() calls.
let cached = global._mongooseCache
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!cached.promise) {
    const uri = MONGO_URI || 'mongodb://localhost:27017/dsatmain'
    cached.promise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null
    console.error('MongoDB connection error:', error)
    throw error
  }

  return cached.conn
}

export default connectDB
