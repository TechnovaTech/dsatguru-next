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

    // Debug: Log first 2000 characters of raw markdown for troubleshooting
    console.log('\n📄 Mathpix Raw Markdown (first 2000 chars):')
    console.log('=' .repeat(80))
    console.log(mdText.substring(0, 2000))
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

  // --- Pre-process: normalize all question heading variants → "N."
  // Handles: "## Question 2", "Question 2", "Q2", "q2", bare "2" on its own line
  const normalized = md
    // "## Question N" / "# Question N"
    .replace(/^#{1,3}\s*[Qq]uestion\s+(\d+)\s*$/gim, '$1.')
    // "Question N" (no hash)
    .replace(/^[Qq]uestion\s+(\d+)\s*$/gim, '$1.')
    // "Q1" / "q1" alone on a line (with or without dot/paren already)
    .replace(/^[Qq](\d+)\s*$/gm, '$1.')
    // bare number alone on its own line e.g. just "2" — only if it's a plausible question number (1-999)
    // must be preceded by a blank line or start of string to avoid matching numbers inside text
    .replace(/(^|\n\n)(\d{1,3})\s*\n/g, (_, pre, num) => `${pre}${num}.\n`)

  // Split on normalized "N." / "N)" question starters, or "QN." / "QN)" variants
  const rawBlocks = normalized.split(/\n(?=(?:[Qq](?:uestion)?\s*)?\d+[\.\)]\s)/i).filter(b => b.trim())

  // Sort by question number to preserve PDF order
  const blocks = rawBlocks
    .map(b => {
      const numMatch = b.match(/^(?:[Qq](?:uestion)?\s*)?(\d+)[\.\)]\s/i)
      return { block: b.trim(), num: numMatch ? parseInt(numMatch[1]) : 9999 }
    })
    .sort((a, b) => a.num - b.num)
    .map(x => x.block)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (!block) continue

    // Strip any bracketed date/source labels from the entire block first
    const cleanBlock = block.replace(/\[[^\]]{0,80}\d{4}[^\]]{0,40}\]/g, '').replace(/\n{3,}/g, '\n\n').trim()

    // Match question text — stop at first answer option OR markdown table row OR Answer: line
    // Handles: "A) ...", "| A) |", "Answer:", "## Answer"
    const qMatch = cleanBlock.match(/^(?:[Qq](?:uestion)?\s*)?\d+[\.\)]\s*([\s\S]*?)(?=\n\s*(?:\|?\s*\(?[A-D][\)\.]\s|\*{0,2}Answer|\*{0,2}Short Explanation|\*{0,2}Mathematical Shortcut|\*{0,2}Long Explanation|##\s*Answer))/i)
    if (!qMatch) continue

    let rawQuestion = cleanContent(qMatch[1])
    if (!rawQuestion || rawQuestion.length < 3) continue

    // Strip subtitle lines: lines that look like "Topic - Subtopic / Category" (no sentence punctuation)
    // These appear right after the question heading in some PDFs
    rawQuestion = rawQuestion.replace(/^[A-Z][^.!?\n]{5,80}(?:\s*[-\/]\s*[A-Z][^.!?\n]{3,60})+\s*\n/m, '')

    // Split passage + question text
    let questionParagraph = ''
    let questionText = rawQuestion.trim()
    const paraMatch = rawQuestion.match(/^([\s\S]{80,}?)\n\n([\s\S]+)$/)
    if (paraMatch) { questionParagraph = paraMatch[1].trim(); questionText = paraMatch[2].trim() }

    // Options — handle both single-line and 2-column same-line layout
    // e.g. "A) 33    C) 38\nB) 34    D) 39"
    const expandedBlock = expandTwoColumnOptions(cleanBlock)

    const optA = cleanContent(extractOption(expandedBlock, 'A'))
    const optB = cleanContent(extractOption(expandedBlock, 'B'))
    const optC = cleanContent(extractOption(expandedBlock, 'C'))
    const optD = cleanContent(extractOption(expandedBlock, 'D'))

    const ansMatch = cleanBlock.match(/(?:answer|correct\s*answer|key|ans)[:\s]+\(?([A-D])\)?/i)
    const correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : 'A'

    // Short Explanation / Mathematical Shortcut / Long Explanation
    // These appear as labeled sections in colored boxes in the PDF
    // More flexible regex to handle various markdown formatting from Mathpix
    const sectionRx = (label) => {
      // Match section header with optional markdown formatting (**, ##, etc.)
      // Capture everything until next section header or end
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(
        `(?:^|\\n)(?:#{1,6}\\s*)?\\*{0,4}${escapedLabel}\\*{0,4}(?:\\s*:)?\\s*\\n?` +
        `([\\s\\S]*?)` +
        `(?=\\n+(?:#{1,6}\\s*)?\\*{0,4}(?:Short Explanation|Mathematical Shortcut|Long Explanation|Answer|Difficulty|Question\\s*\\d+)[:\\s*]|$)`,
        'i'
      )
    }

    // Try to extract explanation sections
    const shortRaw = cleanBlock.match(sectionRx('Short Explanation'))
    const shortcutRaw = cleanBlock.match(sectionRx('Mathematical Shortcut'))
    const longRaw = cleanBlock.match(sectionRx('Long Explanation'))
    const genericExplMatch = cleanBlock.match(/(?:^|\n)(?:explanation|solution|rationale)[:\s]+([\s\S]+?)(?=\n\n|\n(?:[Qq](?:uestion)?\s*)?\d+[\.\)]|$)/i)

    // Debug logging for first question
    if (i === 0) {
      console.log('🔍 Mathpix Explanation Extraction Debug (Question 1):')
      console.log('Short Explanation found:', !!shortRaw, shortRaw ? `(${shortRaw[1].substring(0, 100)}...)` : '')
      console.log('Mathematical Shortcut found:', !!shortcutRaw, shortcutRaw ? `(${shortcutRaw[1].substring(0, 100)}...)` : '')
      console.log('Long Explanation found:', !!longRaw, longRaw ? `(${longRaw[1].substring(0, 100)}...)` : '')
    }

    // Combine Short Explanation and Mathematical Shortcut into shortExplanation
    let shortExplanation = ''
    if (shortRaw && shortRaw[1]) {
      shortExplanation = cleanContent(shortRaw[1].trim())
    }
    if (shortcutRaw && shortcutRaw[1]) {
      const shortcutContent = cleanContent(shortcutRaw[1].trim())
      if (shortcutContent) {
        shortExplanation = shortExplanation 
          ? shortExplanation + '\n\n**Mathematical Shortcut:**\n' + shortcutContent
          : '**Mathematical Shortcut:**\n' + shortcutContent
      }
    }
    // Fallback to generic explanation if no specific sections found
    if (!shortExplanation && genericExplMatch) {
      shortExplanation = cleanContent(genericExplMatch[1])
    }

    const longExplanation = cleanContent(longRaw && longRaw[1] ? longRaw[1].trim() : '')
    const explanation = shortExplanation || longExplanation

    // Difficulty
    let difficulty = defaultDifficulty
    const diffMatch = cleanBlock.match(/(?:difficulty|level)[:\s]+(easy|medium|hard)/i)
    if (diffMatch) difficulty = cap(diffMatch[1])
    else if (/\b(easy|simple|basic)\b/i.test(questionText)) difficulty = 'Easy'
    else if (/\b(hard|difficult|challenging|advanced)\b/i.test(questionText)) difficulty = 'Hard'

    // Tags: explicit in doc + auto-detected from content
    const tagLineMatch = cleanBlock.match(/(?:^|\n)\s*(?:topic|tag|category|tags)[:\s]+([^\n]+)/i)
    const explicitTags = tagLineMatch ? tagLineMatch[1].split(',').map(t => t.trim()).filter(Boolean) : []
    const autoTags = detectTopicTags(questionText + ' ' + questionParagraph, subject)
    const tags = [...new Set([...explicitTags, ...autoTags, ...globalTags])].filter(Boolean)

    // First local image in block → imageUrl
    const imgMatch = cleanBlock.match(/!\[.*?\]\((\/uploads\/questions\/[^)]+)\)/)
    const imageUrl = imgMatch ? imgMatch[1] : ''

    const questionId = generateQuestionId(subject, tags[0] || 'General', difficulty, i + 1)

    questions.push({
      id: `mathpix-${i + 1}`,
      questionId,
      title: questionText.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 100),
      content: questionText,
      questionParagraph,
      explanation,
      shortExplanation,
      longExplanation,
      subject,
      difficulty,
      correctAnswer,
      options: [optA, optB, optC, optD],
      tags,
      imageUrl,
      remark: ''
    })
  }
  return questions
}

// Expand 2-column answer choices onto separate lines
// Handles: "A) 33    C) 38\nB) 34    D) 39" and "| A) foo | C) bar |" table rows
function expandTwoColumnOptions(block) {
  // Convert markdown table option rows to plain lines first
  // e.g. "| A) foo | C) bar |" → "A) foo\nC) bar"
  let result = block.replace(
    /^\|?\s*(\(?[A-D][\)\.]\s+[^|]+?)\s*\|\s*(\(?[A-D][\)\.]\s+[^|]+?)\s*\|?\s*$/gm,
    (_, left, right) => `${left.trim()}\n${right.trim()}`
  )
  // Then handle same-line 2-column: "A) 33    C) 38"
  result = result.replace(
    /^(\s*\(?([A-D])[\)\.]\s+)(.*?)\s{2,}(\(?([A-D])[\)\.]\s+.*)$/gm,
    (_, _pfx, _l1, val1, rest, _l2) => `${_pfx}${val1}\n${rest}`
  )
  return result
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
