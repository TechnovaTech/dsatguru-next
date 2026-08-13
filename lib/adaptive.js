import Question from './models/Question'
import { resolveBankFilter } from './bankFilter'

// Pick the routing band ('low' | 'medium' | 'high') for a Module-1 raw % from a
// customConfig section's `routing` map. Falls back to the legacy accuracy thresholds.
function bandForPercent(pct, routing) {
  if (routing) {
    for (const key of ['low', 'medium', 'high']) {
      const b = routing[key]
      if (b && pct >= Number(b.min) && pct <= Number(b.max)) return key
    }
  }
  if (pct >= 75) return 'high'
  if (pct >= 50) return 'medium'
  return 'low'
}

// Choose the section config (rw/math) from the test's customConfig based on the
// session subject. Returns null when no customConfig is present.
function sectionConfig(test, subject) {
  const cfg = test?.customConfig
  if (!cfg) return null
  const isMath = String(subject || '').toLowerCase().includes('math')
  return isMath ? (cfg.math || null) : (cfg.rw || null)
}

// The Mongo filter for the pool this session draws from: resolve the bank selector
// (synthetic 'admin-math'/… or a real questionBankId) and constrain to active questions,
// plus the session subject when the selector didn't already pin one.
function poolBaseFilter(session) {
  const f = { ...resolveBankFilter(session.bankSelector || session.questionBankId), isActive: true }
  if (session.subject && f.subject == null) f.subject = { $regex: session.subject, $options: 'i' }
  return f
}

// Draw up to `total` question ids from the pool, preferring the given difficulty order but
// topping up from the other difficulties (and finally any difficulty) so Module 2 is never
// short when the bank is skewed — e.g. the imported R&W bank is entirely 'Medium', so a
// high-scoring student's 'Hard' preference must still fill from Medium. Excludes used ids.
async function drawFromPool(session, preferredOrder, total, usedIds) {
  const base = poolBaseFilter(session)
  const excluded = [...usedIds]
  const picked = []
  const order = [...preferredOrder, 'Hard', 'Medium', 'Easy'].filter((d, i, a) => a.indexOf(d) === i)
  for (const diff of order) {
    if (picked.length >= total) break
    const qs = await Question.find({ ...base, difficulty: diff, _id: { $nin: excluded } })
      .select('_id').limit(total - picked.length)
    for (const q of qs) { picked.push(q._id); excluded.push(q._id) }
  }
  // Final top-up ignoring difficulty (covers questions with null/other difficulty values).
  if (picked.length < total) {
    const qs = await Question.find({ ...base, _id: { $nin: excluded } })
      .select('_id').limit(total - picked.length)
    for (const q of qs) { picked.push(q._id); excluded.push(q._id) }
  }
  return picked
}

// Single source of truth for Module-1 -> Module-2 routing.
//
// Prefers the test's per-section customConfig (routing bands + difficulty distribution);
// otherwise routes a single preferred difficulty from the Module-1 accuracy. Either way it
// draws from the SESSION'S ACTUAL QUESTION POOL (resolved from the bank selector), NOT a
// non-existent testType:'Adaptive' set, and tops up across difficulties so the module is
// never empty. Returns an array of Question _ids for Module 2.
//
// Used by BOTH app/api/test-sessions/[id]/answer/route.js and
// app/api/test-sessions/[id]/submit/route.js so Module 2 is identical regardless
// of which path triggers the transition.
export async function buildAdaptiveModule({ session, test, accuracy, usedIds }) {
  const used = (usedIds || []).map(id => String(id))
  const baseTarget = Number(session.baseTarget || Math.floor(Number(session.totalQuestions || 50) / 2))

  // Preferred Module-2 difficulty from Module-1 accuracy (Digital-SAT style: stronger → harder).
  let preferred = 'Easy'
  if (accuracy >= 0.75) preferred = 'Hard'
  else if (accuracy >= 0.5) preferred = 'Medium'

  // customConfig band + distribution path: use the configured easy/medium/hard COUNTS as the
  // target mix, still drawn from the real pool (with top-up) rather than testType:'Adaptive'.
  const cfg = sectionConfig(test, session.subject)
  if (cfg && cfg.routing && cfg.distribution) {
    const pct = Math.round((Number(accuracy) || 0) * 100)
    const band = bandForPercent(pct, cfg.routing)
    const dist = cfg.distribution[band]
    if (dist) {
      const base = poolBaseFilter(session)
      const excluded = [...used]
      const picked = []
      for (const [diff, count] of [['Easy', Number(dist.easy || 0)], ['Medium', Number(dist.medium || 0)], ['Hard', Number(dist.hard || 0)]]) {
        if (count <= 0) continue
        const qs = await Question.find({ ...base, difficulty: diff, _id: { $nin: excluded } }).select('_id').limit(count)
        for (const q of qs) { picked.push(q._id); excluded.push(q._id) }
      }
      if (picked.length > 0) {
        const want = (Number(dist.easy || 0) + Number(dist.medium || 0) + Number(dist.hard || 0)) || baseTarget
        if (picked.length < want) {
          const more = await drawFromPool(session, [preferred], want - picked.length, [...used, ...picked.map(String)])
          picked.push(...more)
        }
        return picked
      }
    }
  }

  // Default path: baseTarget questions, preferring the accuracy-based difficulty, topping up.
  return drawFromPool(session, [preferred], baseTarget, used)
}
