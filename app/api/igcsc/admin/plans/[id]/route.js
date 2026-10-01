import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN } from '../../../../../../lib/igcscAuth'
import { StoreError, isOid, getStoreSettings } from '../../../../../../lib/igcscStore'
import { readPlan, planView } from '../route'

// One plan.
//
//   PUT    { any plan field } → { plan }   fields left out keep their value
//   DELETE → { ok, deactivated }
//
// Editing never changes what earlier buyers got: each order carries a snapshot
// of the plan as it was sold.
export const dynamic = 'force-dynamic'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const notFound = () => NextResponse.json({ error: 'That plan no longer exists.' }, { status: 404 })

export async function PUT(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    if (!isOid(params?.id)) return notFound()
    const body = await request.json().catch(() => ({}))
    const models = await igcscModels()
    const existing = await models.Plan.findById(params.id).lean()
    if (!existing) return notFound()

    const { currency } = await getStoreSettings(models)
    const { plan, error } = readPlan(body, existing, currency)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const fresh = await models.Plan.findByIdAndUpdate(existing._id, { $set: plan }, { new: true }).lean()
    if (!fresh) return notFound()
    return NextResponse.json({ plan: planView(fresh) })
  } catch (e) { return fail(e, 'PUT /api/igcsc/admin/plans/[id]') }
}

// A plan someone has bought (or been given) stays as a record, switched off;
// only a plan nobody ever had is removed outright.
export async function DELETE(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    if (!isOid(params?.id)) return notFound()
    const models = await igcscModels()
    const plan = await models.Plan.findById(params.id).select('_id').lean()
    if (!plan) return notFound()

    if (await models.Order.exists({ planId: plan._id })) {
      await models.Plan.updateOne({ _id: plan._id }, { $set: { isActive: false } })
      return NextResponse.json({ ok: true, deactivated: true })
    }
    await models.Plan.deleteOne({ _id: plan._id })
    return NextResponse.json({ ok: true, deactivated: false })
  } catch (e) { return fail(e, 'DELETE /api/igcsc/admin/plans/[id]') }
}
