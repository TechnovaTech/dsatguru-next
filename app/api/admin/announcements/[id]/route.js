import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Announcement from '../../../../../lib/models/Announcement'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

// Delete an announcement (admins only)
export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()

    const { id } = params

    const deleted = await Announcement.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete announcement error:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
