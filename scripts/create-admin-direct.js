const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

// --- Wipe guard --------------------------------------------------------------
// This script DELETES every user before creating the admin, so it only runs with
// an explicit --yes-wipe flag, and says so loudly when the target is not a local
// database.
const WIPE_FLAG = '--yes-wipe'
const isLocalMongo = (u) => {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(u).hostname) }
  catch { return /^mongodb(\+srv)?:\/\/(?:[^@/]*@)?(?:localhost|127\.0\.0\.1)(?::\d+)?(?:[/?]|$)/i.test(u) }
}
const redactedUri = uri.replace(/\/\/[^@/]+@/, '//***@')
if (!process.argv.includes(WIPE_FLAG)) {
  console.error(`Refusing to run: scripts/create-admin-direct.js DELETES every user in ${redactedUri}${isLocalMongo(uri) ? '' : ' (NOT a localhost database!)'}.`)
  console.error(`Re-run with the ${WIPE_FLAG} flag to confirm:  node scripts/create-admin-direct.js ${WIPE_FLAG}`)
  process.exit(1)
}
if (!isLocalMongo(uri)) console.warn(`WARNING: ${WIPE_FLAG} given; wiping a NON-local database: ${redactedUri}`)
// -----------------------------------------------------------------------------

async function createAdmin() {
  try {
    await mongoose.connect(uri)
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      isActive: Boolean
    }, { timestamps: true })
    
    const User = mongoose.model('User', userSchema)
    
    await User.deleteMany({})
    
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = new User({
      name: 'Admin User',
      email: 'admin@dsatmain.com',
      password: hashedPassword,
      role: 'Admin',
      isActive: true
    })
    
    await admin.save()
    
    console.log('✅ Admin created successfully')
    console.log('Email: admin@dsatmain.com')
    console.log('Password: admin123')
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAdmin()
