import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN } from '../../../../../lib/igcscAuth'
import { StoreError, getStoreSettings } from '../../../../../lib/igcscStore'
import { CURRENCIES, priceProblem } from '../../../../../lib/igcscStoreShared'

// The store's own switches: the currency every price is in, what a newly
// synced paper costs, and whether anyone may buy at all.
//
//   GET → { settings }
//   PUT { currency?, defaultPaperPrice?, storeOpen? } → { settings }
//
// Admin only.
export const dynamic = 'force-dynamic'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const bad = (message) => NextResponse.json({ error: message }, { status: 400 })

// Numbers arrive as numbers or as typed-in strings; anything else is not one.
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)

// What the admin pages need from the settings document, and nothing else.
// The papers list returns the same shape.
export function settingsView(s) {
  return {
    currency: s?.currency || 'usd',
    defaultPaperPrice: Number(s?.defaultPaperPrice || 0),
    storeOpen: s?.storeOpen !== false,
    lastSyncAt: s?.lastSyncAt || null,
    lastSyncSummary: s?.lastSyncSummary || null,
  }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const models = await igcscModels()
    return NextResponse.json({ settings: settingsView(await getStoreSettings(models)) })
  } catch (e) { return fail(e, 'GET /api/igcsc/admin/store-settings') }
}

export async function PUT(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const models = await igcscModels()
    const current = await getStoreSettings(models)
    const set = {}

    if (body?.currency !== undefined) {
      const currency = typeof body.currency === 'string' ? body.currency.trim().toLowerCase() : ''
      if (!CURRENCIES.includes(currency)) {
        return bad(`Choose one of: ${CURRENCIES.map((c) => c.toUpperCase()).join(', ')}.`)
      }
      set.currency = currency
    }
    const currency = set.currency || current.currency

    // Checked against the currency it will be charged in - the new one when it
    // changes in the same request. A default that was fine in dollars can be
    // below the minimum card charge in another currency.
    if (body?.defaultPaperPrice !== undefined) {
      const price = num(body.defaultPaperPrice)
      const problem = priceProblem(price, currency)
      if (problem) return bad(problem)
      set.defaultPaperPrice = price
    } else if (set.currency) {
      const problem = priceProblem(current.defaultPaperPrice, currency)
      if (problem) return bad(`The default paper price does not work in ${currency.toUpperCase()}: ${problem} Set a new default price too.`)
    }

    if (body?.storeOpen !== undefined) {
      if (typeof body.storeOpen !== 'boolean') return bad('storeOpen must be true or false.')
      set.storeOpen = body.storeOpen
    }

    if (Object.keys(set).length) {
      await models.StoreSettings.updateOne({ key: 'global' }, { $set: set })
    }
    return NextResponse.json({ settings: settingsView(await getStoreSettings(models)) })
  } catch (e) { return fail(e, 'PUT /api/igcsc/admin/store-settings') }
}
