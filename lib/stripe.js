import Stripe from 'stripe'

// One Stripe client, with the API version pinned.
//
// The DSAT routes each build their own client without a version, so they ride
// whatever the SDK defaults to - and a dependency bump could change response
// shapes under live payments. New code uses this; the old routes can follow.
let client = null

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  return client
}

// Prices live in major units (dollars) in the database, as on the DSAT side.
// Stripe wants minor units. Every currency we offer has two decimal places.
export function toMinor(amount) {
  return Math.round(Number(amount || 0) * 100)
}
