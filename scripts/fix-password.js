const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function fixPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/dsatmain')
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      isActive: Boolean
    }, { timestamps: true })
    
    const User = mongoose.model('User', userSchema)
    
    // Create new hash with same method as API
    const newHash = await bcrypt.hash('admin123', 12)
    
    await User.updateOne(
      { email: 'admin@dsatmain.com' },
      { password: newHash }
    )
    
    // Test the new hash
    const user = await User.findOne({ email: 'admin@dsatmain.com' })
    const isValid = await bcrypt.compare('admin123', user.password)
    
    console.log('✅ Password updated')
    console.log('Test result:', isValid ? 'VALID' : 'INVALID')
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixPassword()