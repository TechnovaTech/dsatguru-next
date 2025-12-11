const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
mongoose.connect(uri)

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin'], default: 'Student' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

async function fixAdmin() {
  try {
    // Delete existing admin
    await User.deleteOne({ email: 'admin@dsatmain.com' })
    
    // Create new admin with correct password
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@dsatmain.com',
      password: adminPassword,
      role: 'Admin',
      isActive: true
    })

    console.log('✅ Admin user fixed!')
    console.log('Email:', admin.email)
    console.log('Role:', admin.role)
    console.log('Password: admin123')
    
    // Test password
    const isValid = await bcrypt.compare('admin123', admin.password)
    console.log('Password test:', isValid ? '✅ Valid' : '❌ Invalid')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixAdmin()
