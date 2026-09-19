// Single source of truth for "is this class joinable right now?".
//
// Both the student UI and the LiveKit token route import this, so the button a
// student sees and the permission the server grants can never disagree.
//
// A meeting is JOINABLE from `EARLY_MINUTES` before its start until
// `GRACE_MINUTES` after its scheduled end — and always while a host has it
// explicitly live. Meetings with no usable date stay joinable (legacy rows the
// admin form allowed to be saved with an empty date).

export const EARLY_MINUTES = 15   // students may enter this long before start
export const GRACE_MINUTES = 30   // classes regularly overrun; keep the door open

// Meeting types the product supports. Each carries its own defaults so an admin
// picking "Doubt Session" gets sensible duration/behaviour without extra work.
export const MEETING_TYPES = {
  'live-class': {
    label: 'Live Class', short: 'Class', icon: '🎓', tone: 'indigo',
    defaultDuration: 90,
    // In a batch class students listen by default and raise a hand to speak.
    studentsPublishByDefault: false,
    description: 'Scheduled batch session for the whole course.',
  },
  'doubt-session': {
    label: 'Doubt Session', short: 'Doubts', icon: '❓', tone: 'amber',
    defaultDuration: 45,
    studentsPublishByDefault: true,
    description: 'Open Q&A — students can unmute and ask.',
  },
  'one-on-one': {
    label: '1-on-1 Tutoring', short: '1-on-1', icon: '👤', tone: 'green',
    defaultDuration: 60,
    studentsPublishByDefault: true,
    description: 'Private session with a single student.',
  },
  'exam-review': {
    label: 'Exam Review', short: 'Review', icon: '📝', tone: 'violet',
    defaultDuration: 60,
    studentsPublishByDefault: false,
    description: 'Walk through a mock test or practice paper.',
  },
  'workshop': {
    label: 'Workshop', short: 'Workshop', icon: '⚡', tone: 'blue',
    defaultDuration: 120,
    studentsPublishByDefault: false,
    description: 'Strategy or bootcamp session.',
  },
}

export const DEFAULT_TYPE = 'live-class'

export function meetingType(meeting) {
  const t = meeting?.type
  return MEETING_TYPES[t] ? t : DEFAULT_TYPE
}

export function typeInfo(meeting) {
  return MEETING_TYPES[meetingType(meeting)]
}

// The room a meeting uses. `roomName` is canonical; `link` is the legacy field
// that historically held either a room name or an external URL.
export function meetingRoom(meeting) {
  const r = (meeting?.roomName || '').trim()
  if (r) return r
  const l = (meeting?.link || '').trim()
  return isExternalLink(l) ? '' : l
}

export function isExternalLink(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

// Scheduled start as a real Date, or null when the row has no usable date.
// `scheduledAt` is a true instant; `date` is the legacy datetime-local string
// (no timezone) kept for rows saved before the upgrade.
export function meetingStart(meeting) {
  if (!meeting) return null
  if (meeting.scheduledAt) {
    const d = new Date(meeting.scheduledAt)
    if (!isNaN(d.getTime())) return d
  }
  const raw = meeting.date
  if (raw) {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export function meetingDuration(meeting) {
  const n = Number(meeting?.durationMinutes)
  if (Number.isFinite(n) && n > 0) return n
  return typeInfo(meeting).defaultDuration
}

/**
 * Full joinability state for one meeting.
 * @returns {{state:'live'|'upcoming'|'ended'|'cancelled'|'undated',
 *            canJoin:boolean, start:Date|null, end:Date|null,
 *            minutesUntil:number|null, label:string}}
 */
export function meetingState(meeting, now = new Date()) {
  const status = meeting?.status
  if (status === 'cancelled') {
    return { state: 'cancelled', canJoin: false, start: meetingStart(meeting), end: null, minutesUntil: null, label: 'Cancelled' }
  }

  const start = meetingStart(meeting)
  const durationMin = meetingDuration(meeting)

  // A host who has explicitly started the session keeps it open regardless of
  // the clock — classes slip, and the room being live is the truth.
  if (status === 'live') {
    return { state: 'live', canJoin: true, start, end: null, minutesUntil: 0, label: 'Live now' }
  }
  if (status === 'ended') {
    return { state: 'ended', canJoin: false, start, end: null, minutesUntil: null, label: 'Ended' }
  }

  // No usable date (legacy rows): treat as an open room rather than burying it
  // in "Past" with a dead button, which is what the old code did.
  if (!start) {
    return { state: 'undated', canJoin: true, start: null, end: null, minutesUntil: null, label: 'Open room' }
  }

  const end = new Date(start.getTime() + durationMin * 60000)
  const opensAt = new Date(start.getTime() - EARLY_MINUTES * 60000)
  const closesAt = new Date(end.getTime() + GRACE_MINUTES * 60000)
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60000)

  if (now >= opensAt && now <= closesAt) {
    return { state: 'live', canJoin: true, start, end, minutesUntil, label: minutesUntil > 0 ? `Starts in ${minutesUntil} min` : 'Live now' }
  }
  if (now < opensAt) {
    return { state: 'upcoming', canJoin: false, start, end, minutesUntil, label: formatCountdown(minutesUntil) }
  }
  return { state: 'ended', canJoin: false, start, end, minutesUntil, label: 'Ended' }
}

export function formatCountdown(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return ''
  if (minutes < 60) return `Starts in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Starts in ${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `Starts in ${days} day${days === 1 ? '' : 's'}`
}

// Convenience used by both the student list and the server guard.
export function canJoinMeeting(meeting, now = new Date()) {
  return meetingState(meeting, now).canJoin
}
