import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { Student } = await igcscModels()
    const students = await Student.find({}).sort({ createdAt: -1 }).limit(1000).lean()
    return NextResponse.json(students.map((s) => ({ ...s, _id: s._id.toString() })))
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const body = await request.json()
    if (!body?.name || !body?.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    const { Student } = await igcscModels()
    const exists = await Student.findOne({ email: String(body.email).toLowerCase() })
    if (exists) return NextResponse.json({ error: 'A student with this email already exists' }, { status: 400 })
    const student = await Student.create({
      name: body.name,
      email: String(body.email).toLowerCase(),
      yearGroup: body.yearGroup || '',
      targetGrade: body.targetGrade || '',
      targetDate: body.targetDate || null,
      subjects: Array.isArray(body.subjects) ? body.subjects : [],
      guardianEmail: body.guardianEmail || '',
      isActive: true,
    })
    return NextResponse.json({ ...student.toObject(), _id: student._id.toString() }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
