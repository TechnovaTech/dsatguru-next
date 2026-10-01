import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import { StoreError, getStoreSettings } from '../../../../../lib/igcscStore'
import { planSummary } from '../../../../../lib/igcscStoreShared'

export const dynamic = 'force-dynamic'

// GET /api/igcsc/store/plans - the plans on sale, in the order the admin set.

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const [settings, rows] = await Promise.all([
      getStoreSettings(models),
      models.Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1, _id: 1 }).lean(),
    ])
    const plans = rows.map((p) => ({
      _id: String(p._id),
      name: p.name || '',
      description: p.description || '',
      kind: p.kind,
      credits: p.credits || 0,
      scope: p.scope || 'all',
      curriculum: p.curriculum || '',
      subject: p.subject || '',
      durationDays: p.durationDays || 0,
      price: Number(p.price || 0),
      features: Array.isArray(p.features) ? p.features.filter(Boolean).map(String) : [],
      highlight: !!p.highlight,
      summary: planSummary(p),
    }))
    return NextResponse.json({ plans, currency: settings.currency, storeOpen: !!settings.storeOpen })
  } catch (e) { return fail(e, 'GET /api/igcsc/store/plans') }
}
