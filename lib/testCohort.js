// Cohort statistics for one test, shared by the student and admin analytics
// endpoints so both report the SAME "Best" and "Average" numbers.
//
// Per content domain we roll every session's responses up into that session's
// accuracy and average time, then take the best and the mean across sessions. A
// session only contributes to a domain it actually reached, so a student who
// never saw a domain cannot drag its average down.
//
// IMPORTANT — the denominator must match the one lib/satAnalysis.js uses for the
// student's own "You" bar, or the comparison charts compare two different metrics
// and a student can appear to rank below their own session. Both count questions
// the student SAW: an answered question and a seen-but-blank one both count, and a
// blank simply is not correct.
import { answersMatch } from './scoring/satScale'
import { SKILL_TO_DOMAIN, DOMAIN_SKILLS } from './dsatDomains'

const round = (n) => (n == null ? null : Math.round(n))
const mean = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
const isAnswered = (v) => v != null && String(v).trim() !== ''

// Resolve a question's content domain exactly as the student-side breakdown does:
// the canonical skill wins, then a canonical stored domain. Anything else is not a
// domain we can compare on, so it is skipped rather than keyed on a legacy slug.
export function canonicalDomain(meta) {
  const skill = String(meta?.skill || '').trim()
  if (skill && SKILL_TO_DOMAIN[skill]) return SKILL_TO_DOMAIN[skill]
  const domain = String(meta?.domain || '').trim()
  if (domain && DOMAIN_SKILLS[domain]) return domain
  return ''
}

// questionMeta: { [questionId]: { domain, skill, correctAnswer, options } }
export function computeUnitCohort(sessions, questionMeta) {
  const perDomain = {}
  for (const session of sessions || []) {
    // A legacy module test can list the same question twice, and the runner then
    // stores one response row per occurrence. Keep the LAST row per question so a
    // duplicate cannot count twice, matching how the callers build their own stats.
    const latest = new Map()
    for (const response of session.responses || []) {
      if (!response || response.questionId == null) continue
      latest.set(String(response.questionId), response)
    }

    const agg = {}
    for (const [qId, response] of latest) {
      const meta = questionMeta[qId]
      if (!meta) continue
      const domain = canonicalDomain(meta)
      if (!domain) continue
      const answered = isAnswered(response.selectedAnswer)
      const a = (agg[domain] = agg[domain] || { correct: 0, seen: 0, seconds: 0, timed: 0 })
      // Every stored response is a question the student SAW.
      a.seen++
      if (answered && answersMatch(meta.correctAnswer, response.selectedAnswer, meta.options)) a.correct++
      const secs = Number(response.timeSpent) || 0
      if (secs > 0) { a.seconds += secs; a.timed++ }
    }

    for (const [domain, a] of Object.entries(agg)) {
      if (!a.seen) continue
      const p = (perDomain[domain] = perDomain[domain] || { accuracies: [], speeds: [] })
      p.accuracies.push((a.correct / a.seen) * 100)
      if (a.timed > 0) p.speeds.push(a.seconds / a.timed)
    }
  }

  const out = {}
  for (const [domain, p] of Object.entries(perDomain)) {
    out[domain] = {
      bestAccuracy: p.accuracies.length ? round(Math.max(...p.accuracies)) : null,
      avgAccuracy: round(mean(p.accuracies)),
      // "Best" speed is the FASTEST average, i.e. the smallest number.
      bestSeconds: p.speeds.length ? round(Math.min(...p.speeds)) : null,
      avgSeconds: round(mean(p.speeds)),
      students: p.accuracies.length,
    }
  }
  return out
}

// Share of PEERS this session outscored, 0–100.
//
// `sessionId` pins which attempt is being ranked — a student with several attempts
// on the same test must be ranked on the one they are looking at, not an arbitrary
// one. Peers are deduplicated by user (their best score counts), and the viewer's
// own other attempts are excluded, so re-taking a test cannot inflate the number.
// Null when there is nobody to compare against.
export function computePercentile(sessions, userId, sessionId) {
  const scored = (sessions || []).filter((s) => typeof s.totalScore === 'number')
  if (!scored.length || !userId) return null
  const uid = (s) => String(s.userId?._id || s.userId || '')

  const mine = sessionId
    ? scored.find((s) => String(s._id) === String(sessionId))
    : scored.filter((s) => uid(s) === String(userId)).sort((a, b) => b.totalScore - a.totalScore)[0]
  if (!mine) return null

  // One entry per OTHER user, at their best score.
  const bestByPeer = new Map()
  for (const s of scored) {
    const u = uid(s)
    if (!u || u === String(userId)) continue
    if (!bestByPeer.has(u) || s.totalScore > bestByPeer.get(u)) bestByPeer.set(u, s.totalScore)
  }
  const peers = [...bestByPeer.values()]
  if (!peers.length) return null
  const below = peers.filter((score) => score < mine.totalScore).length
  return Math.round((below / peers.length) * 100)
}
