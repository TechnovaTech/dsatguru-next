import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF, IGCSC_ADMIN } from '../../../../lib/igcscAuth'
import { MEETING_TYPES, DEFAULT_TYPE } from '../../../../lib/meetingStatus'

// IGCSC live sessions. Entirely inside the igcsc DB and igcsc auth — no
// DsatGuru data is read or written here.
//
//   GET                  → list (staff see all; students see only theirs)
//   POST   (admin/tutor) → create
//   PATCH  (admin/tutor) → update one (by id)
//   DELETE (admin)       → remove one (?id=)

function newRoom() {
  return `IGCSC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
}

function sanitize(body, existing = {}) {
  const type = MEETING_TYPES[body?.type] ? body.type : (existing.type || DEFAULT_TYPE)
  const out = {
    title: String(body?.title ?? existing.title ?? '').trim(),
    type,
    curriculum: String(body?.curriculum ?? existing.curriculum ?? '').trim(),
    subject: String(body?.subject ?? existing.subject ?? '').trim(),
    durationMinutes: Number(body?.durationMinutes) > 0
      ? Number(body.durationMinutes)
      : (existing.durationMinutes || MEETING_TYPES[type].defaultDuration),
    notes: String(body?.notes ?? existing.notes ?? ''),
  }
  if (body?.scheduledAt !== undefined) {
    const d = body.scheduledAt ? new Date(body.scheduledAt) : null
    out.scheduledAt = d && !isNaN(d.getTime()) ? d : null
  }
  if (Array.isArray(body?.allowedStudentIds)) out.allowedStudentIds = body.allowedStudentIds
  if (body?.status && ['scheduled', 'live', 'ended', 'cancelled'].includes(body.status)) {
    out.status = body.status
    if (body.status === 'live') out.startedAt = new Date()
    if (body.status === 'ended') out.endedAt = new Date()
  }
  if (body?.guestAccess) {
    const enabled = !!body.guestAccess.enabled
    out.guestAccess = {
      enabled,
      // Regenerate on demand; switching off clears the code so an old link dies.
      code: enabled
        ? (body.guestAccess.code || existing.guestAccess?.code || crypto.randomBytes(5).toString('hex'))
        : '',
    }
  }
  return out
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const { Meeting } = await igcscModels()
    const isStaff = IGCSC_STAFF.includes(auth.decoded.role)

    const filter = {}
    if (!isStaff) {
      // A student sees open sessions plus any booked specifically for them.
      filter.$or = [
        { allowedStudentIds: { $size: 0 } },
        { allowedStudentIds: { $exists: false } },
        { allowedStudentIds: auth.decoded.userId },
      ]
    }
    const items = await Meeting.find(filter).sort({ scheduledAt: -1, createdAt: -1 }).limit(300).lean()
    return NextResponse.json({
      meetings: items.map((m) => ({
        ...m,
        _id: m._id.toString(),
        // The guest code is a share secret — staff only.
        guestAccess: isStaff ? m.guestAccess : { enabled: !!m.guestAccess?.enabled },
      })),
      isStaff,
    })
  } catch (e) {
    console.error('GET /api/igcsc/meetings failed:', e?.message)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const data = sanitize(body)
    if (!data.title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 })

    const { Meeting } = await igcscModels()
    const created = await Meeting.create({
      ...data,
      roomName: newRoom(),
      status: 'scheduled',
      createdBy: auth.decoded.name || auth.decoded.email || 'Staff',
    })
    return NextResponse.json({ meeting: { ...created.toObject(), _id: created._id.toString() } }, { status: 201 })
  } catch (e) {
    console.error('POST /api/igcsc/meetings failed:', e?.message)
    return NextResponse.json({ error: 'Failed to create the session' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { Meeting } = await igcscModels()
    const existing = await Meeting.findById(id).lean()
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const update = sanitize(body, existing)
    if (body?.regenerateRoom) update.roomName = newRoom()
    const saved = await Meeting.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
    return NextResponse.json({ meeting: { ...saved, _id: saved._id.toString() } })
  } catch (e) {
    console.error('PATCH /api/igcsc/meetings failed:', e?.message)
    return NextResponse.json({ error: 'Failed to update the session' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { Meeting } = await igcscModels()
    await Meeting.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/igcsc/meetings failed:', e?.message)
    return NextResponse.json({ error: 'Failed to delete the session' }, { status: 500 })
  }
}
