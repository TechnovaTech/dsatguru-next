import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.mp4', '.mov', '.avi', '.png', '.jpg', '.jpeg', '.gif', '.webp']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

export async function POST(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const decoded = verifyToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

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
  const safeExt = path.extname(path.basename(file.name || '')).toLowerCase()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'messages')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), buffer)

  return NextResponse.json({
    fileUrl: `/uploads/messages/${fileName}`,
    fileName: path.basename(file.name || fileName),
    fileType: file.type,
  })
}
