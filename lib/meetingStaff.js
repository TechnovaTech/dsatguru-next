import { getTokenFromRequest, verifyToken } from './auth'
import { STAFF_ROLES } from './constants/roles'
import { verifyIgcscToken, IGCSC_STAFF } from './igcscAuth'

// DsatGuru and IGCSC have separate users, separate databases and separate
// tokens, but the whiteboard endpoints hold no per-product data — they write a
// file or a rendezvous row and hand back a URL. Rather than duplicate each
// route per product, accept a staff token from either side.
export function staffFromEitherProduct(request) {
  const raw = getTokenFromRequest(request)
  if (!raw) return null
  const dsat = verifyToken(raw)
  if (dsat && STAFF_ROLES.includes(dsat.role)) {
    return { id: String(dsat.userId || dsat.id || ''), name: dsat.name || dsat.email, product: 'dsat' }
  }
  const igcsc = verifyIgcscToken(raw)
  if (igcsc && IGCSC_STAFF.includes(igcsc.role)) {
    return { id: String(igcsc.userId || igcsc.id || ''), name: igcsc.name || igcsc.email, product: 'igcsc' }
  }
  return null
}
