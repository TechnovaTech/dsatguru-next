import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { getSettings } from '../../../../lib/models/Setting'

// Public, unauthenticated read of the few settings the whole site needs
// (maintenance gate + site name). Fails OPEN: if anything goes wrong we report
// maintenance as off so a glitch can never lock everyone out of the site.
export async function GET() {
  try {
    await connectDB()
    const s = await getSettings()
    return NextResponse.json({
      siteName: s.siteName || 'DSATGURU',
      maintenanceMode: !!s.maintenanceMode,
      maintenanceEndsAt: s.maintenanceEndsAt || null,
      registrationEnabled: s.registrationEnabled !== false
    })
  } catch (error) {
    return NextResponse.json({ siteName: 'DSATGURU', maintenanceMode: false, maintenanceEndsAt: null, registrationEnabled: true })
  }
}
