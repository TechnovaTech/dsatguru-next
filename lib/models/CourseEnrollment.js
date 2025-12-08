import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  enrolledAt: { type: Date, default: Date.now }
})

export default mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', schema)
