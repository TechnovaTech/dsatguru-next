# DSATGURU — Full Production Audit (Re-Audit #6)

_After fixing the 4 Criticals + Highs from pass #5, a clean `next build`, and a runtime smoke test. Run live against http://localhost:3000. Seven specialists merged._

---

## 1. Executive Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 2 |
| 🟠 High | 10 |
| 🟡 Medium | ~14 |
| ⚪ Low | ~14 |

**Health statement.** The fixes landed and verified. **All four pass-#5 Criticals are CLOSED — the security auditor live-confirmed each** (`/api/enrollment` now returns 402 for unpaid paid courses; both messaging IDORs are membership-scoped; test-session POST is allow-listed; PUT never persists client scores; announcements imports User). Security found **zero new Critical/High**. Production-readiness is **84/100 (CONDITIONAL GO)** — no open Critical in the reliability/infra scope; the build is clean, `/api/health` is 200, and the new shared helpers (`lib/learningLoop.js`, `lib/adaptive.js`) are sound. The previously half-wired features are now genuinely end-to-end (student announcements page, learning-loop ErrorLog auto-populate, registration-toggle enforcement, study-plan generator). **The deeper pass did surface 2 new Criticals — both in code I changed**: an adaptive-routing units mismatch for admin-UI-created tests, and a study-plan data-integrity bleed from making one model serve two purposes. Plus a short list of Highs (one pre-existing RBAC bug, a redo-dedup drift, and UX/a11y debt in the *older* admin components that earlier passes never reached).

---

## 2. 🔴 Critical Issues

| # | Title | Area | Location | Why critical | Fix | Flagged by |
|---|---|---|---|---|---|---|
| C1 | Adaptive `customConfig` units mismatch — admin-UI adaptive tests route wrong & over-fill Module 2 | DSAT / Adaptive | `lib/adaptive.js:5-15,64-72` vs `app/components/admin/TestManagement.js:17-39` | `buildAdaptiveModule` expects routing bands as **percent (0–100)** and distribution as **counts** (the convention `app/api/tests/generate` writes). But the admin TestManagement UI saves routing as **raw question counts** and distribution as **percentages summing to 100**. So a real accuracy % matches no band → legacy fallback → distribution percentages used as raw counts → Module 2 can pull ~100 questions instead of ~22–27, with wrong difficulty. (Standard `/api/tests/generate` and non-customConfig tests are unaffected.) | Standardize one convention: make TestManagement store routing as % + distribution as counts (mirror `tests/generate`), or normalize/convert inside `buildAdaptiveModule`. Validate distribution ≤ module size on save. | DSAT |
| C2 | Study-plan template vs per-student bleed — admin can edit/delete students' personal plans (data loss) | Data integrity (my regression) | `app/api/admin/study-plans/route.js:34` (`StudyPlan.find()` unfiltered); `StudyPlanManagement.js:128-164` | Making `StudyPlan` dual-purpose (admin templates + per-student planners in one collection) means the admin list (`find()` no filter) now shows per-student plans created by `/api/study-plan*` (rendered as blank-title cards), and admin Edit/Delete act on them by `_id` — an admin can overwrite/delete a student's personal study plan. | Add a `kind: 'template'|'student'` discriminator (or filter admin queries to `{ userId: { $exists: false } }`) on the GET **and** the `[id]` PUT/DELETE so the catalog only touches templates. | QA |

---

## 3. 🟠 High Priority Issues

