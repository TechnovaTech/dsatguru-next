// Students' handwritten answers: phone photos of the page, or a scanned PDF.
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
const FILE_RE = /^[a-f0-9]{16}\.(jpg|png|webp|pdf)$/

// Trust the bytes, not the file name or the Content-Type.
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

// What a student may hand in for a written answer: a photo of the page, or the
// PDF a scanner app produces. Like sniffImage, the type comes from the bytes -
// the file name and the browser's Content-Type are both attacker-controlled.
export function sniffAnswer(buf) {
  if (!buf || buf.length < 12) return null
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf'
  return sniffImage(buf)
}

function dirFor(attemptId) {
  if (!ID_RE.test(String(attemptId))) throw new Error('bad attempt id')
  return path.join(ANSWER_ROOT, String(attemptId))
}

export async function saveAnswerImage(attemptId, buf, mime) {
  if (!EXT[mime]) throw new Error('unsupported answer type')
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

// ─────────────────────────────────────────────────────────────────────────────
// Practice sheets: the PDFs, Word files and images staff upload into a Question
// Bank folder. Same rules as the answer photos - private on disk, a random
// stored name (never the upload's own), the type read from the bytes, and a
// signed, expiring link as the permission to read one.
// ─────────────────────────────────────────────────────────────────────────────
export const SHEET_ROOT = process.env.IGCSC_PRIVATE_DIR
  ? path.join(process.env.IGCSC_PRIVATE_DIR, 'igcsc-sheets')
  : path.join(process.cwd(), 'private', 'igcsc-sheets')

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const SHEET_EXT = { 'application/pdf': 'pdf', [DOCX]: 'docx', 'image/jpeg': 'jpg', 'image/png': 'png' }
const SHEET_FILE_RE = /^[a-f0-9]{16}\.(pdf|docx|jpg|png)$/

// PDF, JPG, PNG from their signatures. A .docx is a zip, and the zip header is
// all that can be checked without unpacking it, so the name must agree too.
export function sniffSheet(buf, name = '') {
  if (!buf || buf.length < 12) return null
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf'
  const img = sniffImage(buf)
  if (img === 'image/jpeg' || img === 'image/png') return img
  const zip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
  if (zip && /\.docx$/i.test(String(name || ''))) return DOCX
  return null
}

export async function saveSheetFile(buf, mime) {
  const ext = SHEET_EXT[mime]
  if (!ext) throw new Error('unsupported sheet type')
  const file = `${crypto.randomBytes(8).toString('hex')}.${ext}`
  await mkdir(SHEET_ROOT, { recursive: true })
  await writeFile(path.join(SHEET_ROOT, file), buf)
  return file
}

// The absolute path of a stored sheet; throws on anything but a stored name.
export function sheetPath(file) {
  if (!SHEET_FILE_RE.test(String(file))) throw new Error('bad file name')
  return path.join(SHEET_ROOT, String(file))
}

export async function deleteSheetFile(file) {
  if (!SHEET_FILE_RE.test(String(file))) return
  try { await unlink(path.join(SHEET_ROOT, file)) } catch { /* already gone */ }
}

function signSheet(sheetId, exp) {
  return crypto
    .createHmac('sha256', `igcsc-sheets|${process.env.JWT_SECRET || ''}`)
    .update(`${sheetId}|${exp}`)
    .digest('hex')
}

// A link to one sheet that works for about two hours - hour-rounded, like the
// answer-photo links, so a list refresh does not hand out a new URL each time.
export function signedSheetUrl(sheetId, ttlMs = 2 * 3600 * 1000) {
  const exp = Math.ceil((Date.now() + ttlMs) / 3600000) * 3600000
  return `/api/igcsc/sheets/${sheetId}/file?exp=${exp}&sig=${signSheet(String(sheetId), exp)}`
}

export function verifySheetSignature(sheetId, exp, sig) {
  const e = Number(exp)
  if (!Number.isFinite(e) || e < Date.now()) return false
  const want = Buffer.from(signSheet(String(sheetId), e))
  const got = Buffer.from(String(sig || ''))
  return want.length === got.length && crypto.timingSafeEqual(want, got)
}
