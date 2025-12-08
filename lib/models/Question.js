import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  text: String,
  options: [String],
  answer: String,
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Question || mongoose.model('Question', schema)
