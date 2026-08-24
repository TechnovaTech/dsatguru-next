import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { generateIgcscToken, comparePw } from '../../../../../lib/igcscAuth'

export async function POST(request) {
  try {
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

    const token = generateIgcscToken({ id: user._id.toString(), email: user.email, role: user.role })
    return NextResponse.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
