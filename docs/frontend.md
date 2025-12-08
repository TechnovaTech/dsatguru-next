# Frontend (dsat-psat-lms-frontend-student)

## Overview

- Framework: React + Vite
- API client: Axios with interceptors (`dsat-psat-lms-frontend-student/src/services/api/index.js:15-43`)
- Auth state: `AuthContext` (`dsat-psat-lms-frontend-student/src/context/AuthContext.jsx:9-56`)
- Routing: `routes/AppRoutes.jsx`

## Environment Variables

- `VITE_API_BASE_URL` base URL for REST (`dsat-psat-lms-frontend-student/.env:1`)
- `VITE_API_URL` base URL for SignalR hub (`dsat-psat-lms-frontend-student/src/hooks/useSignalR.js:133-135`)
- `VITE_SECRET_KEY` local encryption helper
- `VITE_RECAPTCHA_SITE_KEY` optional captcha site key

## API Services

Auth (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js`)

- `POST /api/auth/login` → stores `authToken` and user
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`
- `GET /api/user/me`

Courses & Enrollment (`dsat-psat-lms-frontend-student/src/services/api/courses/index.js`)

- `GET /api/admin/course/with-schedule`
- `POST /api/checkout/create-session` → returns `sessionId` and `sessionUrl`
- `GET /api/enrollment` → list enrolled
- `GET /api/enrollment/check/{courseId}` → boolean

Payments (`dsat-psat-lms-frontend-student/src/services/api/payments/index.js`)

- `GET /api/payment/mine` → user payments

Questions & Practice

- Student, Practice, Test routes as documented in backend; UI pages under `src/pages/Dashboard/*`

## Interceptors and Auth

- Request: includes `Authorization: Bearer <token>` if present (`dsat-psat-lms-frontend-student/src/services/api/index.js:16-23`)
- Response: on `401`, clears storage and navigates to `/login` (`dsat-psat-lms-frontend-student/src/services/api/index.js:35-41`)

## Checkout Flow (UI)

- Create session via `createCheckoutSession(courseId, scheduleId, returnTo)`
- Redirect to Stripe session URL (or mock URL in dev)
- Success page posts to `/api/checkout/confirm-session` (`dsat-psat-lms-frontend-student/src/pages/Dashboard/CheckoutStatus.jsx:21-27`)
- Cancel page posts to `/api/checkout/cancel-session` (`dsat-psat-lms-frontend-student/src/pages/Dashboard/CheckoutStatus.jsx:39-45`)

## SignalR Live Class

- Hook: `useLiveClassSignalR` (`dsat-psat-lms-frontend-student/src/hooks/useSignalR.js:133-135`)
- Hub URL: `${VITE_API_URL}/hubs/liveclass`
