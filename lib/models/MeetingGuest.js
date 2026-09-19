import mongoose from 'mongoose'

// A knock on the waiting-room door.
//
// A guest (someone without a DsatGuru account) who opens a guest link creates
// one of these and polls it. They are NEVER given a LiveKit token until a host
// approves — so a leaked link cannot put a stranger inside a live class.
// Rows self-destruct after 6 hours.
const meetingGuestSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  name: { type: String, required: true },
  // Random secret the guest's browser holds; it is how they claim their own
  // request without being able to read anyone else's.
  claimId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending', index: true },
  decidedBy: String,
  decidedAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 6 },
})

export default mongoose.models.MeetingGuest || mongoose.model('MeetingGuest', meetingGuestSchema)
