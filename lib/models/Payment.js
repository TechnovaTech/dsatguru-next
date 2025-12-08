import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseEnrollment' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentGateway: { type: String, default: 'stripe' },
  paymentIntentId: { type: String, index: true },
  status: { type: String, default: 'Pending' },
  receiptUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.Payment || mongoose.model('Payment', schema)
