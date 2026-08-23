// Seed (or reset) the IGCSC portal administrator account.
//   Run from the project root:  node scripts/seed-igcsc-admin.js
// Idempotent: creates the account if missing, otherwise resets its password/role
// so the documented credentials are always guaranteed to work.
// Load env exactly like the Next.js app (reads .env / .env.local / .env.production).
try { require('@next/env').loadEnvConfig(process.cwd()) } catch { try { require('dotenv').config() } catch {} }
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

const EMAIL = process.env.IGCSC_ADMIN_EMAIL || 'admin@igcsc.com'
const PASSWORD = process.env.IGCSC_ADMIN_PASSWORD || 'admin@igcsc'
const NAME = process.env.IGCSC_ADMIN_NAME || 'IGCSC Administrator'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin', 'TutorAdmin'], default: 'Student' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function run() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to database')

    const hashed = await bcrypt.hash(PASSWORD, 12)
    const existing = await User.findOne({ email: EMAIL.toLowerCase() })

    if (existing) {
      existing.password = hashed
      existing.role = 'Admin'
      existing.isActive = true
      if (!existing.name) existing.name = NAME
      await existing.save()
      console.log('✅ IGCSC admin updated (password + role reset).')
    } else {
      await User.create({ name: NAME, email: EMAIL.toLowerCase(), password: hashed, role: 'Admin', isActive: true })
      console.log('✅ IGCSC admin created.')
    }

    console.log('   Email:   ', EMAIL)
    console.log('   Password:', PASSWORD)
    console.log('   Portal:   /igcsc')
    process.exit(0)
  } catch (err) {
    console.error('❌ IGCSC admin seeding failed:', err)
    process.exit(1)
  }
}

run()
