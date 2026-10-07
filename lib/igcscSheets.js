// Practice sheets, server side: the shape the browser gets for one sheet.
// Lives here rather than in the route file, because a Next.js route module
// should export nothing but its HTTP handlers.
import { signedSheetUrl } from './igcscFiles'

// The link is signed: an <a href> cannot carry the Authorization header, so
// the signature is the permission. It is good for about two hours.
export function sheetView(s) {
  return {
    _id: String(s._id),
    curriculum: s.curriculum,
    subject: s.subject,
    folder: s.folder || '',
    kind: s.kind,
    period: Number(s.period) || 0,
    title: s.title,
    fileName: s.fileName || '',
    mime: s.mime || '',
    size: Number(s.size) || 0,
    visibleToStudents: s.visibleToStudents !== false,
    uploadedByName: s.uploadedByName || '',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    url: signedSheetUrl(s._id),
  }
}
