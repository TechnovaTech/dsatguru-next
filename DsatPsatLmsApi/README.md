# DSAT/PSAT LMS API - ASP.NET Core

Complete conversion of the NestJS backend to ASP.NET Core Web API.

## Features
- JWT Authentication with role-based authorization
- Entity Framework Core with PostgreSQL
- Swagger/OpenAPI documentation
- All original endpoints converted
- CORS configured for dsatguru.com

## Models
- User, Course, CourseHighlight, CourseSchedule, CourseFAQ, CourseEnrollment
- Service, ServicePackage, ServiceHighlight
- Payment, ContactMessage, ZoomSession
- AccessToken, PasswordResetToken, StaticPage

## Controllers
- AuthController - Authentication endpoints
- CourseController - Course management
- ServiceController - Service management
- ContactMessageController - Contact form handling
- PaymentController - Payment processing
- EnrollmentController - Course enrollments
- ZoomSessionController - Zoom session management
- WebhookController - Stripe webhooks

## Setup
1. Update connection string in appsettings.json
2. Run `dotnet restore`
3. Run `dotnet ef migrations add InitialCreate`
4. Run `dotnet ef database update`
5. Run `dotnet run`

## Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/admin/course/with-schedule
- POST /api/admin/course
- POST /api/contact-message
- POST /api/checkout/create-session
- POST /api/webhooks/stripe

API available at https://localhost:5001 with Swagger at /swagger