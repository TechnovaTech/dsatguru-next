import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  content: String,
  options: { type: String },
  tags: { type: String },
  subject: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  correctAnswer: String,
  explanation: String,
  isActive: { type: Boolean, default: true }
})

export default mongoose.model('Question', schema)
