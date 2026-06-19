// Seeds a demo Tutor and Student with known credentials.
//
//   node scripts/seed-users.cjs
//
// Safe to re-run: it upserts the two accounts and resets their passwords so the
// credentials below always work. It only touches these two emails.
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Plain `node` doesn't auto-load .env files — load MONGO_URI from .env.local / .env.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !process.env[m[1]]) {
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        process.env[m[1]] = v
      }
    }
  }
}
loadEnv()

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dsatmain'

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  console.warn('\n⚠️  MONGO_URI was NOT found in .env.local — using the localhost fallback.')
  console.warn('   If your app uses a cloud database, the seeded users will NOT show up in the app.')
  console.warn('   Fix: run this from the project root (d:\\dguru\\dsatguru-next) so it can read .env.local.\n')
}

// Minimal, non-strict schema so we only set the fields we care about and leave any
// existing fields on the documents untouched.
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  isActive: Boolean,
  assignedTutors: [mongoose.Schema.Types.ObjectId]
}, { timestamps: true, strict: false }))

async function run() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to:', uri.replace(/\/\/[^@]*@/, '//<credentials>@'))

    const tutor = await User.findOneAndUpdate(
      { email: 'tutor@dsatguru.com' },
      { $set: { name: 'Demo Tutor', password: await bcrypt.hash('tutor123', 12), role: 'Tutor', isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    const student = await User.findOneAndUpdate(
      { email: 'student@dsatguru.com' },
      { $set: { name: 'Demo Student', password: await bcrypt.hash('student123', 12), role: 'Student', isActive: true, assignedTutors: [tutor._id] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    console.log('\n✅ Seeded accounts (log in at /login):')
    console.log('   TUTOR     tutor@dsatguru.com    /  tutor123')
    console.log('   STUDENT   student@dsatguru.com  /  student123')
    console.log('   (the student is assigned to the tutor:', String(student._id) !== '' ? 'yes' : 'no', ')')
    process.exit(0)
  } catch (e) {
    console.error('❌ Seeding failed:', e.message)
    process.exit(1)
  }
}

run()
