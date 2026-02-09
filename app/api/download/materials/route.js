import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    const filepath = path.join(process.cwd(), 'public', 'uploads', 'materials', filename)
    
    // Check if file exists before trying to read
    if (!existsSync(filepath)) {
      console.warn(`File not found at path: ${filepath}`)
      // Fallback: Redirect to static path if file logic fails
      // This handles cases where file exists but path resolution is tricky
      return NextResponse.redirect(new URL(`/uploads/materials/${filename}`, request.url))
    }

    try {
      const fileBuffer = await readFile(filepath)
      
      // Get file extension to set proper content type
      const ext = path.extname(filename).toLowerCase()
      let contentType = 'application/octet-stream'
      
      if (ext === '.pdf') contentType = 'application/pdf'
      else if (ext === '.doc') contentType = 'application/msword'
      else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else if (ext === '.mp4') contentType = 'video/mp4'
      else if (ext === '.avi') contentType = 'video/x-msvideo'
      else if (ext === '.mov') contentType = 'video/quicktime'

      // Extract original filename (remove timestamp prefix)
      const originalName = filename.replace(/^\d+-/, '')

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${originalName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } catch (fileError) {
      console.error('File read error:', fileError)
      // Fallback to static redirect on read error
      return NextResponse.redirect(new URL(`/uploads/materials/${filename}`, request.url))
    }
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}