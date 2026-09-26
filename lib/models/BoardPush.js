import mongoose from 'mongoose'

// The rendezvous between a desktop snipping helper and a live whiteboard.
//
// A browser cannot read another window on the machine — getDisplayMedia always
// asks which screen to share, and nothing in the web platform gets around that.
// So the snip is taken OUTSIDE the browser (Windows' own Win+Shift+S puts it on
// the clipboard) and a tiny helper posts it here; the board polls and draws it.
//
// The helper has no session, so a short room-scoped code is its only credential.
// Only a tutor or admin can mint one, it dies on its own, and it can push a
// bounded number of images — a leaked code is then a nuisance the host can undo,
// not a way into anything.
const CODE_TTL_HOURS = 12
const MAX_PUSHES_PER_CODE = 400

const boardPushCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  room: { type: String, required: true, index: true },
  // Who minted it, for the audit trail — a plain string because the two
  // products that share this endpoint have different user collections.
  ownerId: { type: String, index: true },
  ownerName: String,
  product: { type: String, default: 'dsat' },
  used: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
})
// Mongo drops the document itself once it expires; nothing to sweep.
boardPushCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const boardPushSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  room: { type: String, index: true },
  url: { type: String, required: true },
  // Already drawn on the board. Kept briefly rather than deleted so a poll that
  // is retried does not lose the image.
  consumed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})
boardPushSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

export const BoardPushCode =
  mongoose.models.BoardPushCode || mongoose.model('BoardPushCode', boardPushCodeSchema)
export const BoardPush =
  mongoose.models.BoardPush || mongoose.model('BoardPush', boardPushSchema)
export { CODE_TTL_HOURS, MAX_PUSHES_PER_CODE }
