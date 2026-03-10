import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  googleId: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin', 'TutorAdmin'], default: 'Student' },
  isActive: { type: Boolean, default: true },
  phone: String,
  dateOfBirth: Date
}, {
  timestamps: true
})

export default mongoose.models.User || mongoose.model('User', userSchema)