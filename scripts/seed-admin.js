const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin'], default: 'Student' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function seedAdmin() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to database')

    const adminEmail = 'admin@dsatmain.com'
    const existingAdmin = await User.findOne({ email: adminEmail })

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists.')
      console.log('Email:', adminEmail)
      // We don't overwrite password to be safe, unless explicitly requested.
      process.exit(0)
    }

    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      isActive: true
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@dsatmain.com')
    console.log('Password: admin123')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Admin seeding failed:', error)
    process.exit(1)
  }
}

seedAdmin()
