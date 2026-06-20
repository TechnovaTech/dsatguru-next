import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB — screenshots are small

// POST /api/bug-reports/upload — any signed-in user uploads a screenshot.
// Returns { url } pointing at the statically-served /uploads/bug-reports file.
export async function POST(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error

    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = path.extname(file.name || '').toLowerCase()
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ error: 'Only image files are allowed (png, jpg, gif, webp).' }, { status: 400 })
    }
    if (typeof file.size === 'number' && file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 15MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'bug-reports')
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    await writeFile(path.join(uploadDir, fileName), buffer)

    return NextResponse.json({ url: `/uploads/bug-reports/${fileName}` })
  } catch (error) {
    console.error('Error uploading bug-report screenshot:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
