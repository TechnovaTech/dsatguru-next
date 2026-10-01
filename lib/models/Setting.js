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
//
// Self-healing auto-off: when the maintenance timer has elapsed we actually clear
// the flag in the DB instead of only treating it as off at render time. Otherwise
// the admin toggle keeps showing "on" while the site is live, and re-saving that
// stale state silently does nothing — which is exactly how maintenance mode ends
// up looking broken.
export async function getSettings() {
  let doc = await Setting.findOne({ key: 'global' })
  if (!doc) {
    doc = await Setting.create({ key: 'global' })
    return doc
  }
  if (doc.maintenanceMode && doc.maintenanceEndsAt && new Date(doc.maintenanceEndsAt).getTime() <= Date.now()) {
    doc.maintenanceMode = false
    doc.maintenanceEndsAt = null
    await doc.save()
  }
  return doc
}

export default Setting
