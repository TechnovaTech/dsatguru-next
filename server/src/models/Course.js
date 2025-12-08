import mongoose from 'mongoose'

const highlightSchema = new mongoose.Schema({ text: String, sequenceOrder: Number })
const scheduleSchema = new mongoose.Schema({ day: String, time: String })
const faqSchema = new mongoose.Schema({ question: String, answer: String })

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  overview: String,
  courseDetails: String,
  bannerImageUrl: String,
  type: { type: String, default: 'course' },
  price: { type: Number, required: true },
  discountedPrice: Number,
  discountPercentage: Number,
  stripeProductId: String,
  stripePriceId: String,
  highlights: [highlightSchema],
  schedules: [scheduleSchema],
  faqs: [faqSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('Course', schema)
