import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  siteName: { type: String, default: 'DSATGURU' },
  maintenanceMode: { type: Boolean, default: false },
  // Optional auto-off time for maintenance mode. When set and in the past,
  // maintenance is treated as OFF (the timer elapsed).
  maintenanceEndsAt: { type: Date, default: null },
  registrationEnabled: { type: Boolean, default: true }
}, {
  timestamps: true
})

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema)

// Finds the single global settings document, creating it with defaults if absent.
export async function getSettings() {
  let doc = await Setting.findOne({ key: 'global' })
  if (!doc) {
    doc = await Setting.create({ key: 'global' })
  }
  return doc
}

export default Setting
