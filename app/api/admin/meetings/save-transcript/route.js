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
    let summary = 'Summary generation failed.'
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (GEMINI_API_KEY) {
      try {
        const prompt = `You are a meeting assistant. Summarize the following meeting transcript into a concise summary (max 200 words). Focus on key topics discussed and any action items. 
        
        Transcript:
        ${transcript.substring(0, 10000)}`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
            })
          }
        )

        if (res.ok) {
          const data = await res.json()
          summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || summary
        }
      } catch (e) {
        console.error('Gemini summary error:', e)
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
