# DTO Schemas

Field names and types based on the backend source.

## Auth DTOs (`DsatPsatLmsApi/DTOs/AuthDTOs.cs`)

- `RegisterDto`
  - `name: string` (required)
  - `email: string` (required, email)
  - `password: string` (required, min 6)
- `LoginDto`
  - `email: string` (required, email)
  - `password: string` (required)
- `AuthResponseDto`
  - `token: string`
  - `user: UserDto`
- `UserDto`
  - `id: Guid`
  - `name: string`
  - `email: string`
  - `role: string`
- `ForgotPasswordDto`
  - `email: string` (required, email)
- `ResetPasswordDto`
  - `token: string` (required)
  - `newPassword: string` (required, min 6)

## Course DTOs (`DsatPsatLmsApi/DTOs/CourseDTOs.cs`)

- `CreateCourseDto`
  - `title: string` (required)
  - `description?: string`
  - `overview?: string`
  - `courseDetails?: string`
  - `bannerImageUrl?: string`
  - `type: string` (default `"course"`)
  - `price: decimal` (required)
  - `discountedPrice?: decimal`
  - `discountPercentage?: decimal`
  - `stripeProductId?: string`
  - `stripePriceId?: string`
  - `highlights: string[]`
  - `schedules: CreateCourseScheduleDto[]`
  - `faqs: CreateCourseFAQDto[]`
- `CreateCourseHighlightDto`
  - `text: string` (required)
- `CreateCourseScheduleDto`
  - `day: string` (required)
  - `time: string` (required)
- `CreateCourseFAQDto`
  - `question: string` (required)
  - `answer: string` (required)
- `UpdateCourseDto` (all optional)
  - `title?: string`, `description?: string`, `overview?: string`, `courseDetails?: string`, `bannerImageUrl?: string`, `type?: string`, `price?: decimal`, `discountedPrice?: decimal`, `discountPercentage?: decimal`, `stripeProductId?: string`, `stripePriceId?: string`, `highlights?: string[]`, `schedules?: CreateCourseScheduleDto[]`, `faqs?: CreateCourseFAQDto[]`
- `CourseDto`
  - `id: Guid`, `title: string`, optional descriptive fields, pricing fields, stripe ids, `type: string`, `createdAt: DateTime`, collections: `highlights`, `schedules`, `faqs`
- `CourseHighlightDto`
  - `id: Guid`, `text: string`, `sequenceOrder: int`
- `CourseScheduleDto`
  - `id: Guid`, `day: string`, `time: string`
- `CourseFAQDto`
  - `id: Guid`, `question: string`, `answer: string`

## Service DTOs (`DsatPsatLmsApi/DTOs/ServiceDTOs.cs`)

- `CreateServiceDto`
  - `slug: string` (required)
  - `title: string` (required)
  - `subtitle: string` (required)
  - `description: string` (required)
  - `phoneNumber: string` (required)
  - `bannerUrl?: string`
- `UpdateServiceDto` (optional versions of above)
- `ServiceDto`
  - `id: Guid`, `slug: string`, `title: string`, `subtitle: string`, `description: string`, `phoneNumber: string`, `bannerUrl?: string`, `createdAt: DateTime`, `packages: ServicePackageDto[]`, `highlights: ServiceHighlightDto[]`
- `CreateServicePackageDto`
  - `title: string` (required)
  - `label: string` (required)
  - `price: decimal`
  - `features: string` (required)
  - `order: int`
  - `isCustomPlan: bool`
- `ServicePackageDto`
  - `id: Guid`, `title: string`, `label: string`, `price: decimal`, `features: string`, `order: int`, `isCustomPlan: bool`
- `CreateServiceHighlightDto`
  - `type: string`
  - `title: string` (required)
  - `content: string` (required)
  - `imageUrl?: string`
- `ServiceHighlightDto`
  - `id: Guid`, `type: string`, `title: string`, `content: string`, `imageUrl?: string`
- `CreateContactMessageDto`
  - `name: string` (required), `email: string` (required, email), `phone?: string`, `subject?: string`, `message?: string`, `sourcePage?: string`
- `ContactMessageDto`
  - `id: Guid`, `name: string`, `email: string`, optional contact fields, `responded: bool`, `createdAt: DateTime`
- `CreateZoomSessionDto`
  - `zoomLink: string` (required), `meetingId?: string`, `passcode?: string`, `sessionDate: DateTime`, `startTime: DateTime`, `endTime: DateTime`
- `ZoomSessionDto`
  - `id: Guid`, `courseId: Guid`, `scheduleId?: Guid`, `zoomLink: string`, `meetingId?: string`, `passcode?: string`, `sessionDate: DateTime`, `startTime: DateTime`, `endTime: DateTime`, `isSent: bool`
- `CreatePaymentDto`
  - `amount: decimal`, `currency: string` (default `"USD"`), `paymentIntentId: string` (required), `status?: string`, `receiptUrl?: string`
- `PaymentDto`
  - `id: Guid`, `userId: Guid`, `enrollmentId: Guid`, `amount: decimal`, `currency: string`, `paymentGateway: string`, `paymentIntentId: string`, `status: string`, `receiptUrl?: string`, `createdAt: DateTime`
- `CreateEnrollmentDto`
  - `courseId: Guid`, `scheduleId?: Guid`
- `EnrollmentDto`
  - `id: Guid`, `userId: Guid`, `courseId: Guid`, `enrolledAt: DateTime`, `course?: CourseDto`
- `CreateSessionDto`
  - `courseId: Guid` (required), `scheduleId?: Guid`, `successUrl: string` (required), `cancelUrl: string` (required)
- `ConfirmSessionDto`
  - `sessionId: string` (required)

## Study Plan DTOs (`DsatPsatLmsApi/DTOs/StudyPlanDTOs.cs`)

- `StudyPlanModuleDto`
  - `id: Guid`, `title: string`, `type: ModuleDifficultyType`, `description: string`, `orderIndex: int`, `isActive: bool`, timestamps, `routingRules: PerformanceRoutingDto[]`
- `CreateStudyPlanModuleDto`
  - `title: string` (required), `type: ModuleDifficultyType` (required), `description?: string`, `orderIndex: int`, `isActive: bool`
- `UpdateStudyPlanModuleDto` (optional versions)
- `StudyPlanModuleProgressDto`
  - `id: Guid`, `userId: Guid`, `moduleId: Guid`, `moduleTitle: string`, `moduleType: ModuleDifficultyType`, `status: ModuleStatus`, `progressPercentage: decimal`, `score?: int`, timestamps
- `UserStudyPlanDto`
  - `userId: Guid`, `modules: StudyPlanModuleProgressDto[]`, `currentModule: StudyPlanModuleProgressDto`, `nextModule: StudyPlanModuleProgressDto`
- `PerformanceRoutingDto`
  - `id: Guid`, `fromModuleId: Guid`, `fromModuleTitle: string`, `toModuleId: Guid`, `toModuleTitle: string`, `minScore: int`, `maxScore: int`, `description: string`, `isActive: bool`, timestamps
- `CreatePerformanceRoutingDto`
  - `fromModuleId: Guid` (required), `toModuleId: Guid` (required), `minScore: int` (0–100, required), `maxScore: int` (0–100, required), `description?: string`, `isActive: bool`
- `UpdateModuleProgressDto`
  - `status?: ModuleStatus`, `progressPercentage?: decimal`, `score?: int`
