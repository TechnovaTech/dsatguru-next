import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN, hashPw } from '../../../../../lib/igcscAuth'

// Edit, suspend or remove one person.
//
//   PUT    — details, role, profile, and a password reset
//   PATCH  — the active switch on its own
//   DELETE — remove them
//
// All admin-only, and all refusing to act on the caller's own account in a way
// that would lock them out of the portal they are standing in.
const ROLES = ['student', 'tutor', 'admin']
const SAFE = 'name email role yearGroup subjects targetGrade targetDate guardianEmail assignedTests isActive createdAt'

// An admin who demotes, suspends or deletes the last admin leaves nobody who
// can undo it — the portal would need a database to recover.
async function wouldStrandThePortal(IgcscUser, user, { stillAdmin }) {
  if (user.role !== 'admin' || stillAdmin) return false
  const others = await IgcscUser.countDocuments({ role: 'admin', isActive: { $ne: false }, _id: { $ne: user._id } })
  return others === 0
}

export async function PUT(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error

    const { IgcscUser } = await igcscModels()
    const user = await IgcscUser.findById(params.id)
    if (!user) return NextResponse.json({ error: 'That user no longer exists.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))

    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim()

    if (typeof body.email === 'string' && body.email.trim()) {
      const email = String(body.email).toLowerCase().trim()
      if (email !== user.email) {
        if (await IgcscUser.findOne({ email, _id: { $ne: user._id } })) {
          return NextResponse.json({ error: 'Someone with this email already exists.' }, { status: 400 })
        }
        user.email = email
      }
    }

    if (ROLES.includes(body.role) && body.role !== user.role) {
      if (await wouldStrandThePortal(IgcscUser, user, { stillAdmin: body.role === 'admin' })) {
        return NextResponse.json({ error: 'This is the only admin left — make someone else an admin first.' }, { status: 400 })
      }
      user.role = body.role
    }

    for (const field of ['yearGroup', 'targetGrade', 'guardianEmail']) {
      if (field in body) user[field] = String(body[field] || '')
    }
    if ('subjects' in body) user.subjects = Array.isArray(body.subjects) ? body.subjects.map(String) : []
    if ('targetDate' in body) user.targetDate = body.targetDate ? new Date(body.targetDate) : null

    // Blank means "leave it alone" — the form cannot show the existing one.
    if (typeof body.password === 'string' && body.password.trim()) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'A new password must be at least 6 characters.' }, { status: 400 })
      }
      user.password = await hashPw(body.password)
    }

    await user.save()
    const fresh = await IgcscUser.findById(user._id).select(SAFE).lean()
    return NextResponse.json({ ...fresh, _id: String(fresh._id) })
  } catch (e) {
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'Someone with this email already exists.' }, { status: 400 })
    }
    console.error('PUT /api/igcsc/students/[id] failed:', e?.message)
    return NextResponse.json({ error: 'Could not save those changes.' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error

    const body = await request.json().catch(() => ({}))
    const isActive = body?.isActive === true

    const { IgcscUser } = await igcscModels()
    const user = await IgcscUser.findById(params.id)
    if (!user) return NextResponse.json({ error: 'That user no longer exists.' }, { status: 404 })

    if (!isActive) {
      if (String(user._id) === String(auth.decoded.userId || auth.decoded.id)) {
        return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 })
      }
      if (await wouldStrandThePortal(IgcscUser, user, { stillAdmin: false })) {
        return NextResponse.json({ error: 'This is the only admin left — make someone else an admin first.' }, { status: 400 })
      }
    }

    user.isActive = isActive
    await user.save()
    const fresh = await IgcscUser.findById(user._id).select(SAFE).lean()
    return NextResponse.json({ ...fresh, _id: String(fresh._id) })
  } catch (e) {
    console.error('PATCH /api/igcsc/students/[id] failed:', e?.message)
    return NextResponse.json({ error: 'Could not change that.' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error

    const { IgcscUser } = await igcscModels()
    const user = await IgcscUser.findById(params.id)
    if (!user) return NextResponse.json({ error: 'That user no longer exists.' }, { status: 404 })

    if (String(user._id) === String(auth.decoded.userId || auth.decoded.id)) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
    }
    if (await wouldStrandThePortal(IgcscUser, user, { stillAdmin: false })) {
      return NextResponse.json({ error: 'This is the only admin left — make someone else an admin first.' }, { status: 400 })
    }

    await IgcscUser.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'User removed.' })
  } catch (e) {
    console.error('DELETE /api/igcsc/students/[id] failed:', e?.message)
    return NextResponse.json({ error: 'Could not remove that user.' }, { status: 500 })
  }
}
