import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import Course from '../../../../../lib/models/Course'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'
import ExcelJS from 'exceljs'
import { generateQuestionId } from '../../../../../lib/idGenerator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  
  // Get first worksheet (ignore sheet name issues)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file')
  }
  
  const rows = []
  worksheet.eachRow((row, rowNumber) => {
    const values = []
    let hasContent = false
    row.eachCell({ includeEmpty: true }, (cell) => {
      // Handle different cell types
      let value = ''
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && cell.value.richText) {
          // Handle rich text
          value = cell.value.richText.map(t => t.text).join('')
        } else if (typeof cell.value === 'object' && cell.value.text) {
          value = cell.value.text
        } else {
          value = String(cell.value)
        }
        if (value.trim()) hasContent = true
      }
      values.push(value)
    })
    // Only add rows that have some content
    if (hasContent || rowNumber === 1) {
      rows.push(values)
    }
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
    const isTutor = form.get('isTutor') === 'true'
    const defaultSubject = form.get('defaultSubject')
    const images = form.getAll('images') || []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!questionBankId && !isTutor) {
      return NextResponse.json({ error: 'No question bank selected' }, { status: 400 })
    }

    // Fetch question bank details (only if not tutor mode)
    let questionBank = null
    if (!isTutor && questionBankId) {
      questionBank = await Course.findById(questionBankId)
      if (!questionBank) {
        return NextResponse.json({ error: 'Question bank not found' }, { status: 404 })
      }
    }

    const csvText = await file.text()
    console.log('File name:', file.name)
    console.log('File size:', file.size)
    
    let rows
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Handle Excel file
      console.log('Parsing as Excel file')
      try {
        const buffer = await file.arrayBuffer()
        rows = await parseExcel(Buffer.from(buffer))
        console.log('Excel parsed, rows:', rows.length)
        if (rows.length > 0) console.log('First Excel row:', rows[0])
        if (rows.length > 1) console.log('Second Excel row:', rows[1])
      } catch (excelError) {
        console.error('Excel parsing failed:', excelError.message)
        // Try CSV parsing as fallback
        console.log('Attempting CSV fallback parsing...')
        try {
          rows = parseCsv(csvText)
          console.log('CSV fallback successful, rows:', rows.length)
        } catch (csvError) {
          return NextResponse.json({ 
            error: 'Failed to parse file. Please ensure it is a valid Excel (.xlsx) or CSV file.', 
            details: `Excel error: ${excelError.message}. CSV fallback also failed.` 
          }, { status: 400 })
        }
      }
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
    
    // Match exact column names from Excel file
    const idxContent = idx('question')
    const idxA = idx('option a')
    const idxB = idx('option b')
    const idxC = idx('option c')
    const idxD = idx('option d')
    const idxCorrect = idx('correct answer')
    const idxShortExpl = idx('short explanation')
    const idxLongExpl = idx('long explanation')
    const idxDifficulty = idx('difficulty')
    const idxTags = idx('tag')
    const idxSubject = idx('subject')

    // Save uploaded images to public/uploads/questions/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      console.log('Upload directory exists or created')
    }

    const imageNameMap = new Map()
    for (const img of images) {
      if (!img || !img.name) continue
      try {
        const buffer = Buffer.from(await img.arrayBuffer())
        const filename = `${Date.now()}-${img.name}`
        const filepath = path.join(uploadDir, filename)
        await writeFile(filepath, buffer)
        imageNameMap.set(img.name.toLowerCase(), `/uploads/questions/${filename}`)
        console.log(`Saved image: ${filename}`)
      } catch (err) {
        console.error(`Failed to save image ${img.name}:`, err)
      }
    }

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
    console.log('Column indices:', { idxContent, idxSubject, idxDifficulty, idxCorrect, idxA, idxB, idxC, idxD })
    
    if (idxContent < 0) {
      return NextResponse.json({ 
        error: 'Question column not found. Please ensure your file has a "Question" column.', 
        details: `Available columns: ${header.join(', ')}` 
      }, { status: 400 })
    }
    
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
      
      let subject = idxSubject >= 0 ? (cols[idxSubject] || '').trim() : ''
      if (!subject && defaultSubject) subject = defaultSubject
      if (!subject) subject = 'Math'

      let difficulty = idxDifficulty >= 0 ? (cols[idxDifficulty] || '').trim() : 'Medium'
      if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        difficulty = 'Medium'
      }
      const correctAnswer = idxCorrect >= 0 ? (cols[idxCorrect] || '').trim().toUpperCase() : 'A'
      const optionA = idxA >= 0 ? (cols[idxA] || '').trim() : ''
      const optionB = idxB >= 0 ? (cols[idxB] || '').trim() : ''
      const optionC = idxC >= 0 ? (cols[idxC] || '').trim() : ''
      const optionD = idxD >= 0 ? (cols[idxD] || '').trim() : ''
      const shortExplanation = idxShortExpl >= 0 ? (cols[idxShortExpl] || '').trim() : ''
      const longExplanation = idxLongExpl >= 0 ? (cols[idxLongExpl] || '').trim() : ''
      const tagsRaw = idxTags >= 0 ? (cols[idxTags] || '').trim() : ''

      const optionsArr = [optionA, optionB, optionC, optionD]
      const tagsArr = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : []
      
      // Generate custom question ID based on Subject, Tag, Difficulty, Row Number
      const questionId = generateQuestionId(
        subject,
        tagsArr[0] || 'General',
        difficulty,
        r
      )
      
      toCreate.push({
        questionId,
        title: content.substring(0, 100),
        content,
        explanation: shortExplanation || longExplanation,
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
        questionBankId: isTutor ? null : questionBankId,
        isTutor: isTutor,
        createdBy: adminUser._id
      })
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ 
        error: 'No valid questions found in file', 
        details: `Parsed ${rows.length - 1} rows but all were empty or missing required content. Please check your file format.` 
      }, { status: 400 })
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

