# Stripe Integration

## Keys and Secrets

- Config keys (backend): `Stripe:SecretKey`, `Stripe:PublishableKey`, `Stripe:WebhookSecret`
- Store production secrets securely (environment variables, secret manager, or vault). Do not commit real values.
- `appsettings.json` may include test placeholders; override in production.

## Checkout Sessions

- Create session: `POST /api/checkout/create-session` (auth)
- Metadata includes `courseId`, `userId`, `scheduleId` (`DsatPsatLmsApi/Services/AllServices.cs:469-485`)
- Success/Cancel URLs must include `{CHECKOUT_SESSION_ID}` placeholder

## Confirmation & Cancellation

- Confirm session: verifies Stripe payment status and records `Payment` (`DsatPsatLmsApi/Services/AllServices.cs:596-684`)
- Cancel session: records cancellation; supports dev mock path when `SecretKey` absent (`DsatPsatLmsApi/Services/AllServices.cs:499-584`)

## Webhooks

- Endpoint: `POST /api/webhooks/stripe` (`DsatPsatLmsApi/Controllers/WebhookController.cs:17-21`)
- Signature verification: `Stripe-Signature` header vs `Stripe:WebhookSecret` (`DsatPsatLmsApi/Services/AllServices.cs:719-723`)
- Events handled:
  - `checkout.session.completed` → enrollment + succeeded payment (`DsatPsatLmsApi/Services/AllServices.cs:726-778`)
  - `checkout.session.expired` → cancelled payment (`DsatPsatLmsApi/Services/AllServices.cs:780-808`)
  - `checkout.session.async_payment_failed` → failed payment (`DsatPsatLmsApi/Services/AllServices.cs:809-838`)
  - `payment_intent.payment_failed` / `payment_intent.canceled` → create failed/cancelled records when metadata present (`DsatPsatLmsApi/Services/AllServices.cs:843-918`)

## Receipts

- Retrieves receipt URL via `ChargeService` when available (`DsatPsatLmsApi/Services/AllServices.cs:654-667`, `DsatPsatLmsApi/Services/AllServices.cs:755-766`)

## Frontend Setup

- Use `VITE_API_BASE_URL` for REST calls and `VITE_API_URL` for SignalR hub
- Success and cancel pages implemented in `CheckoutStatus.jsx` (`dsat-psat-lms-frontend-student/src/pages/Dashboard/CheckoutStatus.jsx:12-47`)
