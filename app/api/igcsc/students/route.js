import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF, IGCSC_ADMIN, hashPw } from '../../../../lib/igcscAuth'

// The people on IGCSC.
//
// This used to serve a `Student` collection that had no password field and no
// link to the accounts people actually log in with, so a student an admin
// "created" here could never sign in, and one who signed up never appeared.
// There is one record per person now — see lib/igcscDb.js — and this is it.
const ROLES = ['student', 'tutor', 'admin']

// Everything a caller may see. Listing or returning the password hash, even to
// an admin, puts it somewhere it has no reason to be.
const SAFE = 'name email role yearGroup subjects targetGrade targetDate guardianEmail assignedTests isActive createdAt'

function clean(doc) {
  return { ...doc, _id: String(doc._id) }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error

    const role = new URL(request.url).searchParams.get('role')
    // Students by default: every existing caller (the tracker, test allocation)
    // asks this endpoint for students and nothing else.
    const query = role === 'all' ? {} : { role: ROLES.includes(role) ? role : 'student' }

    const { IgcscUser } = await igcscModels()
    const people = await IgcscUser.find(query).select(SAFE).sort({ createdAt: -1 }).limit(1000).lean()
    return NextResponse.json(people.map(clean))
  } catch (e) {
    console.error('GET /api/igcsc/students failed:', e?.message)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error

    const body = await request.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    // Coerced to a string before it reaches the query, so an object cannot be
    // smuggled in as a Mongo operator.
    const email = String(body?.email || '').toLowerCase().trim()
    const password = typeof body?.password === 'string' ? body.password : ''
    const role = ROLES.includes(body?.role) ? body.role : 'student'

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A password of at least 6 characters is required — it is how they sign in.' }, { status: 400 })
    }

    const { IgcscUser } = await igcscModels()
    if (await IgcscUser.findOne({ email })) {
      return NextResponse.json({ error: 'Someone with this email already exists.' }, { status: 400 })
    }

    const user = await IgcscUser.create({
      name,
      email,
      password: await hashPw(password),
      role,
      yearGroup: String(body?.yearGroup || ''),
      subjects: Array.isArray(body?.subjects) ? body.subjects.map(String) : [],
      targetGrade: String(body?.targetGrade || ''),
      targetDate: body?.targetDate ? new Date(body.targetDate) : null,
      guardianEmail: String(body?.guardianEmail || ''),
      isActive: true,
    })

    const { password: _drop, ...safe } = user.toObject()
    return NextResponse.json(clean(safe), { status: 201 })
  } catch (e) {
    // The unique index is the real guarantee; the lookup above only makes the
    // common case a tidy message.
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'Someone with this email already exists.' }, { status: 400 })
    }
    console.error('POST /api/igcsc/students failed:', e?.message)
    return NextResponse.json({ error: 'Could not create that user.' }, { status: 500 })
  }
}
