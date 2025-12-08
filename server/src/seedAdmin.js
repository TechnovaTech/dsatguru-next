import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'

dotenv.config()

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsat_psat_lms'
  await mongoose.connect(mongoUri)
  const email = process.env.ADMIN_EMAIL || 'admin@dsatguru.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@123'
  const name = process.env.ADMIN_NAME || 'Site Admin'

  let user = await User.findOne({ email })
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10)
    user = await User.create({ name, email, passwordHash, role: 'Admin' })
    console.log('Admin user created:', email)
  } else {
    if (user.role !== 'Admin') {
      user.role = 'Admin'
    }
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      user.passwordHash = await bcrypt.hash(password, 10)
    }
    await user.save()
    console.log('Admin user ensured:', email)
  }
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
