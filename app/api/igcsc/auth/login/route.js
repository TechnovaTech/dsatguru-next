import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { generateIgcscToken, comparePw } from '../../../../../lib/igcscAuth'
import { rateLimit, clientIp } from '../../../../../lib/rateLimit'

export async function POST(request) {
  try {
    const limit = rateLimit('igcsc-login:' + clientIp(request), { max: 10, windowMs: 60000 })
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
    }
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null
    const password = typeof body?.password === 'string' ? body.password : null
    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { IgcscUser } = await igcscModels()
    const user = await IgcscUser.findOne({ email })
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const ok = await comparePw(password, user.password)
    if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    if (user.isActive === false) {
      return NextResponse.json({ error: 'Your account has been deactivated.' }, { status: 403 })
    }

    const token = generateIgcscToken({
      // `userId` and `name` are what the rest of the IGCSC API reads; without
      // them a student-restricted session matched nobody and participants
      // showed up as their email address.
      userId: user._id.toString(), id: user._id.toString(),
      name: user.name, email: user.email, role: user.role,
    })
    return NextResponse.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
