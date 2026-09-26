// Turning a pile of wrong answers into something a student can act on.
//
// "You got 42 wrong" is not a diagnosis. What matters is WHY each one was lost,
// because the fix differs completely: a rushed slip needs checking work, a slow
// miss needs the concept re-taught, and a skip needs pacing practice.
import { normalizeRow, STATUS, SUBJECT_MATH, DOMAIN_SHORT } from './satAnalysis'

// Roughly the pace the digital SAT allows per question, per section.
// RW: 64 questions / 64 minutes ≈ 60s. Math: 44 questions / 70 minutes ≈ 95s.
export const EXPECTED_SECONDS = { [SUBJECT_MATH]: 95, default: 64 }

export function expectedSeconds(subject) {
  return EXPECTED_SECONDS[subject] || EXPECTED_SECONDS.default
}

// A wrong answer given in well under the time the question deserves is usually
// a misread rather than a knowledge gap; one that ran long is the opposite.
const RUSHED_RATIO = 0.45
const LABOURED_RATIO = 1.3

export const MISTAKE_KINDS = {
  rushed: {
    key: 'rushed',
    label: 'Rushed slips',
    tone: 'amber',
    blurb: 'Answered fast and got it wrong — usually a misread, not a gap.',
    advice: 'Slow down on the first read and underline exactly what is asked.',
  },
  concept: {
    key: 'concept',
    label: 'Concept gaps',
    tone: 'rose',
    blurb: 'Spent a long time and still missed it — the method is not solid yet.',
    advice: 'Re-learn these skills before drilling more questions on them.',
  },
  steady: {
    key: 'steady',
    label: 'Close misses',
    tone: 'violet',
    blurb: 'Normal pace, wrong answer — often one careless step.',
    advice: 'Redo these and write out every step to find where it breaks.',
  },
  skipped: {
    key: 'skipped',
    label: 'Left blank',
    tone: 'slate',
    blurb: 'Seen but never answered — points given away for free.',
    advice: 'The SAT has no negative marking: always put an answer down.',
  },
}

function classify(row) {
  if (row.status === STATUS.OMITTED) return 'skipped'
  if (row.status !== STATUS.INCORRECT) return null
  const expected = expectedSeconds(row.subject)
  // A missing timer reading cannot tell us anything about pace.
  if (!row.seconds) return 'steady'
  if (row.seconds < expected * RUSHED_RATIO) return 'rushed'
  if (row.seconds > expected * LABOURED_RATIO) return 'concept'
  return 'steady'
}

const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null)

/**
 * Full mistake picture for a set of answered-question rows.
 * Safe on empty input — every caller can render the result unconditionally.
 */
export function buildMistakeAnalysis(rawRows) {
  const rows = (rawRows || []).map(normalizeRow).filter(Boolean)
  const seen = rows.filter((r) => r.status !== STATUS.UNSEEN)
  const lost = seen.filter((r) => r.status === STATUS.INCORRECT || r.status === STATUS.OMITTED)

  const kinds = { rushed: 0, concept: 0, steady: 0, skipped: 0 }
  for (const r of lost) {
    const k = classify(r)
    if (k) kinds[k] += 1
  }

  // Where the marks actually go. Grouped by skill, because that is the level a
  // student can revise; the domain rides along for context.
  const bySkill = new Map()
  for (const r of seen) {
    const key = r.skill || r.domain
    if (!key) continue
    const e = bySkill.get(key) || {
      skill: r.skill || r.domain,
      domain: r.domain,
      subject: r.subject,
      seen: 0, wrong: 0, skipped: 0, seconds: 0, timed: 0,
    }
    e.seen += 1
    if (r.status === STATUS.INCORRECT) e.wrong += 1
    if (r.status === STATUS.OMITTED) e.skipped += 1
    if (r.seconds) { e.seconds += r.seconds; e.timed += 1 }
    bySkill.set(key, e)
  }

  const skills = [...bySkill.values()].map((e) => ({
    ...e,
    lost: e.wrong + e.skipped,
    accuracy: pct(e.seen - e.wrong - e.skipped, e.seen),
    avgSeconds: e.timed ? Math.round(e.seconds / e.timed) : null,
  }))

  // Worst first: most marks lost, then lowest accuracy as the tie-break, so a
  // skill missed 6 of 8 times outranks one missed 6 of 40.
  const weakest = [...skills]
    .filter((s) => s.lost > 0)
    .sort((a, b) => (b.lost - a.lost) || ((a.accuracy ?? 100) - (b.accuracy ?? 100)))

  const strongest = [...skills]
    .filter((s) => s.seen >= 3 && s.accuracy != null)
    .sort((a, b) => b.accuracy - a.accuracy || b.seen - a.seen)

  // Difficulty tells you whether the problem is reach or foundations.
  const byDifficulty = {}
  for (const d of ['Easy', 'Medium', 'Hard']) {
    const set = seen.filter((r) => r.difficulty === d)
    const wrong = set.filter((r) => r.status === STATUS.INCORRECT).length
    const skipped = set.filter((r) => r.status === STATUS.OMITTED).length
    byDifficulty[d] = {
      seen: set.length,
      wrong,
      skipped,
      accuracy: pct(set.length - wrong - skipped, set.length),
    }
  }

  return {
    totalSeen: seen.length,
    totalLost: lost.length,
    accuracy: pct(seen.length - lost.length, seen.length),
    kinds,
    skills,
    weakest,
    strongest,
    byDifficulty,
    headline: headlineFor({ kinds, byDifficulty, weakest, lostCount: lost.length }),
  }
}

// One sentence that names the single most useful thing to change.
function headlineFor({ kinds, byDifficulty, weakest, lostCount }) {
  if (!lostCount) return 'No mistakes yet — keep going to build a reliable picture.'

  const easy = byDifficulty.Easy
  if (easy?.seen >= 5 && easy.accuracy != null && easy.accuracy < 80) {
    return `Easy questions are only ${easy.accuracy}% right — fixing those is worth more than any hard-question practice.`
  }
  if (kinds.skipped >= Math.max(3, lostCount * 0.3)) {
    return `${kinds.skipped} questions were left blank. The SAT has no negative marking, so a guess is always better than nothing.`
  }
  if (kinds.rushed > kinds.concept && kinds.rushed >= 3) {
    return `Most losses are rushed slips, not gaps — the content is there, the first read is not.`
  }
  if (kinds.concept >= 3 && weakest[0]) {
    return `Time is being spent and still lost on ${weakest[0].skill} — re-learn it before drilling more of it.`
  }
  if (weakest[0]) {
    return `${weakest[0].skill} is costing the most marks right now.`
  }
  return 'Mistakes are spread thin — keep practising and the pattern will show.'
}

export function shortDomain(domain) {
  return DOMAIN_SHORT[domain] || domain
}
