import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { Conversation, Message } from '../../../../lib/models/Message'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const pdfFile = formData.get('pdf')
    const userIds = JSON.parse(formData.get('userIds'))
    const message = formData.get('message')
    const studentName = formData.get('studentName')
    const subject = formData.get('subject')
    const testDate = formData.get('testDate')

    if (!pdfFile || !userIds || userIds.length === 0 || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save PDF to public/reports folder
    const bytes = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = pdfFile.name
    const reportsDir = path.join(process.cwd(), 'public', 'reports')
    
    // Create reports directory if it doesn't exist
    try {
      await mkdir(reportsDir, { recursive: true })
    } catch (err) {
      // Directory might already exist
    }
    
    const filePath = path.join(reportsDir, fileName)
    await writeFile(filePath, buffer)
    
    const pdfUrl = `/reports/${fileName}`

    // Create conversation and message for each selected user
    const messagePromises = userIds.map(async (userId) => {
      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [decoded.userId, userId] }
      })

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [decoded.userId, userId],
          lastMessage: `Shared PDF: ${studentName} - ${subject}`,
          lastMessageAt: new Date(),
          lastSenderId: decoded.userId
        })
      }

      const messageText = `${message}\n\n📊 Report Details:\n• Student: ${studentName}\n• Subject: ${subject}\n• Date: ${testDate}`
      
      // Create message with PDF link
      const newMessage = await Message.create({
        conversationId: conversation._id,
        senderId: decoded.userId,
        text: messageText,
        fileUrl: pdfUrl,
        fileName: fileName,
        fileType: 'application/pdf',
        seenBy: [decoded.userId]
      })

      // Update conversation
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: `Shared PDF: ${studentName} - ${subject}`,
        lastMessageAt: new Date(),
        lastSenderId: decoded.userId
      })

      return newMessage
    })

    await Promise.all(messagePromises)

    return NextResponse.json({ success: true, message: 'PDF shared successfully' })
  } catch (error) {
    console.error('Share PDF error:', error)
    return NextResponse.json({ error: 'Failed to share PDF', details: error.message }, { status: 500 })
  }
}
