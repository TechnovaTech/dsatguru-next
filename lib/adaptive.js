import Question from './models/Question'

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

// Build the Module-2 question set from a band's easy/medium/hard distribution counts,
// drawing from the Adaptive pool and avoiding already-used questions.
async function buildFromDistribution({ session, distribution, usedIds }) {
  const wanted = [
    ['Easy', Number(distribution?.easy || 0)],
    ['Medium', Number(distribution?.medium || 0)],
    ['Hard', Number(distribution?.hard || 0)]
  ]
  const picked = []
  const excluded = [...usedIds]
  for (const [difficulty, count] of wanted) {
    if (count <= 0) continue
    const qs = await Question.find({
      questionBankId: session.questionBankId,
      testType: 'Adaptive',
      difficulty,
      isActive: true,
      _id: { $nin: excluded }
    }).select('_id').limit(count)
    for (const q of qs) { picked.push(q._id); excluded.push(q._id) }
  }
  return picked
}

// Single source of truth for Module-1 -> Module-2 routing.
//
// Prefers the test's per-section customConfig (routing bands + difficulty
// distribution); falls back to the legacy single-difficulty selection driven by
// global accuracy. Returns an array of Adaptive question _ids for Module 2.
//
// Used by BOTH app/api/test-sessions/[id]/answer/route.js and
// app/api/test-sessions/[id]/submit/route.js so Module 2 is identical regardless
// of which path triggers the transition.
export async function buildAdaptiveModule({ session, test, accuracy, usedIds }) {
  const used = usedIds || []

  // customConfig band + distribution path.
  const cfg = sectionConfig(test, session.subject)
  if (cfg && cfg.routing && cfg.distribution) {
    const pct = Math.round((Number(accuracy) || 0) * 100)
    const band = bandForPercent(pct, cfg.routing)
    const distribution = cfg.distribution[band]
    if (distribution) {
      const built = await buildFromDistribution({ session, distribution, usedIds: used })
      // Only adopt the distribution result if it actually produced questions;
      // otherwise fall through to the legacy routing below.
      if (built.length > 0) return built
    }
  }

  // Fallback: legacy single-difficulty routing from global accuracy.
  const baseTarget = Number(session.baseTarget || Math.floor(Number(session.totalQuestions || 50) / 2))
  let adaptiveDifficulty = 'Easy'
  if (accuracy >= 0.75) adaptiveDifficulty = 'Hard'
  else if (accuracy >= 0.5) adaptiveDifficulty = 'Medium'
  const adaptiveQuestions = await Question.find({
    questionBankId: session.questionBankId,
    testType: 'Adaptive',
    difficulty: adaptiveDifficulty,
    isActive: true,
    _id: { $nin: used }
  }).select('_id').limit(baseTarget)
  return adaptiveQuestions.map(q => q._id)
}
