import mongoose from 'mongoose'

const comparisonSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Compare DSATGURU vs. Other Prep Services' },
  subtitle: { type: String, required: true, default: 'Comprehensive and Intuitive' },
  description: { type: String, required: true, default: 'We are committed to supporting our students in reaching their full potential, empowering them to achieve exceptional scores and confidently pursue admission to the colleges of their choice.' },
  features: [{ type: String, required: true }],
  providers: [{
    name: { type: String, required: true },
    highlight: { type: Boolean, default: false },
    values: [mongoose.Schema.Types.Mixed] // Array of mixed values (string, number, boolean)
  }],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
})

export default mongoose.models.Comparison || mongoose.model('Comparison', comparisonSchema)