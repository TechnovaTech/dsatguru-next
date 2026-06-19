import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, enum: ['all', 'students', 'tutors'], default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true
})

announcementSchema.index({ createdAt: -1 })

export default mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema)
