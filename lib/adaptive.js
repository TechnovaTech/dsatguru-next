import mongoose from 'mongoose'
import Question from './models/Question'
import { resolveBankFilter } from './bankFilter'
import { composeDsatModule } from './dsatDomains'

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

// Load the session's candidate pool with the fields the blueprint composer needs.
// $sample caps memory on a very large bank while keeping the draw representative
// (when the pool is smaller than the cap, $sample simply returns all of it).
const POOL_CAP = 4000
async function loadPool(session, used) {
  const match = { ...poolBaseFilter(session) }
  const excluded = (used || [])
    .filter(id => mongoose.Types.ObjectId.isValid(String(id)))
    .map(id => new mongoose.Types.ObjectId(String(id)))
  if (excluded.length) match._id = { $nin: excluded }
  return Question.aggregate([
    { $match: match },
    { $sample: { size: POOL_CAP } },
    { $project: { _id: 1, domain: 1, skill: 1, subject: 1, difficulty: 1, options: 1, tags: 1 } },
  ])
}

// Single source of truth for Module-1 -> Module-2 routing.
//
// Module 2 is composed against the real Digital-SAT blueprint (lib/dsatDomains.js —
// domain mix AND difficulty mix, both derived from the December 2025 pattern
// analysis), scaled to this session's module length. The Module-1 accuracy picks
// the routed form: stronger student → the harder Module-2 blueprint.
//
// A test's per-section customConfig (routing bands + explicit easy/medium/hard
// counts) still wins over the blueprint's difficulty mix when an admin has set one;
// the domain mix is applied either way.
//
// Everything is drawn from the SESSION'S ACTUAL QUESTION POOL (resolved from the
// bank selector), NOT a non-existent testType:'Adaptive' set, and falls back to a
// plain difficulty draw so the module is never empty. Returns Question _ids.
//
// Used by BOTH app/api/test-sessions/[id]/answer/route.js and
// app/api/test-sessions/[id]/submit/route.js so Module 2 is identical regardless
// of which path triggers the transition.
export async function buildAdaptiveModule({ session, test, accuracy, usedIds }) {
  const used = (usedIds || []).map(id => String(id))
  const baseTarget = Number(session.baseTarget || Math.floor(Number(session.totalQuestions || 50) / 2))
  const section = String(session.subject || '').toLowerCase().includes('math') ? 'math' : 'rw'

  // Routed Module-2 form from Module-1 accuracy (Digital-SAT style: stronger → harder).
  let tier = 'Easy'
  if (accuracy >= 0.75) tier = 'Hard'
  else if (accuracy >= 0.5) tier = 'Medium'

  // Admin-configured band → explicit difficulty counts, when present.
  let difficulty
  const cfg = sectionConfig(test, session.subject)
  if (cfg && cfg.routing && cfg.distribution) {
    const pct = Math.round((Number(accuracy) || 0) * 100)
    const dist = cfg.distribution[bandForPercent(pct, cfg.routing)]
    if (dist && (Number(dist.easy) || Number(dist.medium) || Number(dist.hard))) {
      difficulty = { Easy: Number(dist.easy || 0), Medium: Number(dist.medium || 0), Hard: Number(dist.hard || 0) }
    }
  }
  // An explicit distribution also states the module's length.
  const size = difficulty ? (difficulty.Easy + difficulty.Medium + difficulty.Hard) || baseTarget : baseTarget

  try {
    const pool = await loadPool(session, used)
    if (pool.length) {
      const picked = composeDsatModule(pool, section, tier, new Set(), { moduleNum: 2, size, difficulty })
      if (picked.length) return picked.map(q => q._id)
    }
  } catch (e) {
    console.error('buildAdaptiveModule: blueprint compose failed, falling back', e?.message)
  }

  // Fallback: plain difficulty-ordered draw, topping up so the module is never short.
  return drawFromPool(session, [tier], size, used)
}
