import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import { generateQuestionId } from '../../../../../lib/idGenerator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MATHPIX_APP_ID = process.env.MATHPIX_APP_ID
const MATHPIX_APP_KEY = process.env.MATHPIX_APP_KEY
const MX = () => ({ app_id: MATHPIX_APP_ID, app_key: MATHPIX_APP_KEY })

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!MATHPIX_APP_ID || !MATHPIX_APP_KEY)
      return NextResponse.json({ error: 'Mathpix credentials not configured' }, { status: 500 })

    const form = await request.formData()
    const file = form.get('file')
    const subject = form.get('subject') || 'Math'
    const defaultDifficulty = form.get('difficulty') || 'Medium'
    const tagsInput = form.get('tags') || ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.doc'))
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 })

    const isPdf = fileName.endsWith('.pdf')
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const uploadForm = new FormData()
    uploadForm.append(
      'file',
      new Blob([fileBuffer], {
        type: isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
      file.name
    )
    uploadForm.append('options_json', JSON.stringify({
      conversion_formats: { md: true },
      math_inline_delimiters: ['\\(', '\\)'],
      math_display_delimiters: ['\\[', '\\]'],
      rm_spaces: true
    }))

    const uploadRes = await fetch('https://api.mathpix.com/v3/pdf', {
      method: 'POST',
      headers: MX(),
      body: uploadForm
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))
      return NextResponse.json({ error: `Mathpix upload failed: ${err.error || uploadRes.statusText}` }, { status: 500 })
    }

    const { pdf_id } = await uploadRes.json()
    if (!pdf_id) return NextResponse.json({ error: 'Mathpix did not return a pdf_id' }, { status: 500 })

    return NextResponse.json({ success: true, pdfId: pdf_id, subject, difficulty: defaultDifficulty, tags: tagsInput, status: 'processing' })
  } catch (error) {
    console.error('Mathpix upload error:', error)
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const pdfId = searchParams.get('pdfId')
    const subject = searchParams.get('subject') || 'Math'
    const defaultDifficulty = searchParams.get('difficulty') || 'Medium'
    const tagsInput = searchParams.get('tags') || ''
    if (!pdfId) return NextResponse.json({ error: 'pdfId required' }, { status: 400 })

    const statusRes = await fetch(`https://api.mathpix.com/v3/pdf/${pdfId}`, { headers: MX() })
    if (!statusRes.ok) return NextResponse.json({ status: 'processing' })

    const statusData = await statusRes.json()
    const pctDone = statusData.percent_done || 0
    const isComplete = statusData.status === 'completed' || pctDone >= 100
    if (!isComplete) return NextResponse.json({ status: 'processing', percent: pctDone })

    const mdRes = await fetch(`https://api.mathpix.com/v3/pdf/${pdfId}.md`, { headers: MX() })
    if (!mdRes.ok) return NextResponse.json({ status: 'processing', percent: pctDone })

    const mdText = await mdRes.text()
    if (!mdText || mdText.trim().length < 10) return NextResponse.json({ status: 'processing', percent: pctDone })

    // Debug: Log first 5000 characters of raw markdown for troubleshooting
    console.log('\n📄 Mathpix Raw Markdown (first 5000 chars):')
    console.log('=' .repeat(80))
    console.log(mdText.substring(0, 5000))
    console.log('=' .repeat(80))
    console.log('\n')

    // Download all Mathpix CDN images → save to /public/uploads/questions/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
    await mkdir(uploadDir, { recursive: true })

    const cdnRegex = /!\[([^\]]*)\]\((https:\/\/cdn\.mathpix\.com\/[^)]+)\)/g
    const imageUrlMap = new Map()
    let m
    while ((m = cdnRegex.exec(mdText)) !== null) {
      const cdnUrl = m[2]
      if (imageUrlMap.has(cdnUrl)) continue
      try {
        const imgRes = await fetch(cdnUrl, { headers: MX() })
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ext = (cdnUrl.split('.').pop().split('?')[0] || 'png').replace(/[^a-z0-9]/gi, '').substring(0, 4) || 'png'
          const localName = `mathpix-${Date.now()}-${Math.floor(Math.random() * 99999)}.${ext}`
          await writeFile(path.join(uploadDir, localName), buf)
          imageUrlMap.set(cdnUrl, `/uploads/questions/${localName}`)
        }
      } catch (e) {
        console.error('Image download failed:', cdnUrl, e.message)
      }
    }

    let localMd = mdText
    for (const [cdn, local] of imageUrlMap.entries()) {
      localMd = localMd.split(cdn).join(local)
    }

    const globalTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
    // Pre-clean the full markdown before parsing
    const cleanedMd = cleanContent(localMd)
    const questions = parseMathpixMarkdown(cleanedMd, subject, defaultDifficulty, globalTags)

    if (questions.length === 0) {
      return NextResponse.json({
        status: 'error',
        error: 'No questions could be parsed. Make sure questions are numbered (1. 2. 3.) with options A) B) C) D).',
        rawPreview: mdText.substring(0, 800)
      })
    }

    return NextResponse.json({ status: 'done', questions })
  } catch (error) {
    console.error('Mathpix poll error:', error)
    return NextResponse.json({ status: 'error', error: error.message })
  }
}

