import mongoose from 'mongoose'

const studyTaskSchema = new mongoose.Schema({
  date: Date,
  topic: String,
  questionCount: Number,
  difficultyMix: String
}, { _id: false })

const studyPlanSchema = new mongoose.Schema({
  // Per-student planner fields (optional so admin catalog templates validate
  // without a student attached). The student flow (app/api/study-plan/*) still
  // sets userId + examDate, which remain valid.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  studentName: { type: String, default: '' },
  startDate: { type: Date },
  examDate: { type: Date, required: false },
  currentScore: { type: Number, default: 0 },
  targetScore: { type: Number, default: 1600 },
  weakTopics: [String],
  dailyPlan: [studyTaskSchema],

  // Admin catalog/template fields (created from the admin Study Plan UI).
  title: { type: String },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  duration: { type: mongoose.Schema.Types.Mixed },
  difficulty: { type: String },
  modules: { type: mongoose.Schema.Types.Mixed, default: [] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

export default mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema)
