import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'
import Setting, { getSettings } from '../../../../lib/models/Setting'
import { logger } from '../../../../lib/logger'

// Fields a client is allowed to update — never spread the raw body.
const BOOLEAN_FIELDS = ['maintenanceMode', 'registrationEnabled']
const STRING_FIELDS = ['siteName']

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    logger.error('Fetch settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()

    const update = {}
    for (const field of BOOLEAN_FIELDS) {
      if (field in body) update[field] = Boolean(body[field])
    }
    for (const field of STRING_FIELDS) {
      if (field in body) update[field] = String(body[field] ?? '')
    }
    // Optional maintenance auto-off timer (Date or null to clear). A time that has
    // already passed is a leftover from an earlier window — keeping it would switch
    // maintenance straight back off, so treat it as "no timer" instead.
    if ('maintenanceEndsAt' in body) {
      const ends = body.maintenanceEndsAt ? new Date(body.maintenanceEndsAt) : null
      const valid = ends && !isNaN(ends.getTime()) && ends.getTime() > Date.now()
      update.maintenanceEndsAt = valid ? ends : null
    }
    // Turning maintenance off also clears any pending auto-off timer.
    if (update.maintenanceMode === false) update.maintenanceEndsAt = null

    // Ensure the global doc exists before applying the whitelisted update.
    await getSettings()
    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true }
    )

    return NextResponse.json(settings)
  } catch (error) {
    logger.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