// Strip metadata noise from content (dates, timing, source labels)
function cleanContent(text) {
  if (!text) return ''
  return text
    // Remove ANY bracketed label that looks like a date/source: [March US 2023], [June 2023], [May 2024], etc.
    .replace(/\[[^\]]{0,60}\d{4}[^\]]{0,30}\]/g, '')
    // Remove plain year brackets [2023]
    .replace(/\[\d{4}\]/g, '')
    // Remove known source labels
    .replace(/\[(?:SAT|ACT|College Board|CB|Official|Practice|Test\s*\d*|DSAT|Digital SAT)\]/gi, '')
    // Remove timing hints like "(2 min)", "(~3 minutes)"
    .replace(/\(~?\d+\s*min(?:utes?)?\)/gi, '')
    // Remove metadata lines
    .replace(/^(?:Time|Source|Section|Date|Test)[:\s]+.*$/gim, '')
    // Clean up extra blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}



function parseMathpixMarkdown(md, subject, defaultDifficulty, globalTags) {
  const questions = []
  
    // --- 1. SMART SPLITTING ---
    // We use a unique marker to split the document.
    const marker = '[[Q-SEP]]'
    
    // Normalize line endings
    let prepared = md.replace(/\r\n/g, '\n')
    
    // Debug: Log the first 2000 characters to help identify markers
    console.log('\n--- 🛠️ PRE-SPLIT DEBUG (First 2000 chars) ---')
    console.log(prepared.substring(0, 2000))
    console.log('-------------------------------------------\n')

    // 1. Split on Mathpix page breaks (--- or ***)
    // We allow optional whitespace before/after
    prepared = prepared.replace(/^[ \t]*[-*]{3,}[ \t]*$/gm, marker)
    
    // 2. Split on Topic lines (e.g. "Linear Inequalities - ...")
    // Since every question starts with a topic line, this is a great fallback.
    // We use a lookahead so the topic line stays inside the new block.
    prepared = prepared.replace(/\n(?=(?:#{1,6}\s*)?[A-Z][^.!?\n]{5,60}\s*-\s*[A-Z][^.!?\n]{3,120})/gm, marker)

    // 3. Split on explicit headers like "Question 1", "## 1", or simply "1.", "1)", "(1)", "1"
    // We allow it to be at start of line or preceded by multiple newlines
    // Added \n? to ensure we catch it even if there's a preceding newline from previous content
    prepared = prepared.replace(/(?:\n|^)[ \t]*(?:#{1,6}\s+|(?:\*\*|__)?(?:Question|Page|Q)\s+(?:\*\*|__)?|(?:\*\*|__)?\()?\b(\d{1,3})\b[\)\.]?(?:\*\*|__)?(?:[ \t]+|$)/gmi, marker)

    // Split into blocks
    const rawBlocks = prepared.split(marker)
      .map(b => b.trim())
      .filter(b => b.length > 0)
    
    console.log(`\n==================================================`)
    console.log(`🚀 MATHPIX PARSING START`)
    console.log(`Total blocks found after splitting: ${rawBlocks.length}`)
    console.log(`==================================================\n`)

    // IMPORTANT: Track actual question sequence to maintain order and uniqueness
    let addedCount = 0
    let skippedCount = 0

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i]
      
      // LOG EVERY BLOCK FOR THE USER
      console.log(`\n--- 🔍 Checking Block ${i} (Length: ${block.length} chars) ---`)
      const preview = block.substring(0, 150).replace(/\n/g, ' | ')
      console.log(`   Preview: "${preview}..."`)

      // Rejection logic with explicit reasons
      if (block.length <= 10) {
          console.log(`   ❌ SKIPPED: Block is too small to be a question.`)
          skippedCount++
          continue
      }

      // Safety checks
      const isMCQ = /Answer:\s*[A-D]/i.test(block) || /[A-D][\)\.]\s+/.test(block)
      const isSPR = /response:\s*([\-\d\.\/]+)/i.test(block) || /Answer:\s*([\-\d\.\/]+)/i.test(block)
      const hasTopic = /^[ \t]*(?:#{1,6}\s*)?[A-Z][^.!?\n]{5,60}\s*-\s*[A-Z][^.!?\n]{3,120}/m.test(block)
      const hasDifficulty = /Difficulty:\s*(Easy|Medium|Hard)/i.test(block)

      // Block 0 handling (Cover page)
      // We ONLY skip Block 0 if it really looks like a cover page (no question indicators at all)
      if (i === 0 && !isMCQ && !isSPR && !hasTopic && !hasDifficulty) {
          console.log(`   ❌ SKIPPED: Block 0 identified as Info/Cover Page.`)
          skippedCount++
          continue
      }

      // NO MORE STRING REQUIREMENTS FOR OTHER BLOCKS!
      // If Mathpix found a block between separators, we ADD IT.
      // This ensures we don't miss short questions or pages with only images.
      
      addedCount++
      processValidBlock(block, addedCount)
    }

    console.log(`\n==================================================`)
    console.log(`🏁 MATHPIX PARSING COMPLETE`)
    console.log(`✅ TOTAL ADDED: ${addedCount}`)
    console.log(`❌ TOTAL SKIPPED: ${skippedCount}`)
    console.log(`==================================================\n`)

  function processValidBlock(block, qIndex) {
    // rowNumber is our ABSOLUTE truth for order (001, 002, 003...)
    const rowNumber = qIndex.toString().padStart(3, '0')
    
    // Detect Question Number only for logging/display
    const qNumMatch = block.substring(0, 200).match(/(?:Question|Page|Q)\s*(\d{1,3})\b/i)
    const displayNum = qNumMatch ? qNumMatch[1] : qIndex

    // NEW: Extract Topic Tag
    const topicMatch = block.match(/^[ \t]*(?:#{1,6}\s*)?([A-Z][^.!?\n]{5,60}\s*-\s*[A-Z][^.!?\n]{3,120})/m)
    const detectedTopic = topicMatch ? topicMatch[1].trim() : ''

    // 2. Detect Type
    const isSPR = /response:\s*([\-\d\.\/]+)/i.test(block) || 
                  /Correct\s*\n?\s*response:\s*([\-\d\.\/]+)/i.test(block) ||
                  (/(?:Short Answer|Student-Produced Response)/i.test(block) && /Answer:\s*([\-\d\.\/]+)/i.test(block))
    
    const type = isSPR ? 'ShortAnswer' : 'MultipleChoice'
    const cleanBlock = block.trim()
    
    // 3. Extract Correct Answer
    let correctAnswer = ''
    if (type === 'MultipleChoice') {
      const ansMatch = cleanBlock.match(/Answer:\s*([A-D])/i)
      correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : 'A'
    } else {
      const sprMatch = cleanBlock.match(/response:\s*([\-\d\.\/]+)/i) || 
                       cleanBlock.match(/Correct\s*\n?\s*response:\s*([\-\d\.\/]+)/i) ||
                       cleanBlock.match(/Answer:\s*([\-\d\.\/]+)/i)
      correctAnswer = sprMatch ? sprMatch[1] : ''
    }

    // 4. Extract Question Text
    let questionText = cleanBlock.trim()
    const headerRegex = /\n\s*(?:#{1,6}\s*)?(?:\*\*|__)?(?:Answer|Short Explanation|Mathematical Shortcut|Long Explanation|Difficulty|response|Correct\s*\n?\s*response|Topic|Category|Tags|Question|Page)\s*(?::|\d)/i
    
    // NEW: Refined splitting for the specific "one question per page" format
    // We look for the FIRST occurrence of a major section header to end the question text
    const sectionHeaders = [
      'Answer:', 
      'Short Explanation', 
      'Mathematical Shortcut', 
      'Long Explanation', 
      'Difficulty:',
      'Topic:'
    ]
    
    let firstHeaderIndex = questionText.length
    sectionHeaders.forEach(h => {
      const idx = questionText.indexOf(h)
      if (idx !== -1 && idx < firstHeaderIndex) {
        // Ensure it's not just part of another word
        const prevChar = idx > 0 ? questionText[idx-1] : '\n'
        if (prevChar === '\n' || prevChar === ' ' || prevChar === '*') {
          firstHeaderIndex = idx
        }
      }
    })
    
    if (firstHeaderIndex < questionText.length) {
      questionText = questionText.substring(0, firstHeaderIndex).trim()
    }

    // Cleanup leading headers from text (Question 1, 1., 1), (1), etc)
    questionText = questionText
      .replace(/^[ \t]*(?:#{1,6}\s+|(?:\*\*|__)?(?:Question|Page|Q)\s+(?:\*\*|__)?|(?:\*\*|__)?\()?\b\d{1,3}\b[\)\.]?(?:\*\*|__)?(?:[ \t]+|:|\.)/gmi, '')
      // Remove the topic line if it was detected at the top
      .replace(/^[ \t]*(?:#{1,6}\s*)?[A-Z][^.!?\n]{5,60}\s*-\s*[A-Z][^.!?\n]{3,120}[ \t]*/m, '')
      .trim()

    // 5. Options
    let options = []
    if (type === 'MultipleChoice') {
      const expandedBlock = expandTwoColumnOptions(cleanBlock)
      options = [
        cleanContent(extractOption(expandedBlock, 'A')),
        cleanContent(extractOption(expandedBlock, 'B')),
        cleanContent(extractOption(expandedBlock, 'C')),
        cleanContent(extractOption(expandedBlock, 'D'))
      ]
    }

    // 6. Explanations
    const shortRaw = cleanBlock.match(sectionRx('Short Explanation'))
    const shortcutRaw = cleanBlock.match(sectionRx('Mathematical Shortcut'))
    const longRaw = cleanBlock.match(sectionRx('Long Explanation'))
    
    let shortExplanation = ''
    if (shortRaw && shortRaw[1]) shortExplanation = cleanContent(shortRaw[1].trim())
    if (shortcutRaw && shortcutRaw[1]) {
      const shortcutContent = cleanContent(shortcutRaw[1].trim())
      if (shortcutContent) {
        shortExplanation = shortExplanation 
          ? shortExplanation + '\n\n**Mathematical Shortcut:**\n' + shortcutContent
          : '**Mathematical Shortcut:**\n' + shortcutContent
      }
    }

    const longExplanation = cleanContent(longRaw && longRaw[1] ? longRaw[1].trim() : '')
    const explanation = shortExplanation || longExplanation

    // 7. Difficulty
    let difficulty = defaultDifficulty
    const diffMatch = cleanBlock.match(/Difficulty:\s*(Easy|Medium|Hard)/i)
    if (diffMatch) difficulty = cap(diffMatch[1])

    // 8. Tags
    const tagLineMatch = cleanBlock.match(/(?:^|\n)\s*(?:topic|tag|category|tags)[:\s]+([^\n]+)/i)
    const explicitTags = tagLineMatch ? tagLineMatch[1].split(',').map(t => t.trim()).filter(Boolean) : []
    const autoTags = detectTopicTags(questionText, subject)
    // Add the detected topic as a primary tag
    const tags = [...new Set([detectedTopic, ...explicitTags, ...autoTags, ...globalTags])].filter(Boolean)

    // 9. Image
    const imgMatch = cleanBlock.match(/!\[.*?\]\((\/uploads\/questions\/[^)]+)\)/)
    const imageUrl = imgMatch ? imgMatch[1] : ''

    console.log(`   ✅ SUCCESS: Added Question ${displayNum} (Type: ${type}, Answer: ${correctAnswer})`)

    questions.push({
      id: `mathpix-${rowNumber}-${Date.now()}`, // Sortable unique ID
      questionId: generateQuestionId(subject, tags[0] || 'General', difficulty, rowNumber),
      title: questionText.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 100),
      content: questionText,
      explanation,
      shortExplanation,
      longExplanation,
      subject,
      difficulty,
      type,
      correctAnswer,
      options,
      tags,
      imageUrl,
      remark: ''
    })
  }

  function sectionRx(label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
      `(?:^|\\n)(?:#{1,6}\\s*)?\\*{0,4}${escapedLabel}\\*{0,4}(?:\\s*:)?\\s*\\n?` +
      `([\\s\\S]*?)` +
      `(?=\\n+(?:#{1,6}\\s*)?\\*{0,4}(?:Short Explanation|Mathematical Shortcut|Long Explanation|Answer|Difficulty|Topic|Category|Tags|Question|Page)[:\\s*]|$)`,
      'i'
    )
  }

  console.log(`\n==================================================`)
  console.log(`🏁 MATHPIX PARSING COMPLETE`)
  console.log(`Final Questions Count: ${questions.length}`)
  console.log(`==================================================\n`)

  return questions
}

// Expand 2-column answer choices onto separate lines
// Handles: "A) 33    C) 38", "| A) foo | C) bar |", and "A) 33 C) 38"
function expandTwoColumnOptions(block) {
  let result = block
    // 1. Convert markdown table rows to plain lines first
    .replace(/^\|?\s*(\(?[A-D][\)\.]\s+[^|]+?)\s*\|\s*(\(?[A-D][\)\.]\s+[^|]+?)\s*\|?\s*$/gm,
      (_, left, right) => `${left.trim()}\n${right.trim()}`)
    
    // 2. Handle same-line 2-column: "A) 33    C) 38" or "A) 33 C) 38"
    // We look for A/B followed by C/D on the same line
    .replace(/^(\s*\(?[A-B][\)\.]\s+.*?)\s{1,}(\(?([C-D])[\)\.]\s+.*)$/gm,
      (_, left, right) => `${left.trim()}\n${right.trim()}`);
  
  return result;
}

function extractOption(block, letter) {
  // First try standard format: "A) ..." on its own line
  const rx = new RegExp(
    `(?:^|\\n)\\s*\\(?${letter}[\\)\\.]\\s*` +
    `((?:(?!\\n\\s*\\(?[A-D][\\)\\.]|\\nAnswer|\\nExplanation|\\nCorrect)[\\s\\S])*?)` +
    `(?=\\n\\s*\\(?[A-D][\\)\\.]|\\nAnswer|\\nExplanation|\\nCorrect|$)`,
    'im'
  )
  const m = block.match(rx)
  if (m && m[1].trim()) return m[1].trim()

  // Fallback: markdown table cell format "| A) foo |" or "| A) foo | C) bar |"
  const tableRx = new RegExp(`\\|\\s*\\(?${letter}[\\)\\.]\\s*([^|\\n]+?)\\s*(?:\\||$)`, 'im')
  const tm = block.match(tableRx)
  return tm ? tm[1].trim() : ''
}

function detectTopicTags(text, subject) {
  const t = text.toLowerCase()
  const tags = []
  if (subject === 'Math') {
    const topics = [
      ['algebra', /\b(algebra|linear equation|variable|expression|inequality|system of equation)\b/],
      ['quadratics', /\b(quadratic|parabola|vertex|discriminant|factoring|completing the square)\b/],
      ['functions', /\b(function|f\(x\)|domain|range|composition|inverse function)\b/],
      ['geometry', /\b(geometry|triangle|circle|area|perimeter|volume|angle|polygon|rectangle)\b/],
      ['statistics', /\b(mean|median|mode|standard deviation|probability|data|distribution)\b/],
      ['exponents', /\b(exponent|power|radical|square root|cube root|exponential)\b/],
      ['ratios', /\b(ratio|proportion|percent|rate|unit rate)\b/],
      ['polynomials', /\b(polynomial|monomial|binomial|degree|coefficient)\b/],
      ['trigonometry', /\b(trigonometry|sine|cosine|tangent|sin|cos|tan)\b/],
      ['word-problems', /\b(total|cost|price|speed|distance|time|profit|loss)\b/]
    ]
    for (const [tag, rx] of topics) { if (rx.test(t)) tags.push(tag) }
  } else {
    const topics = [
      ['reading-comprehension', /\b(passage|author|main idea|inference|evidence|tone|purpose)\b/],
      ['vocabulary', /\b(word|meaning|context|definition|synonym|connotation)\b/],
      ['grammar', /\b(grammar|punctuation|comma|semicolon|verb|noun|pronoun|sentence)\b/],
      ['writing', /\b(transition|paragraph|thesis|argument|claim|support|revise)\b/],
      ['rhetoric', /\b(rhetoric|persuasion|appeal|ethos|pathos|logos|style)\b/]
    ]
    for (const [tag, rx] of topics) { if (rx.test(t)) tags.push(tag) }
  }
  return tags.slice(0, 3)
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() }
