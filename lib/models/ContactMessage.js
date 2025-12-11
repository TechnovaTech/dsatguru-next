import mongoose from 'mongoose'

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: String,
  message: String,
  sourcePage: String,
  responded: { type: Boolean, default: false }
}, {
  timestamps: true
})

export default mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema)