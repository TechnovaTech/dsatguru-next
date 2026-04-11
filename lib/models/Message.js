import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileType: { type: String, default: '' },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ userId: mongoose.Schema.Types.ObjectId, emoji: String }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  lastSenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema)
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)
