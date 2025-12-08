# Controllers and Routes

Below is a consolidated list of controllers and their base routes. Where available, key actions are referenced with source locations.

## Auth

- Base: `/api/auth` (`DsatPsatLmsApi/Controllers/AuthController.cs:10-11`)
- POST `/register` (`DsatPsatLmsApi/Controllers/AuthController.cs:20`)
- POST `/login` (`DsatPsatLmsApi/Controllers/AuthController.cs:34`)
- POST `/logout` (auth) (`DsatPsatLmsApi/Controllers/AuthController.cs:54-56`)
- POST `/forgot-password` (`DsatPsatLmsApi/Controllers/AuthController.cs:65`)
- POST `/reset-password` (`DsatPsatLmsApi/Controllers/AuthController.cs:79`)

## User

- Base: `/api/user` (`DsatPsatLmsApi/Controllers/UserController.cs:10-11`)
- GET `/me` (auth) (`DsatPsatLmsApi/Controllers/UserController.cs:20-22`)

## Checkout & Payments

- Base: `/api/checkout` (`DsatPsatLmsApi/Controllers/CheckoutController.cs:10-11`)
  - POST `/create-session` (auth) (`DsatPsatLmsApi/Controllers/CheckoutController.cs:20-22`)
  - POST `/confirm-session` (auth) (`DsatPsatLmsApi/Controllers/CheckoutController.cs:62-64`)
  - POST `/cancel-session` (auth) (`DsatPsatLmsApi/Controllers/CheckoutController.cs:90-92`)
- Base: `/api/payment` (`DsatPsatLmsApi/Controllers/PaymentController.cs:12-13`)
  - POST `/` (auth) (`DsatPsatLmsApi/Controllers/PaymentController.cs:24-26`)
  - GET `/{id}` (auth) (`DsatPsatLmsApi/Controllers/PaymentController.cs:34-36`)
  - GET `/mine` (auth) (`DsatPsatLmsApi/Controllers/PaymentController.cs:42-44`)
- Admin: `/api/admin/payments` GET (`DsatPsatLmsApi/Controllers/PaymentsController.cs:10-12`, `DsatPsatLmsApi/Controllers/PaymentsController.cs:21`)
- Webhooks: `/api/webhooks/stripe` (`DsatPsatLmsApi/Controllers/WebhookController.cs:7,17-21`)

## Enrollment

- Base: `/api/enrollment` (auth) (`DsatPsatLmsApi/Controllers/EnrollmentController.cs:10-12`)
  - GET `/` (`DsatPsatLmsApi/Controllers/EnrollmentController.cs:21`)
  - GET `/check/{courseId}` (`DsatPsatLmsApi/Controllers/EnrollmentController.cs:51`)

## Questions (Admin)

- Base: `/api/questions` (admin) (`DsatPsatLmsApi/Controllers/QuestionController.cs:16-18`)
  - GET `/question-banks` (`DsatPsatLmsApi/Controllers/QuestionController.cs:30`)
  - GET `/` (`DsatPsatLmsApi/Controllers/QuestionController.cs:77`)
  - POST `/` (`DsatPsatLmsApi/Controllers/QuestionController.cs:134`)
  - PUT `/{id}` (`DsatPsatLmsApi/Controllers/QuestionController.cs:196`)
  - GET `/{id}` (`DsatPsatLmsApi/Controllers/QuestionController.cs:231`)
  - GET `/by-bank/{questionBankId}` (`DsatPsatLmsApi/Controllers/QuestionController.cs:303`)
  - DELETE `/{id}` (`DsatPsatLmsApi/Controllers/QuestionController.cs:426`)
  - GET `/statistics` (`DsatPsatLmsApi/Controllers/QuestionController.cs:445`)
  - POST `/bulk-upload` (`DsatPsatLmsApi/Controllers/QuestionController.cs:560-562`)

## Questions (Student)

- Base: `/api/student/questions` (auth) (`DsatPsatLmsApi/Controllers/StudentQuestionsController.cs:11-13`)
  - See backend.md for list of actions and references

## Practice

- Base: `/api/practice` (auth) (`DsatPsatLmsApi/Controllers/PracticeController.cs:11-14`)
  - GET `/options` (`DsatPsatLmsApi/Controllers/PracticeController.cs:27`)
  - POST `/start` (`DsatPsatLmsApi/Controllers/PracticeController.cs:134-135`)
  - POST `/answer` (`DsatPsatLmsApi/Controllers/PracticeController.cs:289-290`)
  - POST `/submit` (`DsatPsatLmsApi/Controllers/PracticeController.cs:355`)
  - GET `/history` (`DsatPsatLmsApi/Controllers/PracticeController.cs:410`)
  - GET `/performance` (`DsatPsatLmsApi/Controllers/PracticeController.cs:471`)

## Test Sessions

- Base: `/api/test-session` (auth) (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:11-14`)
  - POST `/start` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:31`)
  - POST `/save-progress` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:109`)
  - POST `/submit` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:146`)
  - GET `/{sessionId}` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:204`)
  - GET `/history` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:247`)
  - POST `/adaptive-routing` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:279`)
  - POST `/calculate-irt` (`DsatPsatLmsApi/Controllers/StudentTestSessionController.cs:300`)

## Admin & Content (selection)

- Courses (admin): `/api/admin/course` (`DsatPsatLmsApi/Controllers/CourseController.cs:12-13`)
- Course highlights: `/api/admin/course-highlights` (`DsatPsatLmsApi/Controllers/CourseHighlightController.cs:9-10`)
- Course schedules: `/api/admin/course-schedules` (`DsatPsatLmsApi/Controllers/CourseHighlightController.cs:38-39`)
- Course FAQs: `/api/admin/course-faqs` (`DsatPsatLmsApi/Controllers/CourseHighlightController.cs:67-68`)
- Services (admin): `/api/admin/service` (`DsatPsatLmsApi/Controllers/ServiceController.cs:9-10`)
- Service packages: `/api/admin/service-packages` (`DsatPsatLmsApi/Controllers/ServiceController.cs:60-61`)
- Service highlights: `/api/admin/service-highlights` (`DsatPsatLmsApi/Controllers/ServiceController.cs:88-89`)
- Course content: `/api/coursecontent` (`DsatPsatLmsApi/Controllers/CourseContentController.cs:11-12`)
- Announcements: `/api/announcement` (`DsatPsatLmsApi/Controllers/AnnouncementController.cs:10-12`)
- Calendar: `/api/calendar` (`DsatPsatLmsApi/Controllers/CalendarController.cs:10-12`)
- Analytics: `/api/analytics` (`DsatPsatLmsApi/Controllers/AnalyticsController.cs:10-12`)
- Admin config: `/api/admin/config` (`DsatPsatLmsApi/Controllers/AdminConfigController.cs:11-13`)

## Real-time

- SignalR hub: `/hubs/liveclass` (`DsatPsatLmsApi/Program.cs:141`)
