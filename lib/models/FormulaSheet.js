import mongoose from 'mongoose'

const formulaSheetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number },
  date: { type: String },
  mathFormula: { type: String, default: '' },
  grammarRule: { type: String, default: '' },
  trapToAvoid: { type: String, default: '' },
  mastery: { type: Number, min: 0, max: 3, default: 0 },
  reviewNotes: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.models.FormulaSheet || mongoose.model('FormulaSheet', formulaSheetSchema)
