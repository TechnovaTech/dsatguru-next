import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.mp4', '.mov', '.avi', '.png', '.jpg', '.jpeg', '.gif', '.webp']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

export async function POST(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded || !['Admin', 'TutorAdmin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate type and size before touching disk.
    const ext = path.extname(file.name || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }
    if (typeof file.size === 'number' && file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'materials')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.log('Directory creation error (might already exist):', error.message)
    }

    // Sanitize: only ever use the base filename, stripped of unsafe characters.
    const timestamp = Date.now()
    const originalName = path.basename(file.name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${originalName}`
    const filepath = path.join(uploadsDir, filename)

    try {
      await writeFile(filepath, buffer)
    } catch (writeError) {
      console.error('File write error:', writeError)
      return NextResponse.json({
        error: 'Failed to save file. Check directory permissions.'
      }, { status: 500 })
    }

    const fileUrl = `/uploads/materials/${filename}`
    return NextResponse.json({ success: true, url: fileUrl, filename: originalName })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
