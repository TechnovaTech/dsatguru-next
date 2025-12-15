# DSATGuru Next – Implementation Status

## Overview

- Stack: Next.js App Router 14, React 18, TailwindCSS, Mongoose 8, JWT auth, Stripe.
- Data models: `User`, `Course` (+ `CourseEnrollment`, `QuestionBankEnrollment`), `Question`, `Test`, `TestSession`, `Payment`.
- Structure: `app/` for UI and API routes, `lib/models` for schemas, `lib/auth` & `lib/db` for infra.

## Implemented Features

- Authentication
  - Login API issues JWT: `app/api/auth/login/route.js:7` (POST).
  - Login and register pages: `app/login/page.js:1`, `app/register/page.js:1`.
  - Protected APIs use token verification: examples in `app/api/user/profile/route.js:11`.

- Courses & Question Banks
  - Admin courses list with filters and analytics: `app/api/admin/courses/route.js:1` (GET).
  - Admin course update: `app/api/admin/courses/[id]/route.js:50` (PUT).
  - Admin course content update: `app/api/admin/courses/[id]/content/route.js:38` (PUT).
  - Question banks exposed via `Course` type `question_bank`: `app/api/questions/route.js:23` (GET `question-banks`).
  - Question bank CRUD (admin create): `app/api/admin/question-banks/route.js:23` (POST).

- Questions Management
  - Query with rich filters including `bankId`: `app/api/questions/route.js:52`–`app/api/questions/route.js:59`.
  - Admin read/update/toggle active: `app/api/admin/questions/[id]/route.js:5` (GET, PUT, PATCH).
  - Admin bulk upload via CSV: `app/api/admin/questions/bulk-upload/route.js:61` (POST).

- Tests Management (Admin)
  - Admin list/create tests: `app/api/admin/tests/route.js:6` (GET), `app/api/admin/tests/route.js:17` (POST).
  - Admin edit/delete/toggle status: `app/api/admin/tests/[id]/route.js:6` (PUT), `app/api/admin/tests/[id]/route.js:22` (DELETE), `app/api/admin/tests/[id]/toggle-status/route.js:6` (PATCH).
  - Admin UI shows associated question bank on cards: `app/components/admin/TestManagement.js:180`.

- Test Sessions
  - Create/fetch sessions for user: `app/api/test-sessions/route.js:7` (GET), `app/api/test-sessions/route.js:27` (POST).
  - POST binds `questionBankId` when `testId` is provided: `app/api/test-sessions/route.js:40`–`app/api/test-sessions/route.js:47`.
  - Admin extend/terminate session: `app/api/admin/test-sessions/[id]/extend/route.js:6`, `app/api/admin/test-sessions/[id]/terminate/route.js:6`.
  - Model alignment: `lib/models/TestSession.js:4` uses `ref: 'Course'` for `questionBankId`.

- Dashboard & Practice
  - Dashboard overview UI: `app/dashboard/page.js:32` loads enrollments, questions, sessions.
  - Question Banks page with Start Practice link: `app/dashboard/question-banks/page.js:116`.
  - Practice creation page reads `bankId` and starts a session: `app/dashboard/practice/create/page.js:10`, `app/dashboard/practice/create/page.js:65`.

- Analytics & Admin
  - Admin analytics summary: `app/api/admin/analytics/route.js:1` (GET).
  - Admin user management: list/update status/role: `app/api/admin/users/route.js:6`, `app/api/admin/users/[id]/status/route.js:6`, `app/api/admin/users/[id]/role/route.js:6`.

- Payments
  - Stripe libs present in `package.json:12`–`package.json:33` and payment model: `lib/models/Payment.js:1`.
  - Enrollment flow hooks exist in dashboard pages (client-side navigation and enroll): `app/dashboard/question-banks/page.js:59`–`app/dashboard/question-banks/page.js:71`.

## Partially Implemented or In Progress

- Practice creation UI uses static distributions; dynamic aggregation per `bankId` can be wired to `app/api/questions/route.js` for stats.
- Some pages use raw `<a>` tags and unescaped entities causing ESLint errors (see Lint section).
- No unified test suite present in repo; CI/testing scripts not defined in `package.json` beyond lint.

## Data Models

- `lib/models/User.js:1` – roles: Student, Tutor, Admin.
- `lib/models/Course.js:1` – course and question bank storage; includes enrollments.
- `lib/models/Question.js:1` – tagged options, `questionBankId` references `Course`.
- `lib/models/Test.js:1` – `questionBankId`, `sections`, `testType` metadata.
- `lib/models/TestSession.js:1` – session state, responses; `questionBankId` ref `Course`.
- `lib/models/Payment.js:1` – payment tracking tied to enrollments.

## Key UI Pages

- Dashboard: `app/dashboard/page.js:32`.
- Question Banks: `app/dashboard/question-banks/page.js:116` (Start Practice).
- Practice Create: `app/dashboard/practice/create/page.js:1`.
- Login/Register: `app/login/page.js:1`, `app/register/page.js:1`.
- Admin Test Management: `app/components/admin/TestManagement.js:263` (select bank).

## Lint Status

- Lint script: `package.json:9` (`next lint`).
- Known issues include `@next/next/no-html-link-for-pages`, `react/no-unescaped-entities`, and `react-hooks/exhaustive-deps` across several pages (e.g., `app/dashboard/practice/create/page.js:37`, `app/dashboard/page.js:30`).
- These are non-blocking for runtime but should be cleaned for production quality.

## Next Priorities

- Replace `<a>` with `next/link` where applicable and escape unescaped entities.
- Wire practice stats to live aggregates per `bankId` and subject.
- Add unit/integration tests for APIs (`auth`, `questions`, `test-sessions`, `admin`).
- Implement session answer submission and scoring endpoints if not already planned.

