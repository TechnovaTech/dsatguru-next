import mongoose from 'mongoose'

if (process.env.NODE_ENV === 'development' && mongoose.models.OTP) {
  delete mongoose.models.OTP
}

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['register', 'forgot-password'], required: true },
  // Store pending registration data so we don't create user until OTP verified
  pendingData: { type: mongoose.Schema.Types.Mixed, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL index
}, { timestamps: true })

export default mongoose.models.OTP || mongoose.model('OTP', otpSchema)
