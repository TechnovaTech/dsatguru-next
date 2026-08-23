import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { QuestionBank } = await igcscModels()
    const banks = await QuestionBank.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(banks.map((b) => ({ ...b, _id: b._id.toString() })))
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch question banks' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const body = await request.json()
    if (!body?.title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const { QuestionBank } = await igcscModels()
    const bank = await QuestionBank.create({
      title: body.title, subject: body.subject || '', description: body.description || '',
      totalQuestions: Number(body.totalQuestions) || 0, status: 'Active',
    })
    return NextResponse.json({ ...bank.toObject(), _id: bank._id.toString() }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create question bank' }, { status: 500 })
  }
}
