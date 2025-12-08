# Configuration

## Backend (`DsatPsatLmsApi`)

- App settings: `DsatPsatLmsApi/appsettings.json`
  - `AllowedOrigins` controls CORS (`DsatPsatLmsApi/appsettings.json:9-16`)
  - `ConnectionStrings:DefaultConnection` (`DsatPsatLmsApi/appsettings.json:17-19`)
  - `Jwt` issuer/audience/key (`DsatPsatLmsApi/appsettings.json:20-24`)
  - `Stripe` keys (test placeholders) (`DsatPsatLmsApi/appsettings.json:25-29`)
- Production overrides: `DsatPsatLmsApi/appsettings.Production.json`
  - CORS and connection string (`DsatPsatLmsApi/appsettings.Production.json:9-15`)
  - JWT keys (`DsatPsatLmsApi/appsettings.Production.json:16-20`)
  - Stripe keys (`DsatPsatLmsApi/appsettings.Production.json:21-25`)

## Frontend (`dsat-psat-lms-frontend-student`)

- `.env` example:
  - `VITE_API_BASE_URL` — REST API base (`dsat-psat-lms-frontend-student/.env:1`)
  - `VITE_API_URL` — SignalR hub base (`dsat-psat-lms-frontend-student/src/hooks/useSignalR.js:133-135`)
  - `VITE_SECRET_KEY` — local secret key for client-side helpers
  - `VITE_RECAPTCHA_SITE_KEY` — optional captcha key

## Security Notes

- Do not commit real production secrets.
- Use environment variables or secret stores (Azure Key Vault, AWS Secrets Manager, etc.).
- Ensure webhook secrets are configured on Stripe and match `Stripe:WebhookSecret`.

## New Stack (Next.js + Node/Express + Mongo)

- Server env variables:
  - `MONGO_URI` — MongoDB connection string (e.g., `mongodb://localhost:27017/dsat_psat_lms`)
  - `JWT_SECRET` — JWT signing secret
  - `STRIPE_SECRET_KEY` — Stripe secret key
  - `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
  - `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- Frontend env variables:
  - `NEXT_PUBLIC_API_BASE_URL` — base URL for the server API (e.g., `http://localhost:5000`)
