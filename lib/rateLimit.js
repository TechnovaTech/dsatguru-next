// Simple in-memory fixed-window rate limiter. Adequate for a single long-running (PM2) instance.
// For multi-instance / serverless, back this with Redis (e.g. @upstash/ratelimit).
const buckets = new Map()

export function rateLimit(key, { max = 5, windowMs = 60000 } = {}) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, remaining: max - 1, retryAfter: 0 }
  }
  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.reset - now) / 1000) }
  }
  bucket.count += 1
  return { ok: true, remaining: max - bucket.count, retryAfter: 0 }
}

// Best-effort client IP from a Next.js request.
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Periodic cleanup to bound memory.
try {
  const t = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
  }, 60000)
  if (typeof t.unref === 'function') t.unref()
} catch {}