| # | Title | Area | Location | Fix | Flagged by |
|---|---|---|---|---|---|
| H1 | `unlock-approve` RBAC: lowercase dead literals + omits TutorAdmin | Authorization | `app/api/test-sessions/[id]/unlock-approve/route.js:12` | `['admin','tutor','Admin','Tutor']` → `STAFF_ROLES.includes(decoded.role)` (TutorAdmin is wrongly 403'd). | Code |
| H2 | `import-from-test` is a live twin of `syncWrongAnswers` with a weaker idempotency key → duplicate redo rows | Learning loop / drift | `app/api/error-log/import-from-test/route.js:18-74` vs `lib/learningLoop.js:28-33` | Make the route call the shared helper; reconcile dedup key (per-session vs per-question); dedupe redo-queue `mode=all` by question. | Code, QA |
| H3 | Per-question time hardcoded to 30s in the SAT runner → fabricated timing analytics | DSAT / Timing | `app/dashboard/sat-test/[id]/page.js:161` | Record a per-question start timestamp; send real elapsed seconds (capped). | DSAT |
| H4 | Student-analysis aggregation drops sessions w/o a Test and double-counts re-attempts | DSAT / Analytics | `app/api/admin/student-analysis/[id]/route.js:38-46,143` | `preserveNullAndEmptyArrays:true` on the test `$unwind`; key `sessionsMap` by session `_id`, not `testId`. | DSAT |
| H5 | Maintenance mode persisted but enforced nowhere | Deployment | `lib/models/Setting.js`; no `middleware.js` | Add an edge-safe gate (cached settings) that returns a maintenance page for non-admins; or remove the toggle. | Product, Production, QA |
| H6 | Older admin tables clip on mobile (no `overflow-x-auto`) | UI/UX | `ManageCourses.js:56`, `UserResultManagement.js:133` | Wrap in `overflow-x-auto` + `min-w-[...]`. | UI/UX |
| H7 | Fetch failures swallowed in older admin components (blank list, no retry) | UI/UX / Error states | `ManageCourses.js:18`, `QuestionBankManagement.js:140`, `TestManagement.js:47`, `UserManagement.js:33`, `StudentProgress.js:62` | Add error state + `role="alert"` retry (PaymentManager pattern). | UI/UX |
| H8 | Modals in older admin components lack Esc/backdrop close; labels/icon-buttons missing a11y names | UI/UX / a11y | `TestManagement.js`, `QuestionBankManagement.js`, `ManageCourses.js` | Add Esc/backdrop close + `htmlFor`/`id` + `aria-label` (StudyPlanManagement/Communication patterns). | UI/UX |
| H9 | No Stripe webhook → dropped post-payment redirect = paid-but-not-enrolled | Payments | (no `app/api/webhooks/stripe`) | Add a signed `checkout.session.completed` webhook (idempotent create already exists). | Production, Product |
| H10 | No error tracking (Sentry); logger adopted in only ~4/140 routes | Observability | repo-wide | Add `@sentry/nextjs`; migrate route catches to `logger`. | Production |

_(Mediums: Module-2 query ignores `session.subject` (cross-subject leak) `lib/adaptive.js:38`; demo-test grading not using `answersMatch` `demo-test/submit:42`; duplicate `/api/enroll` vs `/api/enrollment` routes; in-memory rate-limit per-instance/IP-spoofable; recharts static import; analytics `averageScore` skewed by single-section sessions; `study-plan/generate` unbounded `dailyPlan` days; messages `typing`/`upload` no membership check; admin design-system drift. Lows: announcements no unread badge; study-plan templates have no student delivery path; mid-test `answer` route echoes `isCorrect`; debug logs in QuestionBankManagement; `toClientQuestion` dead; client `fetchWithAuth` missing (209 token reads); god components (TestResultView 1948 lines); Windows-only build script.)_

---

## 4. Verified FIXED this round (live-confirmed)
`/api/enrollment` payment bypass (402), messaging DELETE + PATCH IDORs (membership-scoped), test-sessions POST allow-list + PUT no-client-scores, announcements `User` import, bounded result-dashboard queries (`.limit(500)`), analytics averages `totalScore`, adaptive routing single-sourced (`buildAdaptiveModule` used by both answer+submit), redo logic extracted to `lib/learningLoop.js`, result-route RBAC → `STAFF_ROLES`, Study-Plan create no longer 500s, registration toggle enforced, SystemSettings no longer misleading. Plus all earlier fixes still hold (register injection, `/api/test` removed, answer-key stripping, JWT HS256, secrets gitignored).

---

## 5. Production Readiness Verdict

**Score: 84/100** (↑ from 83). Reliability 16/18 · Error-Handling 14/17 · Observability 9/17 · Scalability 14/17 · Performance 14/16 · Deployment 11/15. The production-readiness specialist returns **CONDITIONAL GO** — safe for a single-instance (PM2) deploy; no open Critical in the reliability/security scope.

### ❌ NOT PRODUCTION READY (full-audit gate: zero Critical across all reviewers)
Two Criticals remain — **both in code touched this round**, both well-scoped:
1. **C1** — adaptive `customConfig` units mismatch (admin-UI adaptive tests route wrong).
2. **C2** — study-plan template/student bleed (admin can edit/delete student plans).

**Trajectory:** 36 → 59 → 64 → 80 → 83 → **84/100**, and the Critical count has gone from 10 → 7 → 1(+regressions) and is now **2 narrow, self-introduced issues** rather than the sprawling security/scoring holes of early passes. Security is clean, payments are verified, scoring/learning-loop work end-to-end. Clearing C1+C2 (hours) gets to zero-Critical; the rest are a documented post-launch backlog (Stripe webhook, Sentry, maintenance-mode gate, multi-instance rate-limit, admin-UI a11y/retheme). Standing **manual** task: rotate the `.env.local` secrets.
