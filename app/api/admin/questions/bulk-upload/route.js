import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'

function parseCsv(text) {
  const rows = []
  let i = 0
  while (i < text.length) {
    const row = []
    while (i < text.length) {
      let field = ''
      let inQuotes = false
      while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++
      if (i < text.length && text[i] === '"') {
        inQuotes = true
        i++
      }
      while (i < text.length) {
        const char = text[i]
        if (inQuotes) {
          if (char === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              field += '"'
              i += 2
              continue
            } else {
              inQuotes = false
              i++
              break
            }
          } else {
            field += char
            i++
          }
        } else {
          if (char === ',') {
            i++
            break
          } else if (char === '\n' || char === '\r') {
            break
          } else {
            field += char
            i++
          }
        }
      }
      row.push(field.trim())
      if (i < text.length && text[i] === ',') {
        i++
      } else {
        break
      }
    }
    if (row.length > 0) rows.push(row)
    while (i < text.length && (text[i] === '\n' || text[i] === '\r')) i++
  }
  return rows
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const questionBankId = form.get('questionBankId')
    const images = form.getAll('images') || []

    if (!file || !questionBankId) {
      return NextResponse.json({ error: 'Missing file or questionBankId' }, { status: 400 })
    }

    const csvText = await file.text()
    const rows = parseCsv(csvText)
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'CSV has no data' }, { status: 400 })
    }
    const header = rows[0].map(h => (h || '').trim().toLowerCase())
    const idx = (name) => header.findIndex(h => h === name.toLowerCase())
    const idxTitle = idx('title')
    const idxContent = idx('content')
    const idxSubject = idx('subject')
    const idxDifficulty = idx('difficulty')
    const idxTestType = idx('testtype')
    const idxCorrect = idx('correctanswer')
    const idxA = idx('optiona')
    const idxB = idx('optionb')
    const idxC = idx('optionc')
    const idxD = idx('optiond')
    const idxParagraph = idx('questionparagraph')
    const idxExplanation = idx('explanation')
    const idxTags = idx('tags')
    const idxImage = idx('imagefilename')

    // Map images by filename for quick lookup (we only persist name as imageUrl)
    const imageNameSet = new Set(
      (images || [])
        .map(img => img?.name)
        .filter(Boolean)
        .map(n => n.toLowerCase())
    )

    // Ensure admin user exists
    let adminUser = await User.findOne({ role: 'Admin' })
    if (!adminUser) {
      const hashedPassword = await hashPassword('admin123')
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@dsatguru.com',
        password: hashedPassword,
        role: 'Admin'
      })
    }

    const toCreate = []
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (!cols || cols.length === 0) continue
      const title = idxTitle >= 0 ? (cols[idxTitle] || '').trim() : ''
      const content = idxContent >= 0 ? (cols[idxContent] || '').trim() : ''
      const subject = idxSubject >= 0 ? (cols[idxSubject] || '').trim() : 'Math'
      const difficulty = idxDifficulty >= 0 ? (cols[idxDifficulty] || '').trim() : 'Medium'
      const testType = idxTestType >= 0 ? (cols[idxTestType] || '').trim() : 'Base'
      const correctAnswer = idxCorrect >= 0 ? (cols[idxCorrect] || '').trim().toUpperCase() : 'A'
      const optionA = idxA >= 0 ? (cols[idxA] || '').trim() : ''
      const optionB = idxB >= 0 ? (cols[idxB] || '').trim() : ''
      const optionC = idxC >= 0 ? (cols[idxC] || '').trim() : ''
      const optionD = idxD >= 0 ? (cols[idxD] || '').trim() : ''
      const questionParagraph = idxParagraph >= 0 ? (cols[idxParagraph] || '').trim() : ''
      const explanation = idxExplanation >= 0 ? (cols[idxExplanation] || '').trim() : ''
      const tagsRaw = idxTags >= 0 ? (cols[idxTags] || '').trim() : ''
      const imageFileName = idxImage >= 0 ? (cols[idxImage] || '').trim() : ''
      const imageUrl = imageFileName && imageNameSet.has(imageFileName.toLowerCase()) ? imageFileName : ''

      const optionsArr = [optionA, optionB, optionC, optionD]
      const tagsArr = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : []

      toCreate.push({
        title,
        content,
        explanation,
        subject,
        difficulty,
        type: 'MultipleChoice',
        testType,
        correctAnswer,
        options: JSON.stringify(optionsArr),
        tags: JSON.stringify(tagsArr),
        points: 1,
        imageUrl: imageUrl || undefined,
        questionParagraph,
        questionBankId,
        createdBy: adminUser._id
      })
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ error: 'No questions parsed from CSV' }, { status: 400 })
    }

    const created = await Question.insertMany(toCreate)
    return NextResponse.json({
      success: true,
      message: 'Questions uploaded successfully',
      count: created.length
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk upload questions' }, { status: 500 })
  }
}

