const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function createAdmin() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
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
