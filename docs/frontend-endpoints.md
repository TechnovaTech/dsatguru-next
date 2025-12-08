# Frontend Endpoints Mapping

This document maps the student frontend calls to backend endpoints and configuration.

## Configuration

- Base URL: `VITE_API_BASE_URL` (`dsat-psat-lms-frontend-student/.env:1`)
- API client: Axios instance with interceptors (`dsat-psat-lms-frontend-student/src/services/api/index.js:6-13,15-43`)

## Auth

- Login → `POST /api/auth/login` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:17-24`)
- Signup → `POST /api/auth/register` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:36-43`)
- Forgot → `POST /api/auth/forgot-password` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:54-61`)
- Reset → `POST /api/auth/reset-password` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:72-79`)
- Logout → `POST /api/auth/logout` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:90-93`)
- Profile → `GET /api/user/me` (`dsat-psat-lms-frontend-student/src/services/api/auth/index.js:102-106`)

## Courses & Enrollment

- Admin list with schedule → `GET /api/admin/course/with-schedule` (`dsat-psat-lms-frontend-student/src/services/api/courses/index.js:18-23`)
- Create checkout session → `POST /api/checkout/create-session` (`dsat-psat-lms-frontend-student/src/services/api/courses/index.js:33-47`)
- Enrolled courses → `GET /api/enrollment` (`dsat-psat-lms-frontend-student/src/services/api/courses/index.js:60-66`)
- Check enrollment → `GET /api/enrollment/check/{courseId}` (`dsat-psat-lms-frontend-student/src/services/api/courses/index.js:76-82`)

## Payments

- My payments → `GET /api/payment/mine` (`dsat-psat-lms-frontend-student/src/services/api/payments/index.js:14-17`)

## Checkout Status Pages

- Success / Cancel handlers post to confirm/cancel endpoints (`dsat-psat-lms-frontend-student/src/pages/Dashboard/CheckoutStatus.jsx:21-47`)

## SignalR (Live Class)

- Hub URL: `${VITE_API_URL}/hubs/liveclass` (`dsat-psat-lms-frontend-student/src/hooks/useSignalR.js:133-135`)
- Auth token passed via `accessTokenFactory` (`dsat-psat-lms-frontend-student/src/hooks/useSignalR.js:16-21`)
