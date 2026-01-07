import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import Course from '../../../../../lib/models/Course'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'
import ExcelJS from 'exceljs'

function generateQuestionId(bankTitle, bankType, difficulty, rowNumber) {
  // Extract first 3 letters from bank title
  const bankShort = bankTitle.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()
  
  // Type code
  const typeCode = bankType === 'Mathematics' ? 'MATH' : 'RW'
  
  // Difficulty code
  const diffCode = difficulty === 'Easy' ? 'ES' : difficulty === 'Hard' ? 'HD' : 'MD'
  
  return `${bankShort}${typeCode}-${diffCode}-${rowNumber}`
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  const rows = []
  worksheet.eachRow((row, rowNumber) => {
    const values = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values.push(cell.value ? String(cell.value) : '')
    })
    rows.push(values)
  })
  return rows
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const rows = []
  
  for (const line of lines) {
    const row = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"' && !inQuotes) {
        inQuotes = true
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    row.push(current.trim())
    if (row.some(cell => cell.length > 0)) {
      rows.push(row)
    }
  }
  
  return rows
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const questionBankId = form.get('questionBankId')
    const images = form.getAll('images') || []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!questionBankId) {
      return NextResponse.json({ error: 'No question bank selected' }, { status: 400 })
    }

    // Fetch question bank details
    const questionBank = await Course.findById(questionBankId)
    if (!questionBank) {
      return NextResponse.json({ error: 'Question bank not found' }, { status: 404 })
    }

    const csvText = await file.text()
    console.log('File name:', file.name)
    console.log('File size:', file.size)
    
    let rows
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Handle Excel file
      console.log('Parsing as Excel file')
      const buffer = await file.arrayBuffer()
      rows = await parseExcel(Buffer.from(buffer))
      console.log('Excel parsed, rows:', rows.length)
      if (rows.length > 0) console.log('First Excel row:', rows[0])
      if (rows.length > 1) console.log('Second Excel row:', rows[1])
    } else {
      // Handle CSV file
      console.log('Parsing as CSV file')
      if (!csvText || csvText.trim().length === 0) {
        return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
      }
      rows = parseCsv(csvText)
    }
    console.log(`Parsed ${rows.length} rows`)
    if (rows.length > 0) console.log('First row (header):', rows[0])
    if (rows.length > 1) console.log('Second row sample:', rows[1])
    
    if (!rows || rows.length < 2) {
      console.error('Not enough rows. Total rows:', rows.length)
      return NextResponse.json({ error: 'File must have header and at least one data row' }, { status: 400 })
    }
    const header = rows[0].map(h => (h || '').trim().toLowerCase())
    const idx = (name) => header.findIndex(h => h === name.toLowerCase())
    
    // Try multiple column name variations
    const idxTitle = idx('title')
    const idxContent = idx('content') >= 0 ? idx('content') : header.findIndex(h => h.includes('ques'))
    const idxSubject = idx('subject')
    const idxDifficulty = idx('difficulty')
    const idxCorrect = idx('correctanswer') >= 0 ? idx('correctanswer') : idx('correct answer')
    const idxA = idx('optiona') >= 0 ? idx('optiona') : idx('option a')
    const idxB = idx('optionb') >= 0 ? idx('optionb') : idx('option b')
    const idxC = idx('optionc') >= 0 ? idx('optionc') : idx('option c')
    const idxD = idx('optiond') >= 0 ? idx('optiond') : idx('option d')
    const idxParagraph = idx('questionparagraph')
    const idxExplanation = idx('explanation') >= 0 ? idx('explanation') : idx('short explanation')
    const idxShortExpl = idx('shortexplanation') >= 0 ? idx('shortexplanation') : idx('short explanation')
    const idxLongExpl = idx('longexplanation')
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

    console.log('CSV header:', header)
    console.log('Column indices:', { idxTitle, idxContent, idxSubject, idxDifficulty, idxCorrect, idxA, idxB, idxC, idxD })
    
    const toCreate = []
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (!cols || cols.length === 0) continue
      
      const content = idxContent >= 0 ? (cols[idxContent] || '').trim() : ''
      console.log(`Row ${r} content:`, content)
      
      if (!content || content.trim().length === 0) {
        console.warn(`Skipping row ${r}: empty content`)
        continue
      }
      
      const title = idxTitle >= 0 ? (cols[idxTitle] || '').trim() : ''
      const subject = idxSubject >= 0 ? (cols[idxSubject] || '').trim() : 'Math'
      const difficulty = idxDifficulty >= 0 ? (cols[idxDifficulty] || '').trim() : 'Medium'
      const correctAnswer = idxCorrect >= 0 ? (cols[idxCorrect] || '').trim().toUpperCase() : 'A'
      const optionA = idxA >= 0 ? (cols[idxA] || '').trim() : ''
      const optionB = idxB >= 0 ? (cols[idxB] || '').trim() : ''
      const optionC = idxC >= 0 ? (cols[idxC] || '').trim() : ''
      const optionD = idxD >= 0 ? (cols[idxD] || '').trim() : ''
      const questionParagraph = idxParagraph >= 0 ? (cols[idxParagraph] || '').trim() : ''
      const explanation = idxExplanation >= 0 ? (cols[idxExplanation] || '').trim() : ''
      const shortExplanation = idxShortExpl >= 0 ? (cols[idxShortExpl] || '').trim() : explanation
      const longExplanation = idxLongExpl >= 0 ? (cols[idxLongExpl] || '').trim() : explanation
      const tagsRaw = idxTags >= 0 ? (cols[idxTags] || '').trim() : ''
      const imageFileName = idxImage >= 0 ? (cols[idxImage] || '').trim() : ''
      const imageUrl = imageFileName && imageNameSet.has(imageFileName.toLowerCase()) ? imageFileName : ''

      const optionsArr = [optionA, optionB, optionC, optionD]
      const tagsArr = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : []
      
      // Generate custom question ID
      const questionId = generateQuestionId(
        questionBank.title,
        questionBank.questionBankType || 'Reading and Writing',
        difficulty,
        r
      )
      
      toCreate.push({
        questionId,
        title,
        content,
        explanation,
        shortExplanation,
        longExplanation,
        subject,
        difficulty,
        type: 'MultipleChoice',
        testType: 'Base',
        correctAnswer,
        options: JSON.stringify(optionsArr),
        tags: JSON.stringify(tagsArr),
        points: 1,
        isActive: true,
        imageUrl: imageUrl || undefined,
        questionParagraph,
        questionBankId,
        createdBy: adminUser._id
      })
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ error: 'No questions parsed from CSV' }, { status: 400 })
    }

    console.log(`Attempting to create ${toCreate.length} questions`)
    console.log('Sample question data:', JSON.stringify(toCreate[0], null, 2))
    
    try {
      const created = await Question.insertMany(toCreate)
      console.log(`Successfully created ${created.length} questions`)
      return NextResponse.json({
        success: true,
        message: 'Questions uploaded successfully',
        count: created.length
      })
    } catch (dbError) {
      console.error('Database insertion error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save questions to database', 
        details: dbError.message 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to bulk upload questions', 
      details: error.message 
    }, { status: 500 })
  }
}

