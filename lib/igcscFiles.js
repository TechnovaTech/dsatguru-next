// Photos of students' handwritten answers.
//
// NOT under public/uploads: nginx serves that folder to anyone who can guess a
// URL. These live under private/ (git-ignored, untouched by `git reset --hard`
// on deploy) and are served only through an API route that checks a signed,
// expiring link - an <img> tag cannot send an Authorization header, so the
// signature is the permission.
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export const ANSWER_ROOT = process.env.IGCSC_PRIVATE_DIR
  ? path.join(process.env.IGCSC_PRIVATE_DIR, 'igcsc-answers')
  : path.join(process.cwd(), 'private', 'igcsc-answers')

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_PAGES = 20

const ID_RE = /^[a-f0-9]{24}$/i
const FILE_RE = /^[a-f0-9]{16}\.(jpg|png|webp)$/

// Trust the bytes, not the file name or the Content-Type.
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function dirFor(attemptId) {
  if (!ID_RE.test(String(attemptId))) throw new Error('bad attempt id')
  return path.join(ANSWER_ROOT, String(attemptId))
}

export async function saveAnswerImage(attemptId, buf, mime) {
  const id = crypto.randomBytes(8).toString('hex')
  const file = `${id}.${EXT[mime]}`
  const dir = dirFor(attemptId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, file), buf)
  return { id, file, mime, size: buf.length }
}

export async function readAnswerImage(attemptId, file) {
  if (!FILE_RE.test(String(file))) throw new Error('bad file name')
  return readFile(path.join(dirFor(attemptId), file))
}

export async function deleteAnswerImage(attemptId, file) {
  if (!FILE_RE.test(String(file))) return
  try { await unlink(path.join(dirFor(attemptId), file)) } catch { /* already gone */ }
}

function sign(attemptId, uploadId, exp) {
  return crypto
    .createHmac('sha256', `igcsc-answers|${process.env.JWT_SECRET || ''}`)
    .update(`${attemptId}|${uploadId}|${exp}`)
    .digest('hex')
}

// A link to one page that works for two hours.
export function signedUploadUrl(attemptId, uploadId, ttlMs = 2 * 3600 * 1000) {
  // Rounded up to the hour, so the same page keeps the same URL for an hour:
  // a fresh signature on every poll would make the browser re-download every
  // thumbnail every few seconds.
  const exp = Math.ceil((Date.now() + ttlMs) / 3600000) * 3600000
  return `/api/igcsc/attempts/${attemptId}/uploads/${uploadId}?exp=${exp}&sig=${sign(String(attemptId), String(uploadId), exp)}`
}

export function verifyUploadSignature(attemptId, uploadId, exp, sig) {
  const e = Number(exp)
  if (!Number.isFinite(e) || e < Date.now()) return false
  const want = Buffer.from(sign(String(attemptId), String(uploadId), e))
  const got = Buffer.from(String(sig || ''))
  return want.length === got.length && crypto.timingSafeEqual(want, got)
}
