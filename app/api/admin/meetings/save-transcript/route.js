import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomName, transcript } = await request.json()
    if (!roomName || !transcript) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Find course with this meeting
    const course = await Course.findOne({ 'meetings.link': roomName })
    if (!course) {
      return NextResponse.json({ error: 'Meeting not found in any course' }, { status: 404 })
    }

    const meetingIndex = course.meetings.findIndex(m => m.link === roomName)
    if (meetingIndex === -1) {
      return NextResponse.json({ error: 'Meeting link mismatch' }, { status: 404 })
    }

    // Generate AI Summary with Gemini
    let summary = 'Transcript saved, but summary could not be generated.'
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    
    if (!GEMINI_API_KEY) {
      summary = 'Summary skipped: GEMINI_API_KEY is not configured in environment variables.'
      console.warn('GEMINI_API_KEY missing')
    } else if (transcript.trim().length < 20) {
      summary = 'Summary skipped: Transcript is too short to summarize.'
      console.warn('Transcript too short')
    } else {
      try {
        const prompt = `You are an advanced meeting assistant (similar to Microsoft Copilot). Analyze the following meeting transcript and provide an "Intelligent Recap" in a clear, structured format.
        
        Please include:
        1. **Executive Summary**: A concise overview of the meeting (2-3 sentences).
        2. **Key Decisions**: List any major decisions or agreements made.
        3. **Action Items**: Extract specific tasks assigned to participants.
        4. **Mentions & Assignments**: Track who was mentioned in relation to specific tasks or topics.
        5. **Follow-up Tasks**: Suggest potential next steps based on the discussion.
        6. **Topic Chapters**: Break down the meeting into main topics discussed with timestamps (e.g. [00:05:30] Introduction).
        
        Transcript:
        ${transcript.substring(0, 15000)}`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                temperature: 0.2, 
                maxOutputTokens: 1024,
                topP: 0.8,
                topK: 40
              }
            })
          }
        )

        if (res.ok) {
          const data = await res.json()
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (generatedText) {
            summary = generatedText
          }
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('Gemini API error details:', errorData)
          summary = `AI Summary failed: Gemini API returned ${res.status} ${res.statusText}. ${errorData?.error?.message || ''}`
        }
      } catch (e) {
        console.error('Gemini summary error:', e)
        summary = `AI Summary error: ${e.message}`
      }
    }

    // Update meeting
    course.meetings[meetingIndex].transcript = transcript
    course.meetings[meetingIndex].transcriptSummary = summary
    course.meetings[meetingIndex].transcriptGeneratedAt = new Date()
    
    await course.save()

    return NextResponse.json({ 
      success: true, 
      message: 'Transcript saved and summarized',
      summary 
    })
  } catch (error) {
    console.error('Save transcript error:', error)
    return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
  }
}
