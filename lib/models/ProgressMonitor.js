import mongoose from 'mongoose'

const progressMonitorSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekOf: { type: String, required: true }, // e.g. "2025-01-06"
  questionsThisWeek: Number,
  errorsThisWeek: Number,
  redosCompleted: Number,
  onTrack: { type: String, enum: ['Yes', 'No', 'Partial'], default: null },
  biggestWeakness: String,
  contactedStudent: { type: String, enum: ['Yes', 'No'], default: null },
  actionTaken: String,
  flagForRahul: { type: Boolean, default: false },
}, { timestamps: true })

progressMonitorSchema.index({ tutorId: 1, studentId: 1, weekOf: 1 }, { unique: true })

export default mongoose.models.ProgressMonitor ?? mongoose.model('ProgressMonitor', progressMonitorSchema)
