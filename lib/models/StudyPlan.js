import mongoose from 'mongoose'

const studyTaskSchema = new mongoose.Schema({
  date: Date,
  topic: String,
  questionCount: Number,
  difficultyMix: String
}, { _id: false })

const studyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, default: '' },
  startDate: { type: Date },
  examDate: { type: Date, required: true },
  currentScore: { type: Number, default: 0 },
  targetScore: { type: Number, default: 1600 },
  weakTopics: [String],
  dailyPlan: [studyTaskSchema]
}, { timestamps: true })

export default mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema)
