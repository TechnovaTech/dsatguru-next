# Migration Summary (Next.js + Node + Mongo)

## New Architecture

- Frontend: Next.js app in `web/` using Axios for API calls and client-side auth token storage.
- Backend: Node/Express API in `server/` using MongoDB via Mongoose, JWT for auth, Stripe for payments.

## Feature Parity (Implemented)

- Authentication: register, login, logout, profile.
- Enrollment: list enrolled courses, check enrollment.
- Payments: create payment, get payment, list my payments.
- Checkout: Stripe checkout session create/confirm/cancel.
- Webhooks: Stripe `checkout.session.completed` handler.
- Practice: options, start session, answer, submit.
- Test Session: start, save-progress, submit, get session, history, adaptive routing, IRT placeholder.

## Endpoints

- Base URL: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:5000`).
- Routes mirror previous paths (e.g., `/api/auth/*`, `/api/enrollment/*`, `/api/payment/*`, `/api/checkout/*`, `/api/practice/*`, `/api/test-session/*`, `/api/webhooks/stripe`).

## Environment

- Server (`server/.env` suggested):
  - `MONGO_URI=mongodb://localhost:27017/dsat_psat_lms`
  - `JWT_SECRET=change-me`
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
- Frontend (`web/.env.local`):
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`

## Run Locally

- API:
  - `cd server && npm install && npm run dev`
- Web:
  - `cd web && npm install && npm run dev`

## Notes

- Admin endpoints for course/content management can be ported next using the same patterns.
- Stripe dev mode uses mock session when secret is not set; set real keys to enable full flow.
