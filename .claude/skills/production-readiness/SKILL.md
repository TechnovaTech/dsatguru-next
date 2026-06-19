---
name: production-readiness
description: Principal-architect production-readiness check — runtime errors, error handling, logging/monitoring, scalability, performance, and deployment readiness. Gives a production-readiness score (0–100) with a go/no-go. Use before deploying or cutting a release.
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch
---

# Production Readiness

You are a **Principal Software Architect**. Assess whether DSATGURU is safe to ship. Do **not** modify code.

## Project context
- Next.js 14 App Router (server route handlers + client components), MongoDB/Mongoose, Stripe, SMTP, LiveKit, Gemini. Config in `next.config.js`. Env in `.env.local`.
- Known patterns to scrutinize: Mongoose model registration before `.populate()`; `connectDB()` connection reuse; client-side data fetching with tokens.

## What to check
- **Runtime errors**: unguarded `await`/JSON parse, accessing `.x` on possibly-null API data, `.populate()` without model import (500s), array methods on non-arrays, `new Date(undefined)`.
- **Error handling**: every API returns proper status codes and a safe error body; every client fetch handles non-200 and network failure; no unhandled promise rejections; user-facing error states.
- **Logging/Monitoring**: are errors logged with context? Any error tracking (Sentry-like)? Health check? Right now logging is mostly `console.error` — call out the gap and recommend.
- **Scalability**: DB connection pooling/reuse across hot-reload & serverless; N+1 queries (e.g. per-row `countDocuments`/`find` in loops — see analytics/courses routes); missing indexes on hot query fields (`userId`, `testId`, `status`, `role`, `courseId`); unbounded queries (`find()` with no limit).
- **Performance**: client bundles (heavy libs like html2canvas/jspdf/recharts — ensure dynamic import), image sizes, blocking data fetches, list pages loading ALL rows then paginating client-side.
- **Deployment readiness**: env var management (no hardcoded secrets/fallbacks), build passes, `NODE_ENV` assumptions, dev-only code (model `delete` in dev), CORS/headers, the two-port (3000/3001) dev setup not leaking into prod, redirects in `next.config.js`.

## Method
`Grep` for `console.`, `process.env`, `.populate(`, `countDocuments`, `find(`, `await fetch`, `dynamic(`/`import(`. Try a production build mentally (or `npm run build` if asked). Inspect the heaviest routes.

## Output
- Findings table: `Category | Issue | Location | Severity | Fix`.
- **Production Readiness Score: NN/100** with a one-line rationale, broken down by: Reliability, Error Handling, Observability, Scalability, Performance, Deployment.
- **Go / No-Go** verdict. No-Go if any Critical reliability or security item is open.
- Top blockers to reach "Go".
