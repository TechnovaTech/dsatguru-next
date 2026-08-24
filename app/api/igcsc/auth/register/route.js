import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { generateIgcscToken, hashPw } from '../../../../../lib/igcscAuth'

// Self-registration for IGCSE students.
export async function POST(request) {
  try {
    const body = await request.json()
    const name = (body?.name || '').trim()
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!name || !email || password.length < 6) {
      return NextResponse.json({ error: 'Name, valid email and a 6+ char password are required' }, { status: 400 })
    }

    const { IgcscUser } = await igcscModels()
    const exists = await IgcscUser.findOne({ email })
    if (exists) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })

    const user = await IgcscUser.create({
      name, email, password: await hashPw(password), role: 'student',
      yearGroup: body.yearGroup || '', subjects: Array.isArray(body.subjects) ? body.subjects : [], isActive: true,
    })
    const token = generateIgcscToken({ id: user._id.toString(), email: user.email, role: user.role })
    return NextResponse.json({
      token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
