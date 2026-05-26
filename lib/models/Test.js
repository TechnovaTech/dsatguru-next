import mongoose from 'mongoose'

// Delete the model if it exists to ensure schema updates are applied in dev mode
if (process.env.NODE_ENV === 'development' && mongoose.models.Test) {
  delete mongoose.models.Test
}

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  questionBankIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' }],
  duration: { type: Number, default: 180 },
  totalQuestions: { type: Number, default: 50 },
  passingScore: { type: Number, default: 70 },
  isActive: { type: Boolean, default: true },
  testType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  instructions: String,
  excludeUsedQuestions: { type: Boolean, default: false },
  configType: { type: String, enum: ['standard', 'custom'], default: 'standard' },
  practiceMode: { type: String, enum: ['tutor', 'admin', 'timed', 'untimed'], default: 'timed' },
  customConfig: {
    rw: {
      routing: {
        low: { min: Number, max: Number },
        medium: { min: Number, max: Number },
        high: { min: Number, max: Number }
      },
      distribution: {
        low: { easy: Number, medium: Number, hard: Number },
        medium: { easy: Number, medium: Number, hard: Number },
        high: { easy: Number, medium: Number, hard: Number }
      }
    },
    math: {
      routing: {
        low: { min: Number, max: Number },
        medium: { min: Number, max: Number },
        high: { min: Number, max: Number }
      },
      distribution: {
        low: { easy: Number, medium: Number, hard: Number },
        medium: { easy: Number, medium: Number, hard: Number },
        high: { easy: Number, medium: Number, hard: Number }
      }
    }
  },
  sections: {
    math: { type: Boolean, default: true },
    rw: { type: Boolean, default: true }
  },
  filters: {
    domains: [String],
    subtopics: [String]
  },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedTutors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isTutorTest: { type: Boolean, default: false }, // Flag for tutor mode tests
  subject: { type: String },
  showExplanation: { type: Boolean, default: true }, // Show explanations to students in results
  isReassigned: { type: Boolean, default: false }, // Flag for reassigned tests
  originalTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' }, // Reference to original test if reassigned
  customQuestions: { type: mongoose.Schema.Types.Mixed }, // Store edited question versions for tutor tests
  isTimed: { type: Boolean, default: true },
  isModuleTest: { type: Boolean, default: false },
  numberOfModules: { type: Number, default: 1 },
  modules: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

export default mongoose.models.Test || mongoose.model('Test', testSchema)
