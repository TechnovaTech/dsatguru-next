import mongoose from 'mongoose'

const studyTaskSchema = new mongoose.Schema({
  date: Date,
  topic: String,
  questionCount: Number,
  difficultyMix: String
}, { _id: false })

const studyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examDate: { type: Date, required: true },
  weakTopics: [String],
  dailyPlan: [studyTaskSchema]
}, { timestamps: true })

export default mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema)
