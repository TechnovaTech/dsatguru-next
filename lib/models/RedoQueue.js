import mongoose from 'mongoose'

const redoQueueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  testSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession' },

  // Question metadata (snapshot at time of logging)
  section: { type: String }, // e.g. Math, Reading & Writing
  topic: { type: String },   // skill/domain
  questionDescription: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },

  // Why it was logged
  whyWrong: { type: String },       // student's own note on why they got it wrong
  correctConcept: { type: String }, // the concept they need to master

  // Redo scheduling
  dateLogged: { type: Date, default: Date.now },
  redoDueDate: { type: Date },

  // Status
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  completedAt: { type: Date }
}, {
  timestamps: true
})

// Auto-mark as Overdue if past due date and still Pending
redoQueueSchema.index({ userId: 1, status: 1 })
redoQueueSchema.index({ userId: 1, questionId: 1 })

export default mongoose.models.RedoQueue ?? mongoose.model('RedoQueue', redoQueueSchema)
