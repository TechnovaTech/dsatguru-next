# Database Models

This section lists primary models and relationships. Relationship mappings are defined in `DsatPsatLmsApi/Data/AppDbContext.cs`.

## Users & Courses

- `User` — platform accounts; unique email (`DsatPsatLmsApi/Data/AppDbContext.cs:68-69`)
- `Course` — purchasable items; has `Highlights`, `Schedules`, `FAQs` (`DsatPsatLmsApi/Data/AppDbContext.cs:82-87`)
- `CourseEnrollment` — joins `User` ↔ `Course` (`DsatPsatLmsApi/Data/AppDbContext.cs:72-76`)

## Payments

- `Payment` — transaction records with gateway info; relations to `User` and `CourseEnrollment` (`DsatPsatLmsApi/Data/AppDbContext.cs:94-98`)
  - Fields reference: `DsatPsatLmsApi/Models/Course.cs:119-138` (includes `Amount`, `Currency`, `PaymentGateway`, `PaymentIntentId`, `Status`, `ReceiptUrl`, timestamps)
  - Status enum: `PaymentStatus` (`DsatPsatLmsApi/Models/Course.cs:140`)

## Services & Contact

- `Service`, `ServicePackage`, `ServiceHighlight` with unique `slug` (`DsatPsatLmsApi/Data/AppDbContext.cs:70,89-93`)
- `ContactMessage` — inquiries (`DsatPsatLmsApi/Models/Course.cs:154` plus related DTOs)

## Static Content & Sessions

- `StaticPage` — CMS pages (`DsatPsatLmsApi/Data/AppDbContext.cs:25-26`)
- `ZoomSession` — scheduled meetings linked to course/schedule (`DsatPsatLmsApi/Data/AppDbContext.cs:99-103`)
- `LiveClass`, `LiveClassAttendance` — live classes and attendance (`DsatPsatLmsApi/Data/AppDbContext.cs:109-114`)

## Questions & Banks

- `Question` — question content with options/tags (`DsatPsatLmsApi/Data/AppDbContext.cs:116-123`)
- `QuestionBank` — collections of questions (`DsatPsatLmsApi/Data/AppDbContext.cs:149-153`)
- `QuestionBankEnrollment` — user ↔ question bank (`DsatPsatLmsApi/Data/AppDbContext.cs:77-81`)
- `EnhancedQuestion`, `QuestionAttempt`, `QuestionRating` — authoring & analytics (`DsatPsatLmsApi/Data/AppDbContext.cs:136-147`)

## Testing

- `TestSession` — a test run (`DsatPsatLmsApi/Data/AppDbContext.cs:43-44,181-186`)
- `SessionQuestion` — content shown during test (`DsatPsatLmsApi/Data/AppDbContext.cs:44,185`)
- `TestResult` — final results (`DsatPsatLmsApi/Data/AppDbContext.cs:45,188-196`)
- `IrtCalculation`, `FinalScore`, `RouteDetermination` — scoring outputs (`DsatPsatLmsApi/Data/AppDbContext.cs:46-48,190-196`)

## Practice System

- `PracticeSession`, `PracticeAnswer` — per-user practice runs (`DsatPsatLmsApi/Data/AppDbContext.cs:60-63,244-253`)
- `UserQuestionStats` — correctness & mastery tracking with unique `(UserId, QuestionId)` (`DsatPsatLmsApi/Data/AppDbContext.cs:64,254-260`)
- `UserPracticePreferences` — per-user settings (unique `UserId`) (`DsatPsatLmsApi/Data/AppDbContext.cs:61,261-265`)

## Study Plan

- `StudyPlanModule`, `StudyPlanModuleProgress` — module definitions and user progress (`DsatPsatLmsApi/Data/AppDbContext.cs:53-55,207-215`)
- `PerformanceRouting` — rules linking modules (`DsatPsatLmsApi/Data/AppDbContext.cs:212-215`)

## SignalR

- Hub mapping defined in startup; see `DsatPsatLmsApi/Program.cs:141`
