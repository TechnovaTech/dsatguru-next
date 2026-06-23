// Shared logic for the "Reattempt" button shown on exam list pages.
//
// A reattempt is offered only when a test was auto-submitted (a violation), the
// session isn't a reassignment, and it's still the first auto-submit (attempt < 2) —
// the same rule the results page uses.
export const canReattempt = (s) =>
  !!s && !s.isReassigned && (s.autoSubmitted || s.autoSubmitReason) && (s.attemptCount || 1) < 2

// Reset the session server-side, then return the URL to re-enter the test.
// Throws on failure so the caller can surface a toast.
export async function reattemptSession(session, { returnUrl = '/dashboard', moduleTest = false } = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`/api/test-sessions/${session._id}/reattempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new Error('reattempt failed')
  const page = moduleTest ? 'module-start' : 'start'
  return `/dashboard/tests/${session.testId?._id}/${page}?sessionId=${session._id}&returnUrl=${encodeURIComponent(returnUrl)}`
}
