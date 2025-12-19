import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'materials')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.log('Directory creation error (might already exist):', error.message)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${originalName}`
    const filepath = path.join(uploadsDir, filename)

    // Write file with error handling
    try {
      await writeFile(filepath, buffer)
    } catch (writeError) {
      console.error('File write error:', writeError)
      return NextResponse.json({ 
        error: 'Failed to save file. Check directory permissions.' 
      }, { status: 500 })
    }

    // Return the public URL - use absolute URL for live server
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const fileUrl = `${baseUrl}/uploads/materials/${filename}`
    
    return NextResponse.json({ 
      success: true, 
      url: fileUrl,
      filename: originalName
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: `Upload failed: ${error.message}` 
    }, { status: 500 })
  }
}