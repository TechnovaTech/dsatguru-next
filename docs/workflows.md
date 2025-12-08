# Workflows

## Authentication

- Register → Login → `authToken` stored → `GET /api/user/me`
- Logout revokes token (`DsatPsatLmsApi/Controllers/AuthController.cs:54-63`)

## Enrollment + Payment (Stripe)

- Start: UI calls `POST /api/checkout/create-session` with `courseId`, optional `scheduleId`, and `successUrl`/`cancelUrl` placeholders (`DsatPsatLmsApi/Controllers/CheckoutController.cs:20-38`)
- Dev fallback: if `Stripe:SecretKey` missing, returns mock `sessionId` and direct `successUrl` (`DsatPsatLmsApi/Services/AllServices.cs:415-425`)
- Success handling: UI posts `POST /api/checkout/confirm-session` with `sessionId` (`DsatPsatLmsApi/Controllers/CheckoutController.cs:62-71`)
  - Server verifies payment status with Stripe, creates enrollment, records `Payment` (`DsatPsatLmsApi/Services/AllServices.cs:596-684`)
- Cancel handling: UI posts `POST /api/checkout/cancel-session` (`DsatPsatLmsApi/Controllers/CheckoutController.cs:90-99`)
  - Server records cancellation; dev mode writes mock payment (`DsatPsatLmsApi/Services/AllServices.cs:499-584`)
- Webhooks: Stripe posts to `/api/webhooks/stripe`; signature verified; enrollment+payment recorded for `checkout.session.completed`, cancellation/failed handled (`DsatPsatLmsApi/Services/AllServices.cs:709-918`, `DsatPsatLmsApi/Controllers/WebhookController.cs:17-22`)

## Practice Sessions

- Options: `GET /api/practice/options` → subjects, counts (`DsatPsatLmsApi/Controllers/PracticeController.cs:27-123`)
- Start: `POST /api/practice/start` → creates `PracticeSession` and first question (`DsatPsatLmsApi/Controllers/PracticeController.cs:134-279`)
- Answer: `POST /api/practice/answer` → saves answer, returns next (`DsatPsatLmsApi/Controllers/PracticeController.cs:289-345`)
- Submit: `POST /api/practice/submit` → final results (`DsatPsatLmsApi/Controllers/PracticeController.cs:355-400`)
- History/Performance: `GET /api/practice/history`, `GET /api/practice/performance` (`DsatPsatLmsApi/Controllers/PracticeController.cs:410-466`, `DsatPsatLmsApi/Controllers/PracticeController.cs:471-523`)

## Test Sessions

- Start: `POST /api/test-session/start` → create `TestSession` and questions (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:31-100`)
- Save progress: `POST /api/test-session/save-progress` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:109-138`)
- Submit: `POST /api/test-session/submit` → scoring + IRT + routing (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:146-201`)
- Get session: `GET /api/test-session/{sessionId}` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:204-239`)
- History: `GET /api/test-session/history` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:247-271`)
- Adaptive routing: `POST /api/test-session/adaptive-routing` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:279-298`)

## Live Class (SignalR)

- Hub: `/hubs/liveclass` (`DsatPsatLmsApi/Program.cs:141`)
- Frontend connects with JWT via query param (`DsatPsatLmsApi/Program.cs:30-45`)
