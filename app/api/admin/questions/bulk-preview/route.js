import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import ExcelJS from 'exceljs'
import { generateQuestionId } from '../../../../../lib/idGenerator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  
  const worksheet = workbook.worksheets.find(sheet => sheet.actualRowCount > 0) || workbook.worksheets[0]
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file')
  }
  
  const imagesByRow = {}
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
  await mkdir(uploadDir, { recursive: true })

  const images = worksheet.getImages() || []
  
  if (images.length > 0) {
    for (const image of images) {
      const row = Math.floor(image.range.tl.row) + 1
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
      }
    }
  }
  
  const rows = []
  const maxCols = Math.max(worksheet.columnCount, 20)
  const rowCount = worksheet.rowCount
  
  for (let i = 1; i <= rowCount; i++) {
    const row = worksheet.getRow(i)
    const values = []
    
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
      }
      values.push(value)
    }
    rows.push(values)
  }

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
    const defaultSubject = form.get('defaultSubject')
    const images = form.getAll('images') || []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
    let rows
    let imagesByRow = {}
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      const result = await parseExcel(Buffer.from(buffer))
      rows = result.rows
      imagesByRow = result.imagesByRow
    } else {
      rows = parseCsv(csvText)
    }
    
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'File must have header and at least one data row' }, { status: 400 })
    }

    const header = rows[0].map(h => (h || '').trim().toLowerCase())
    
    const findIdx = (possibleNames) => {
      for (const name of possibleNames) {
        const i = header.findIndex(h => h === name.toLowerCase())
        if (i >= 0) return i
      }
      return -1
    }

    const idxContent = findIdx(['question', 'content', 'question text', 'q', 'ques', 'questiontext'])
    const idxA = findIdx(['option a', 'a', '(a)', 'choice a', 'answer a', 'optiona'])
    const idxB = findIdx(['option b', 'b', '(b)', 'choice b', 'answer b', 'optionb'])
    const idxC = findIdx(['option c', 'c', '(c)', 'choice c', 'answer c', 'optionc'])
    const idxD = findIdx(['option d', 'd', '(d)', 'choice d', 'answer d', 'optiond'])
    const idxCorrect = findIdx(['correct answer', 'answer', 'correct', 'key', 'correctanswer', 'ans'])
    const idxShortExpl = findIdx(['shortexplanation', 'short explanation', 'short expl', 'short_explanation'])
    const idxLongExpl = findIdx(['longexplanation', 'long explanation', 'long expl', 'detailed explanation', 'detailedexplanation', 'detailed', 'long_explanation'])
    const idxExplanation = findIdx(['explanation', 'expl']) // Generic explanation field
    const idxDifficulty = findIdx(['difficulty', 'level', 'diff'])
    const idxTags = findIdx(['tag', 'tags', 'topic', 'subtopic', 'tags/topic'])
    const idxSubject = findIdx(['subject', 'category', 'subj'])

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
    await mkdir(uploadDir, { recursive: true })

    const imageNameMap = new Map()
    for (const img of images) {
      if (!img || !img.name) continue
      try {
        const buffer = Buffer.from(await img.arrayBuffer())
        const safeName = img.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${Date.now()}-${safeName}`
        const filepath = path.join(uploadDir, filename)
        await writeFile(filepath, buffer)
        imageNameMap.set(img.name.toLowerCase(), `/uploads/questions/${filename}`)
      } catch (err) {
        console.error(`Failed to save image ${img.name}:`, err)
      }
    }

    if (idxContent < 0) {
      return NextResponse.json({ 
        error: 'Question column not found', 
        details: `Available columns: ${header.join(', ')}` 
      }, { status: 400 })
    }
    
    const questions = []
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (!cols || cols.length === 0) continue
      
      const content = idxContent >= 0 ? (cols[idxContent] || '').trim() : ''
      const rowNum = r + 1
      const rowImages = imagesByRow[rowNum] || []
      let additionalImages = ''
      
      if (rowImages.length > 0) {
        additionalImages = '\n' + rowImages.join('\n')
      }

      const finalContent = content + additionalImages
      
      if (!finalContent || finalContent.trim().length === 0) continue
      
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

      const replaceImages = (text) => {
        if (!text) return text
        let processed = text
        for (const [name, url] of imageNameMap.entries()) {
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
      
      const questionId = generateQuestionId(subject, tagsArr[0] || 'General', difficulty, r)
      
      questions.push({
        id: `preview-${r}`,
        questionId,
        title: contentProc.substring(0, 100),
        content: contentProc,
        explanation: shortExplProc || longExplProc,
        shortExplanation: shortExplProc,
        longExplanation: longExplProc,
        subject,
        difficulty,
        correctAnswer,
        options: optionsArr,
        tags: tagsArr,
        rowNumber: r
      })
    }

    if (questions.length === 0) {
      return NextResponse.json({ 
        error: 'No valid questions found in file'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      questions
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ 
      error: 'Failed to preview questions', 
      details: error.message 
    }, { status: 500 })
  }
}
