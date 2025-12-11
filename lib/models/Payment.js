import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseEnrollment', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentGateway: { type: String, default: 'stripe' },
  paymentIntentId: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Succeeded', 'Failed', 'Refunded', 'Cancelled'], default: 'Pending' },
  receiptUrl: String,
  deletedAt: Date
}, {
  timestamps: true
})

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema)