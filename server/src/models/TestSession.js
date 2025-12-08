import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  content: String,
  subject: String,
  difficulty: String,
  correctAnswer: String,
  userAnswer: String,
  timeSpent: Number
})

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  moduleRoute: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  totalQuestions: Number,
  correctAnswers: Number,
  score: Number,
  questions: [questionSchema]
})

export default mongoose.model('TestSession', schema)
