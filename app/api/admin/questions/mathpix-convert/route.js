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

    // Retry the upload up to 3 times with exponential backoff to survive transient
    // network drops (ECONNRESET / ETIMEDOUT) that commonly hit large multipart uploads.
    let uploadRes
    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        uploadRes = await fetch('https://api.mathpix.com/v3/pdf', {
          method: 'POST',
          headers: MX(),
          body: uploadForm,
          // Disable keep-alive reuse so a stale socket from a prior attempt isn't reused
          keepalive: false
        })
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        const code = e?.cause?.code || e?.code || ''
        const isTransient = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'UND_ERR_SOCKET'].includes(code)
        console.warn(`Mathpix upload attempt ${attempt}/3 failed (${code || e.message}). ${isTransient && attempt < 3 ? 'Retrying...' : ''}`)
        if (!isTransient || attempt === 3) throw e
        await new Promise(r => setTimeout(r, 1000 * attempt)) // 1s, 2s backoff
      }
    }
    if (lastErr) throw lastErr

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))
      return NextResponse.json({ error: `Mathpix upload failed: ${err.error || uploadRes.statusText}` }, { status: 500 })
    }

    const { pdf_id } = await uploadRes.json()
    if (!pdf_id) return NextResponse.json({ error: 'Mathpix did not return a pdf_id' }, { status: 500 })

    return NextResponse.json({ success: true, pdfId: pdf_id, subject, difficulty: defaultDifficulty, tags: tagsInput, status: 'processing' })
  } catch (error) {
    console.error('Mathpix upload error:', error)
    const code = error?.cause?.code || error?.code || ''
    const isNetwork = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'UND_ERR_SOCKET'].includes(code)
    const friendly = isNetwork
      ? `Network error talking to Mathpix (${code}). Check your internet connection and try again.`
      : `Upload failed: ${error.message}`
    return NextResponse.json({ error: friendly, details: error.message }, { status: 500 })
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
    const { questions, rawBlocks } = parseMathpixMarkdown(cleanedMd, subject, defaultDifficulty, globalTags)

    if (questions.length === 0) {
      return NextResponse.json({
        status: 'error',
        error: 'No questions could be parsed. Make sure questions are numbered (1. 2. 3.) with options A) B) C) D).',
        rawPreview: mdText.substring(0, 800)
      })
    }

    // --- Gemini AI: fill missing data for incomplete questions ---
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (GEMINI_API_KEY) {
      const incompleteIndices = []
      for (let i = 0; i < questions.length; i++) {
        if (isIncomplete(questions[i])) incompleteIndices.push(i)
      }
      if (incompleteIndices.length > 0) {
        console.log(`🤖 Gemini: ${incompleteIndices.length} incomplete questions — sending to Gemini 2.5 Flash`)
        const batchSize = 5
        for (let b = 0; b < incompleteIndices.length; b += batchSize) {
          const batch = incompleteIndices.slice(b, b + batchSize)
          await Promise.all(batch.map(async (idx) => {
            try {
              const q = questions[idx]
              const rawBlock = rawBlocks[idx] || q.content || ''
              const filled = await fillWithGemini(GEMINI_API_KEY, rawBlock, subject)
              if (filled) {
                if (!q.content || q.content.trim().length < 10) q.content = filled.content || q.content
                if (!q.options || q.options.filter(o => o && o.trim()).length < 2) q.options = filled.options || q.options
                if (!q.correctAnswer || !['A','B','C','D'].includes(q.correctAnswer)) q.correctAnswer = filled.correctAnswer || q.correctAnswer
                if (!q.shortExplanation && filled.shortExplanation) q.shortExplanation = filled.shortExplanation
                if (!q.longExplanation && filled.longExplanation) q.longExplanation = filled.longExplanation
                if (!q.explanation) q.explanation = q.shortExplanation || q.longExplanation || filled.explanation || ''
                if (filled.difficulty && q.difficulty === defaultDifficulty) q.difficulty = filled.difficulty
                q.title = (q.content || '').replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 100)
                q.aiAssisted = true
                console.log(`   ✅ Gemini filled Q${idx + 1}`)
              }
            } catch (e) {
              console.error(`   ❌ Gemini failed for Q${idx + 1}:`, e.message)
            }
          }))
        }
      }
    } else {
      console.log('ℹ️ GEMINI_API_KEY not set — skipping Gemini AI fill')
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

    // 0. PRIMARY SPLIT: After "Difficulty: Easy|Medium|Hard" — the END marker for each question.
    // In SAT-prep PDFs every question ends with this footer. Splitting AFTER it gives clean
    // per-question blocks even when Mathpix flattens multiple pages onto one line without
    // page-break markers. This is the most reliable boundary for this format.
    prepared = prepared.replace(
      /((?:\*{1,4}|_{1,4})?Difficulty(?:\*{1,4}|_{1,4})?\s*:?\s*(?:Easy|Medium|Hard))\b/gi,
      '$1' + marker
    )

    // 1. Split on Mathpix page breaks (--- or ***)
    // We allow optional whitespace before/after
    prepared = prepared.replace(/^[ \t]*[-*]{3,}[ \t]*$/gm, marker)

    // 2. Split BEFORE Topic lines (e.g. "Linear Inequalities - ...")
    // Since every question starts with a topic line, this is a great fallback.
    // We use a lookahead so the topic line stays inside the new block.
    // Match both newline-prefixed AND inline (after digit/punctuation) topic patterns.
    prepared = prepared.replace(/\n(?=(?:#{1,6}\s*)?[A-Z][^.!?\n]{5,60}\s*-\s*[A-Z][^.!?\n]{3,120})/gm, marker)
    // Inline topic detection: strong pattern "Word Word(s) - Capital..." after digit or sentence punctuation
    prepared = prepared.replace(
      /(?<=[\d.!?\]\)])\s+(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5}\s*-\s*[A-Z][a-z])/g,
      ' ' + marker
    )

    // 2b. Split on "## Q1", "## Q2", "Q1", "Q2" etc. on their own line (common PDF format)
    // Handles both "## Q1" (Mathpix heading) and bare "Q1" variants
    prepared = prepared.replace(/(?:^|\n)[ \t]*(?:#{1,6}\s*)?Q(\d{1,3})[ \t]*[.:]?[ \t]*(?=\n|$)/gm, '\n' + marker)

    // 3. Split on explicit headers like "Question 1", "## 1", or simply "1.", "1)", "(1)", "1"
    // We allow it to be at start of line or preceded by multiple newlines
    // Added \n? to ensure we catch it even if there's a preceding newline from previous content
    prepared = prepared.replace(/(?:\n|^)[ \t]*(?:#{1,6}\s+|(?:\*\*|__)?(?:Question|Page|Q)\s+(?:\*\*|__)?|(?:\*\*|__)?\()?\b(\d{1,3})\b[\)\.]?(?:\*\*|__)?(?:[ \t]+|$)/gmi, marker)

    // 4. Inline "Question N" / "Page N" detection (no newline required)
    prepared = prepared.replace(
      /(?<=[\s\d.!?\]\)])(?=(?:\*{1,4}|_{1,4})?(?:Question|Page)\s+\d{1,3}\b)/gi,
      marker
    )

    // Split into blocks
    let rawBlocks = prepared.split(marker)
      .map(b => b.trim())
      .filter(b => b.length > 0)

    // SAFETY NET: If any block STILL contains 2+ "Difficulty: X" markers, it means
    // Mathpix merged questions in a way that fooled all our split patterns. Force-split.
    const safeBlocks = []
    const diffSplitRx = /((?:\*{1,4}|_{1,4})?Difficulty(?:\*{1,4}|_{1,4})?\s*:?\s*(?:Easy|Medium|Hard))/i
    const diffCountRx = /(?:\*{1,4}|_{1,4})?Difficulty(?:\*{1,4}|_{1,4})?\s*:?\s*(?:Easy|Medium|Hard)/gi
    for (const block of rawBlocks) {
      const matches = block.match(diffCountRx)
      if (matches && matches.length > 1) {
        // Split capturing the delimiter so it stays at the end of each piece
        const parts = block.split(diffSplitRx)
        // parts = [before1, diff1, between, diff2, after, ...]
        let current = ''
        for (let p = 0; p < parts.length; p++) {
          current += parts[p]
          // After capturing a Difficulty marker (odd index), close the block
          if (p % 2 === 1) {
            const t = current.trim()
            if (t.length > 0) safeBlocks.push(t)
            current = ''
          }
        }
        // Trailing remainder (after the last Difficulty)
        const tail = current.trim()
        if (tail.length > 0) safeBlocks.push(tail)
      } else {
        safeBlocks.push(block)
      }
    }
    rawBlocks = safeBlocks

    // ORPHAN MERGE: If a block is JUST a footer/header noise (e.g., "## Difficulty: Easy"
    // alone, "## Answer: B" alone, or just a section header like "## Long Explanation"),
    // it's a piece of the PREVIOUS question that got separated by the page-number split.
    // Merge it back into the previous block so the question stays whole.
    const ORPHAN_PATTERNS = [
      /^(?:#{1,6}\s*)?(?:\*{1,4}|_{1,4})?Difficulty(?:\*{1,4}|_{1,4})?\s*:?\s*(?:Easy|Medium|Hard)\s*$/i,
      /^(?:#{1,6}\s*)?(?:\*{1,4}|_{1,4})?Answer(?:\*{1,4}|_{1,4})?\s*:?\s*[A-D]\s*$/i,
      /^(?:#{1,6}\s*)?(?:\*{1,4}|_{1,4})?(?:Short Explanation|Long Explanation|Mathematical Shortcut|Explanation|Topic|Category|Tags)(?:\*{1,4}|_{1,4})?\s*:?\s*$/i,
      /^\d{1,3}\s*$/  // Bare page number footer
    ]
    const mergedBlocks = []
    for (const block of rawBlocks) {
      const t = block.trim()
      const isOrphan = t.length < 60 && ORPHAN_PATTERNS.some(rx => rx.test(t))
      if (isOrphan && mergedBlocks.length > 0) {
        mergedBlocks[mergedBlocks.length - 1] += '\n\n' + t
      } else {
        mergedBlocks.push(t)
      }
    }
    rawBlocks = mergedBlocks

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
      const isMCQ = /(?:Correct\s+)?Answer:\s*[A-D]/i.test(block) || /[A-D][\)\.]\s+/.test(block)
      const isSPR = /response:\s*([\-\d\.\/]+)/i.test(block) || /(?:Correct\s+)?Answer:\s*([\-\d\.\/]+)/i.test(block)
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
    
    // Detect Question Number only for logging/display.
    // Handles "Question 1", "Page 1", and bare "Q1" format
    const qNumMatch = block.substring(0, 200).match(/\b(?:Question|Page)\s+(\d{1,3})\b/i)
      || block.substring(0, 50).match(/^[ \t]*Q(\d{1,3})[ \t]*[.:]?[ \t]*$/m)
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
      // Handles: "Answer: C", "Correct Answer: C", "**Correct Answer:** C"
      const ansMatch = cleanBlock.match(/(?:Correct\s+)?Answer:\s*\**\s*([A-D])\b/i)
      correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : 'A'
    } else {
      const sprMatch = cleanBlock.match(/response:\s*([\-\d\.\/]+)/i) || 
                       cleanBlock.match(/Correct\s*\n?\s*response:\s*([\-\d\.\/]+)/i) ||
                       cleanBlock.match(/(?:Correct\s+)?Answer:\s*([\-\d\.\/]+)/i)
      correctAnswer = sprMatch ? sprMatch[1] : ''
    }

    // 4. Extract Question Text
    let questionText = cleanBlock.trim()
    const headerRegex = /\n\s*(?:#{1,6}\s*)?(?:\*\*|__)?(?:Answer|Short Explanation|Mathematical Shortcut|Long Explanation|Difficulty|response|Correct\s*\n?\s*response|Topic|Category|Tags|Question|Page)\s*(?::|\d)/i
    
    // NEW: Refined splitting for the specific "one question per page" format
    // We look for the FIRST occurrence of a major section header to end the question text
    const sectionHeaders = [
      'Correct Answer:',
      'Answer:', 
      'Options',
      'Short Explanation + SAT Tip',
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
    // Handle both "Short Explanation" and "Short Explanation + SAT Tip" variants
    const shortRaw = cleanBlock.match(sectionRx('Short Explanation'))
    const satTipRaw = cleanBlock.match(sectionRx('Short Explanation \\+ SAT Tip'))
    const shortcutRaw = cleanBlock.match(sectionRx('Mathematical Shortcut'))
    const longRaw = cleanBlock.match(sectionRx('Long Explanation'))
    
    let shortExplanation = ''
    // Prefer "Short Explanation + SAT Tip" over plain "Short Explanation"
    if (satTipRaw && satTipRaw[1]) shortExplanation = cleanContent(satTipRaw[1].trim())
    else if (shortRaw && shortRaw[1]) shortExplanation = cleanContent(shortRaw[1].trim())
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
      `(?=\\n+(?:#{1,6}\\s*)?\\*{0,4}(?:Short Explanation|Mathematical Shortcut|Long Explanation|Correct Answer|Answer|Difficulty|Topic|Category|Tags|Question|Page)[:\\s*]|$)`,
      'i'
    )
  }

  console.log(`\n==================================================`)
  console.log(`🏁 MATHPIX PARSING COMPLETE`)
  console.log(`Final Questions Count: ${questions.length}`)
  console.log(`==================================================\n`)

  return { questions, rawBlocks }
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

// --- Claude AI helpers ---

function isIncomplete(q) {
  const hasContent = q.content && q.content.trim().length > 10
  const hasOptions = q.type === 'ShortAnswer' || (q.options && q.options.filter(o => o && o.trim()).length >= 2)
  const hasAnswer = q.type === 'ShortAnswer'
    ? (q.correctAnswer && q.correctAnswer.trim().length > 0)
    : (q.correctAnswer && ['A','B','C','D'].includes(q.correctAnswer.toUpperCase()))
  return !hasContent || !hasOptions || !hasAnswer
}

async function fillWithGemini(apiKey, rawBlock, subject) {
  if (!rawBlock || rawBlock.trim().length < 5) return null

  const prompt = `You are an expert SAT question extractor. Extract the following SAT question from the raw text below and return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Subject: ${subject}

Raw question text:
${rawBlock.substring(0, 3000)}

Return this exact JSON structure:
{
  "content": "full question text here",
  "options": ["option A text", "option B text", "option C text", "option D text"],
  "correctAnswer": "A or B or C or D",
  "shortExplanation": "brief explanation",
  "longExplanation": "detailed step by step explanation",
  "difficulty": "Easy or Medium or Hard",
  "type": "MultipleChoice or ShortAnswer"
}

Rules:
- content: the actual question being asked (not the answer choices)
- options: exactly 4 strings for A, B, C, D (empty string if ShortAnswer)
- correctAnswer: single letter A/B/C/D for MultipleChoice, or numeric answer for ShortAnswer
- Keep all math expressions exactly as they appear
- If any field cannot be determined, use empty string`

  // Use direct REST API — avoids SDK version/model compatibility issues
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
      })
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.content || parsed.content.trim().length < 5) return null

  return {
    content: parsed.content || '',
    options: Array.isArray(parsed.options) && parsed.options.length === 4 ? parsed.options : ['', '', '', ''],
    correctAnswer: parsed.correctAnswer || '',
    shortExplanation: parsed.shortExplanation || '',
    longExplanation: parsed.longExplanation || '',
    explanation: parsed.shortExplanation || parsed.longExplanation || '',
    difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty) ? parsed.difficulty : null,
    type: parsed.type || 'MultipleChoice'
  }
}
