import mongoose from 'mongoose'

if (process.env.NODE_ENV === 'development' && mongoose.models.DemoTestAttempt) {
  delete mongoose.models.DemoTestAttempt
}

const responseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  module: { type: String, enum: ['math', 'rw'] },
  selectedAnswer: String,
  correctAnswer: String,
  isCorrect: Boolean,
  timeSpent: Number
}, { _id: false })

const demoTestAttemptSchema = new mongoose.Schema({
  demoTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoTest' },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String, default: '' },
  responses: [responseSchema],
  mathScore: { type: Number, default: 0 },
  rwScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  mathCorrect: { type: Number, default: 0 },
  rwCorrect: { type: Number, default: 0 },
  mathTotal: { type: Number, default: 0 },
  rwTotal: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 }, // seconds
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  status: { type: String, enum: ['Started', 'Completed'], default: 'Started' }
}, { timestamps: true })

export default mongoose.models.DemoTestAttempt || mongoose.model('DemoTestAttempt', demoTestAttemptSchema)
