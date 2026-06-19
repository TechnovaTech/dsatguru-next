import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import { requireRole } from '../../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function GET(request, { params }) {
  try {
    // Admin endpoint exposes the full question incl. answer key — restrict to staff.
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const question = await Question.findById(params.id)
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    let parsedOptions = []
    try { parsedOptions = question.options ? JSON.parse(question.options) : [] } catch (e) { parsedOptions = [] }
    let parsedTags = []
    try { parsedTags = question.tags ? JSON.parse(question.tags) : [] } catch (e) { parsedTags = [] }
    const data = {
      id: question._id,
      title: question.title,
      questionParagraph: question.questionParagraph,
      content: question.content,
      explanation: question.explanation,
      shortExplanation: question.shortExplanation,
      longExplanation: question.longExplanation,
      subject: question.subject,
      difficulty: question.difficulty,
      testType: question.testType,
      type: question.type,
      correctAnswer: question.correctAnswer,
      options: parsedOptions,
      tags: parsedTags,
      points: question.points,
      imageUrl: question.imageUrl,
      isActive: question.isActive,
      questionBankId: question.questionBankId,
      remark: question.remark || ''
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()
    
    console.log('🔧 API PUT /api/admin/questions/[id] - Received Data:', {
      questionId: params.id,
      remarkInBody: body.remark,
      remarkExists: !!body.remark,
      remarkLength: (body.remark || '').length,
      bodyKeys: Object.keys(body)
    })
    
    const update = { ...body }
    if (Array.isArray(body.options)) update.options = JSON.stringify(body.options)
    if (Array.isArray(body.tags)) update.tags = JSON.stringify(body.tags)
    
    console.log('💾 Updating database with remark:', {
      questionId: params.id,
      remarkToSave: update.remark,
      updateKeys: Object.keys(update)
    })
    
    // Log the exact update object being sent
    console.log('📋 Full update object:', JSON.stringify(update, null, 2))
    
    const updated = await Question.findByIdAndUpdate(
      params.id, 
      { $set: update }, 
      { new: true, runValidators: false }
    )
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    // Log the full updated document
    console.log('📄 Full updated document:', {
      _id: updated._id,
      questionId: updated.questionId,
      remark: updated.remark,
      allFields: Object.keys(updated.toObject())
    })
    
    console.log('✅ Database updated successfully:', {
      questionId: params.id,
      savedRemark: updated.remark,
      remarkSavedSuccessfully: !!updated.remark
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating question:', error)
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()
    const updated = await Question.findByIdAndUpdate(params.id, { isActive: !!body.isActive }, { new: true })
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, isActive: updated.isActive })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const updated = await Question.findByIdAndUpdate(params.id, { isActive: false }, { new: true })
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}
