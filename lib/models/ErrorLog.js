import mongoose from 'mongoose'

const errorLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number },
  date: { type: String },
  section: { type: String, enum: ['Math', 'Reading & Writing'], default: 'Math' },
  topic: { type: String, default: '' },
  questionDesc: { type: String, default: '' },
  whyWrong: { type: String, default: '' },
  correctRule: { type: String, default: '' },
  difficulty: { type: String, enum: ['E', 'M', 'H'], default: 'M' },
  redoDueDate: { type: String, default: '' },
  redoAnswer: { type: String, default: '' },
  redoResult: { type: String, enum: ['✓', '✗', ''], default: '' },
  sourceQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  sourceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession' },
  selectedAnswer: { type: String, default: '' },
  tutorAction: { type: String, default: '' }
}, { timestamps: true })

export default mongoose.models.ErrorLog || mongoose.model('ErrorLog', errorLogSchema)
