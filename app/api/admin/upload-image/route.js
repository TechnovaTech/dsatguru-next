import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function POST(request) {
  try {
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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    // Files land under the app's own origin, so an .html/.svg "image" would be a stored
    // script on dsatguru.com — only real raster image types, and a sane size.
    const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
    const ext = path.extname(file.name || '').toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: 'Only PNG, JPG, GIF or WEBP images are allowed' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      // Directory exists
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    // Sanitize filename and add timestamp
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(uploadDir, filename)
    
    await writeFile(filepath, buffer)
    
    const url = `/uploads/questions/${filename}`
    
    return NextResponse.json({ 
      success: true, 
      url, 
      filename: file.name 
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload image', 
      details: error.message 
    }, { status: 500 })
  }
}
