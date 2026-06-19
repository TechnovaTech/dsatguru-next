import mongoose from 'mongoose'

// Delete the model if it exists to ensure schema updates are applied in dev mode
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
  delete mongoose.models.User
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String,
  googleId: String,
  role: { type: String, enum: ['Student', 'Tutor', 'Admin', 'TutorAdmin'], default: 'Student' },
  isActive: { type: Boolean, default: true },
  phone: String,
  dateOfBirth: Date,
  nextExamDate: Date,
  lastAttemptDate: Date,
  targetExamDate: Date,
  targetScore: Number,
  lastMessageSent: Date,
  tutorNotes: String,
  totalDsatAttempts: { type: Number, default: 0 },
  assignedTutors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }]
}, {
  timestamps: true
})

userSchema.index({ role: 1 })
userSchema.index({ assignedTutors: 1 })

export default mongoose.models.User || mongoose.model('User', userSchema)