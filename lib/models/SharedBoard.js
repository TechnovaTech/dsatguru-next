import mongoose from 'mongoose'

// A whiteboard a tutor shared out of a live class.
//
// `recipients` empty = everyone who was entitled to that class; otherwise only
// the named students see it. The image is stored as a file under
// /public/uploads/boards and referenced by URL — a base64 data URI would bloat
// every list query.
const sharedBoardSchema = new mongoose.Schema({
  room: { type: String, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  meetingTitle: String,
  title: { type: String, default: 'Class whiteboard' },
  imageUrl: { type: String, required: true },
  sharedBy: String,
  sharedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Plain strings, not ObjectIds: a recipient can be a signed-in student
  // (their user id) OR an in-meeting guest ("guest-…"), and casting the latter
  // to an ObjectId threw, which is what made sharing to a guest fail.
  recipients: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
})

export default mongoose.models.SharedBoard || mongoose.model('SharedBoard', sharedBoardSchema)
