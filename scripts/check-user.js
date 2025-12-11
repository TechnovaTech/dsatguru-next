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

async function checkUser() {
  try {
    const user = await User.findOne({ email: 'admin@dsatmain.com' })
    
    if (!user) {
      console.log('❌ Admin user not found')
      return
    }
    
    console.log('✅ Admin user found:')
    console.log('- Name:', user.name)
    console.log('- Email:', user.email)
    console.log('- Role:', user.role)
    console.log('- Active:', user.isActive)
    console.log('- Password hash exists:', !!user.password)
    
    // Test password
    const isValid = await bcrypt.compare('admin123', user.password)
    console.log('- Password test:', isValid ? '✅ Valid' : '❌ Invalid')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkUser()
