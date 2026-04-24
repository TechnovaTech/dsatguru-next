import mongoose from 'mongoose'

if (process.env.NODE_ENV === 'development' && mongoose.models.DemoTest) {
  delete mongoose.models.DemoTest
}

const demoTestSchema = new mongoose.Schema({
  title: { type: String, default: 'DSAT Demo Test' },
  description: { type: String, default: 'Free demo test to experience the DSATGuru platform' },
  instructions: { type: String, default: '' },
  mathQuestionCount: { type: Number, default: 10 },
  rwQuestionCount: { type: Number, default: 10 },
  mathDuration: { type: Number, default: 20 }, // minutes
  rwDuration: { type: Number, default: 20 }, // minutes
  mathQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  rwQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  mathBankId: { type: String, default: '' },
  rwBankId: { type: String, default: '' },
  customQuestions: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  singleton: { type: String, default: 'demo-test', unique: true }
}, { timestamps: true })

export default mongoose.models.DemoTest || mongoose.model('DemoTest', demoTestSchema)
