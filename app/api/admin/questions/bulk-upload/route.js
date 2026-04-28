import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import Course from '../../../../../lib/models/Course'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'
import ExcelJS from 'exceljs'
import { generateQuestionId } from '../../../../../lib/idGenerator'
import { writeFile, mkdir, appendFile } from 'fs/promises'
import path from 'path'

async function logDebug(message) {
  const logPath = path.join(process.cwd(), 'debug_upload.log')
  const timestamp = new Date().toISOString()
  await appendFile(logPath, `[${timestamp}] ${message}\n`)
}

async function parseExcel(buffer) {
  await logDebug('Starting parseExcel')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  
  // Find first worksheet with data
  const worksheet = workbook.worksheets.find(sheet => sheet.actualRowCount > 0) || workbook.worksheets[0]
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file')
  }
  console.log(`Using worksheet: ${worksheet.name} (Rows: ${worksheet.actualRowCount})`)
  await logDebug(`Using worksheet: ${worksheet.name} (Rows: ${worksheet.actualRowCount})`)
  
  // Extract embedded images
          const imagesByRow = {} // Key: rowNumber (number), Value: string[] (markdowns)
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
          await mkdir(uploadDir, { recursive: true })

          const images = worksheet.getImages() || []
          await logDebug(`Found ${images.length} embedded images`)
          
          if (images.length > 0) {
            console.log(`Found ${images.length} embedded images`)
            for (const image of images) {
               // exceljs range.tl is 0-based { col, row }
               const row = Math.floor(image.range.tl.row) + 1
               const col = Math.floor(image.range.tl.col) + 1
               
               await logDebug(`Image found at raw TL: row=${image.range.tl.row}, col=${image.range.tl.col} -> Mapped to Row ${row}`)
               
               const mediaId = image.imageId
               const media = workbook.model.media ? workbook.model.media.find(m => m.index === mediaId) : null
               
               if (media && media.buffer) {
                 const extension = media.extension || 'png'
                 const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`
                 const filepath = path.join(uploadDir, filename)
                 await writeFile(filepath, media.buffer)
                 
                 const publicUrl = `/uploads/questions/${filename}`
                 const md = `![image](${publicUrl})`
                 
                 if (!imagesByRow[row]) imagesByRow[row] = []
                 imagesByRow[row].push(md)
                 
                 console.log(`Extracted embedded image at Row ${row} -> ${publicUrl}`)
                 await logDebug(`Saved image to ${publicUrl} and mapped to Row ${row}`)
               } else {
                 await logDebug(`Image media not found or empty buffer for imageId ${mediaId}`)
               }
            }
          }
          
          const rows = []
          const maxCols = Math.max(worksheet.columnCount, 20) // Ensure we cover enough columns
          
          // We need to ensure rows align with 1-based index
          // worksheet.rowCount gives max row.
          const rowCount = worksheet.rowCount
          
          for (let i = 1; i <= rowCount; i++) {
             const row = worksheet.getRow(i)
             const values = []
             let hasContent = false
             
             for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
                const cell = row.getCell(colNumber)
                let value = ''
                if (cell.value !== null && cell.value !== undefined) {
                    if (typeof cell.value === 'object' && cell.value.richText) {
                        value = cell.value.richText.map(t => t.text).join('')
                    } else if (typeof cell.value === 'object' && cell.value.text) {
                        value = cell.value.text
                    } else {
                        value = String(cell.value)
                    }
                    if (value.trim()) hasContent = true
                }
                values.push(value)
             }
             rows.push(values)
          }

          await logDebug(`Parsed ${rows.length} rows from Excel`)
          return { rows, imagesByRow }
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
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
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
    // if (!questionBankId && !isTutor) {
    //   return NextResponse.json({ error: 'No question bank selected' }, { status: 400 })
    // }

    // Fetch question bank details (only if not tutor mode and questionBankId is provided)
    let questionBank = null
    if (!isTutor && questionBankId && questionBankId.length === 24) {
      questionBank = await Course.findById(questionBankId)
      if (!questionBank) {
        return NextResponse.json({ error: 'Question bank not found' }, { status: 404 })
      }
    }

    const csvText = await file.text()
    console.log('File name:', file.name)
    console.log('File size:', file.size)
    
    let rows
    let imagesByRow = {}
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Handle Excel file
      console.log('Parsing as Excel file')
      try {
        const buffer = await file.arrayBuffer()
        const result = await parseExcel(Buffer.from(buffer))
        rows = result.rows
        imagesByRow = result.imagesByRow
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
      await logDebug(`Not enough rows. Total rows: ${rows.length}`)
      return NextResponse.json({ error: 'File must have header and at least one data row' }, { status: 400 })
    }
    const header = rows[0].map(h => (h || '').trim().toLowerCase())
    await logDebug(`Header row: ${JSON.stringify(header)}`)
    const idx = (name) => header.findIndex(h => h === name.toLowerCase())
    
    // Helper to find index by multiple possible names
    const findIdx = (possibleNames) => {
      for (const name of possibleNames) {
        const i = idx(name)
        if (i >= 0) return i
      }
      return -1
    }

    // Match exact column names from Excel file (with fallbacks)
    const idxContent = findIdx(['question', 'content', 'question text', 'q', 'ques', 'questiontext'])
    const idxA = findIdx(['option a', 'a', '(a)', 'choice a', 'answer a', 'optiona', 'choicea', 'answera', 'option 1', 'choice 1', '1', 'opt a', 'opt 1', 'a.', 'opt. a', 'choice. a'])
    const idxB = findIdx(['option b', 'b', '(b)', 'choice b', 'answer b', 'optionb', 'choiceb', 'answerb', 'option 2', 'choice 2', '2', 'opt b', 'opt 2', 'b.', 'opt. b', 'choice. b'])
    const idxC = findIdx(['option c', 'c', '(c)', 'choice c', 'answer c', 'optionc', 'choicec', 'answerc', 'option 3', 'choice 3', '3', 'opt c', 'opt 3', 'c.', 'opt. c', 'choice. c'])
    const idxD = findIdx(['option d', 'd', '(d)', 'choice d', 'answer d', 'optiond', 'choiced', 'answerd', 'option 4', 'choice 4', '4', 'opt d', 'opt 4', 'd.', 'opt. d', 'choice. d'])
    const idxCorrect = findIdx(['correct answer', 'answer', 'correct', 'key', 'correctanswer', 'ans'])
    const idxShortExpl = findIdx(['shortexplanation', 'short explanation', 'short expl', 'short_explanation'])
    const idxLongExpl = findIdx(['longexplanation', 'long explanation', 'long expl', 'detailed explanation', 'detailedexplanation', 'detailed', 'long_explanation'])
    const idxExplanation = findIdx(['explanation', 'expl']) // Generic explanation field
    const idxDifficulty = findIdx(['difficulty', 'level', 'diff'])
    const idxTags = findIdx(['tag', 'tags', 'topic', 'subtopic', 'tags/topic'])
    const idxSubject = findIdx(['subject', 'category', 'subj'])

    // Save uploaded images to public/uploads/questions/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      console.log('Upload directory exists or created')
    }

    console.log(`Received ${images.length} images`)
    const imageNameMap = new Map()
    for (const img of images) {
      if (!img || !img.name) {
        console.warn('Skipping invalid image object:', img)
        continue
      }
      try {
        const buffer = Buffer.from(await img.arrayBuffer())
        // Sanitize filename to avoid filesystem issues
        const safeName = img.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${Date.now()}-${safeName}`
        const filepath = path.join(uploadDir, filename)
        await writeFile(filepath, buffer)
        
        // Map original name (lowercase) to the new URL
        imageNameMap.set(img.name.toLowerCase(), `/uploads/questions/${filename}`)
        console.log(`Saved image: ${img.name} -> ${filename}`)
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

    // --- Pre-compute starting serial numbers per (subject, tag, difficulty) group ---
    // So new uploads always continue from the last existing number, never overwrite.
    const serialCounters = {} // key: "subject|tag|difficulty" → next serial number

    const getNextSerial = async (subject, tag, difficulty) => {
      const key = `${subject}|${tag}|${difficulty}`
      if (serialCounters[key] === undefined) {
        // Count how many questions already exist with this combo
        // questionId format: "PREFIX-TAG-DIFF-N" — find the max N
        const prefix = generateQuestionId(subject, tag, difficulty, 0).replace(/-0$/, '')
        const existing = await Question.find({
          questionId: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-` }
        }).select('questionId').lean()

        let maxSerial = 0
        for (const q of existing) {
          const parts = q.questionId.split('-')
          const num = parseInt(parts[parts.length - 1])
          if (!isNaN(num) && num > maxSerial) maxSerial = num
        }
        serialCounters[key] = maxSerial + 1
      }
      return serialCounters[key]++
    }

    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (!cols || cols.length === 0) continue
      
      const content = idxContent >= 0 ? (cols[idxContent] || '').trim() : ''
      
      // Append images found in this row (regardless of column)
      // rowNumber corresponds to r + 1 (Header is r=0, so Data Row 1 is r=1 -> Excel Row 2)
      // parseExcel returns rows 0..N, where rows[0] is Header.
      // So r=1 is rows[1] (Excel Row 2).
      // imagesByRow is 1-based. So we look for imagesByRow[r + 1]
      const rowNum = r + 1
      const rowImages = imagesByRow[rowNum] || []
      let additionalImages = ''
      
      if (rowImages.length > 0) {
        additionalImages = '\n' + rowImages.join('\n')
        await logDebug(`Row ${rowNum}: Appending ${rowImages.length} images to content`)
      }

      const finalContent = content + additionalImages
      console.log(`Row ${r} content:`, finalContent.substring(0, 50) + '...')
      
      if (!finalContent || finalContent.trim().length === 0) {
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
      const shortExplanation = idxShortExpl >= 0 ? (cols[idxShortExpl] || '').trim() : (idxExplanation >= 0 ? (cols[idxExplanation] || '').trim() : '')
      const longExplanation = idxLongExpl >= 0 ? (cols[idxLongExpl] || '').trim() : ''
      const tagsRaw = idxTags >= 0 ? (cols[idxTags] || '').trim() : ''

      // Helper to replace [filename] with image URL
      const replaceImages = (text) => {
        if (!text) return text
        let processed = text
        for (const [name, url] of imageNameMap.entries()) {
          // Replace [filename] case-insensitive
          // Escape regex special characters in filename
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`\\[${escapedName}\\]`, 'gi')
          processed = processed.replace(regex, `![${name}](${url})`)
        }
        return processed
      }

      const contentProc = replaceImages(finalContent)
      const optionAProc = replaceImages(optionA)
      const optionBProc = replaceImages(optionB)
      const optionCProc = replaceImages(optionC)
      const optionDProc = replaceImages(optionD)
      const shortExplProc = replaceImages(shortExplanation)
      const longExplProc = replaceImages(longExplanation)

      const optionsArr = [optionAProc, optionBProc, optionCProc, optionDProc]
      const tagsArr = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : []
      
      // Generate question ID continuing from last existing serial for this group
      const tag0 = tagsArr[0] || 'General'
      const serial = await getNextSerial(subject, tag0, difficulty)
      const questionId = generateQuestionId(subject, tag0, difficulty, serial)
      
      toCreate.push({
        questionId,
        title: contentProc.substring(0, 100),
        content: contentProc,
        explanation: shortExplProc || longExplProc,
        shortExplanation: shortExplProc,
        longExplanation: longExplProc,
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
      // Always insert as new — IDs are unique (continue from last serial)
      const operations = toCreate.map(q => ({
        insertOne: { document: q }
      }))

      const result = await Question.bulkWrite(operations)
      console.log(`Bulk write result: Inserted ${result.insertedCount}`)
      
      return NextResponse.json({
        success: true,
        message: 'Questions uploaded successfully',
        count: result.insertedCount
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

