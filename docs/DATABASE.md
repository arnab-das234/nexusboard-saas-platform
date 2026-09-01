# Essay Writing Competition Management System — Database Design Document

> **Database:** SQLite (dev) / Neon PostgreSQL (prod) | **ORM:** Prisma 6.11 | **Models:** 25

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Summary](#entity-relationship-summary)
3. [Complete Schema Reference](#complete-schema-reference)
4. [State Machines](#state-machines)
5. [Index Strategy](#index-strategy)
6. [Transaction Boundaries](#transaction-boundaries)
7. [Data Integrity Rules](#data-integrity-rules)
8. [Migration Strategy](#migration-strategy)

---

## Overview

The database uses a **normalized relational model** with 25 Prisma models organized into 8 logical domains. The schema supports the full competition lifecycle from user registration through essay evaluation and result publication.

### Design Principles

- **Normalization:** 3NF with selective denormalization for read-heavy dashboard queries
- **Soft deletes:** `isActive` flags on User and ExaminerProfile (no hard deletes)
- **Temporal tracking:** `createdAt` / `updatedAt` on all mutable models
- **CUID primary keys:** Collision-resistant, sortable, URL-safe identifiers
- **Status fields as strings:** Type-safe via TypeScript unions, not DB enums (portable)

### Model Domains

| Domain | Models | Count |
|--------|--------|-------|
| User & Auth | User, Role, UserRole, AdminPermission, EmailVerificationToken, PasswordResetToken | 6 |
| Profiles | StudentProfile, TeacherProfile, ExaminerProfile | 3 |
| Competition | Competition, CompetitionCategory, CompetitionExaminer, ScoringConfig | 4 |
| Registration | Registration | 1 |
| Payment | Payment, PaymentEvent | 2 |
| Essay & Examination | EssaySubmission, ExaminerAssignment, EvaluationCriterion, ExaminerEvaluation, EvaluationScore | 5 |
| Results | Result | 1 |
| System | Notification, Announcement, UserNotification, SystemSetting, AuditLog | 5 |

---

## Entity Relationship Summary

### Core Relationships (text-based ER)

```
User ───┬─── UserRole ──── Role
        ├─── AdminPermission (many, permission strings)
        ├─── StudentProfile ──── Registration ──── Competition
        │                      │                   ├── CompetitionCategory
        │                      │                   ├── CompetitionExaminer ──── ExaminerProfile ──── User
        │                      │                   ├── EvaluationCriterion
        │                      │                   └── ScoringConfig
        │                      ├── Payment ──── PaymentEvent
        │                      └── EssaySubmission
        │                           ├── ExaminerAssignment ──── ExaminerProfile
        │                           ├── ExaminerEvaluation
        │                           │    └── EvaluationScore ──── EvaluationCriterion
        │                           └── Result ──── Competition, CompetitionCategory
        ├─── TeacherProfile ──── StudentProfile (referred students)
        ├─── ExaminerProfile ──── ExaminerAssignment, ExaminerEvaluation
        ├─── AuditLog
        ├─── Notification
        └── UserNotification ──── Announcement

Announcement ──── UserNotification ──── User

SystemSetting (standalone key-value store)
```

### Key Relationship Cardinalities

| Relationship | Cardinality | Notes |
|-------------|-------------|-------|
| User → Roles | Many-to-Many | Via UserRole join table |
| User → AdminPermission | One-to-Many | Permission strings per user |
| User → StudentProfile | One-to-One | `@unique` on userId |
| User → TeacherProfile | One-to-One | `@unique` on userId |
| User → ExaminerProfile | One-to-One | `@unique` on userId |
| StudentProfile → Registrations | One-to-Many | A student registers for many competitions |
| Competition → Categories | One-to-Many | Age-based categories within a competition |
| Competition → Criteria | One-to-Many | Scoring rubric criteria |
| Competition → ScoringConfig | One-to-One | `@unique` on competitionId |
| Registration → Payments | One-to-Many | Multiple payment attempts allowed |
| Registration → EssaySubmission | One-to-One | `@unique` on registrationId |
| EssaySubmission → Results | One-to-One | `@unique` on essayId |
| EssaySubmission → ExaminerAssignments | One-to-Many | N examiners per essay |
| ExaminerEvaluation → Scores | One-to-Many | One score per criterion |
| Competition → ExaminerEvaluations | One-to-Many | Via competitionId |
| ExaminerAssignment → ExaminerEvaluation | One-to-One | `@unique` on assignmentId |

---

## Complete Schema Reference

### User & Auth Domain

#### `User`

Central authentication entity. Stores credentials and links to role assignments and profiles.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `email` | `String` | `@unique` | Login email (lowercased on creation) |
| `passwordHash` | `String` | — | Bcrypt hash (plain in dev mode) |
| `name` | `String?` | — | Display name |
| `phone` | `String?` | — | Contact number |
| `avatar` | `String?` | — | Avatar URL |
| `emailVerified` | `Boolean` | `@default(false)` | Email verification status |
| `isActive` | `Boolean` | `@default(true)` | Account active flag (soft ban) |
| `createdAt` | `DateTime` | `@default(now())` | Account creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification timestamp |

**Relations:** `roles[]`, `permissions[]`, `studentProfile?`, `teacherProfile?`, `examinerProfile?`, `auditLogs[]`, `notifications[]`, `paymentsCreated[]`, `emailTokens[]`, `passwordTokens[]`, `userNotifications[]`

**Indexes:** `email`, `isActive`

---

#### `Role`

Static role definitions. Seeded with 5 roles: SUPER_ADMIN, ADMIN, TEACHER, STUDENT, EXAMINER.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | `@unique` | Role identifier (enum value) |
| `description` | `String?` | — | Human-readable description |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

---

#### `UserRole`

Join table for User ↔ Role many-to-many relationship.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | User reference |
| `roleId` | `String` | FK → Role, `onDelete: Cascade` | Role reference |
| `assignedAt` | `DateTime` | `@default(now())` | When role was assigned |

**Unique:** `[userId, roleId]`

---

#### `AdminPermission`

Granular permission strings assigned to ADMIN users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | Admin user |
| `permission` | `String` | — | Permission string (e.g., `STUDENT_VIEW`) |
| `grantedAt` | `DateTime` | `@default(now())` | Grant timestamp |

**Unique:** `[userId, permission]`
**Index:** `userId`

---

#### `EmailVerificationToken`

One-time tokens for email verification.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | Token owner |
| `token` | `String` | `@unique` | Verification token (random string) |
| `expiresAt` | `DateTime` | — | Token expiration time |
| `usedAt` | `DateTime?` | — | When token was consumed |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Indexes:** `token`, `userId`

---

#### `PasswordResetToken`

One-time tokens for password reset (same structure as email token).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | Token owner |
| `token` | `String` | `@unique` | Reset token |
| `expiresAt` | `DateTime` | — | Token expiration time |
| `usedAt` | `DateTime?` | — | When token was consumed |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Indexes:** `token`, `userId`

---

### Profile Domain

#### `StudentProfile`

Extended profile data for student users. Contains academic and guardian information.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | `@unique`, FK → User, `onDelete: Cascade` | User reference |
| `dateOfBirth` | `DateTime` | **Required** | For age eligibility calculation |
| `gender` | `String?` | — | Student gender |
| `address` | `String?` | — | Home address |
| `schoolName` | `String` | **Required** | School name |
| `schoolAddress` | `String?` | — | School address |
| `board` | `String?` | — | Education board (CBSE, ICSE, etc.) |
| `classGrade` | `String?` | — | Class/grade level |
| `section` | `String?` | — | Section within class |
| `rollNumber` | `String?` | — | School roll number |
| `studentId` | `String?` | — | School student ID |
| `guardianName` | `String?` | — | Parent/guardian name |
| `guardianRelation` | `String?` | — | Relationship to guardian |
| `guardianPhone` | `String?` | — | Guardian contact phone |
| `guardianEmail` | `String?` | — | Guardian email |
| `referredByTeacherId` | `String?` | FK → TeacherProfile | Referring teacher |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `dateOfBirth`, `schoolName`, `referredByTeacherId`

---

#### `TeacherProfile`

Extended profile data for teacher users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | `@unique`, FK → User, `onDelete: Cascade` | User reference |
| `schoolName` | `String` | **Required** | School name |
| `schoolAddress` | `String?` | — | School address |
| `designation` | `String?` | — | Job title |
| `employeeId` | `String?` | — | Employee ID |
| `address` | `String?` | — | Home address |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

---

#### `ExaminerProfile`

Extended profile data for examiner users with activation status.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | `@unique`, FK → User, `onDelete: Cascade` | User reference |
| `specialization` | `String?` | — | Subject specialization |
| `qualification` | `String?` | — | Academic qualification |
| `isActive` | `Boolean` | `@default(true)` | Can receive assignments |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Index:** `isActive`

---

### Competition Domain

#### `Competition`

Defines a competition with scheduling, eligibility, fee, and file constraints.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | **Required** | Competition name |
| `description` | `String?` | — | Detailed description |
| `academicYear` | `String?` | — | Academic year (e.g., "2025-26") |
| `startDate` | `DateTime?` | — | Competition start date |
| `registrationOpenDate` | `DateTime?` | — | Registration opens |
| `registrationCloseDate` | `DateTime?` | — | Registration closes |
| `submissionOpenDate` | `DateTime?` | — | Essay submission opens |
| `submissionCloseDate` | `DateTime?` | — | Essay submission closes |
| `competitionDate` | `DateTime?` | — | Actual competition date |
| `resultDeclarationDate` | `DateTime?` | — | Results published date |
| `minAge` | `Int` | **Required** | Minimum participant age |
| `maxAge` | `Int` | **Required** | Maximum participant age |
| `ageCalculationDate` | `DateTime` | **Required** | Reference date for age calc |
| `registrationFee` | `Float` | `@default(100)` | Fee in INR |
| `maxEssayFileSize` | `Int` | `@default(5242880)` | Max file size in bytes (5MB) |
| `allowedFileFormats` | `String` | `@default("application/pdf")` | MIME types allowed |
| `maxFileSizeMB` | `Int` | `@default(5)` | Display size in MB |
| `status` | `String` | `@default("DRAFT")` | Competition lifecycle status |
| `rules` | `String?` | — | Competition rules (markdown) |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `status`, `academicYear`

---

#### `CompetitionCategory`

Age-based categories within a competition (e.g., Junior: 10-13, Senior: 14-17).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `competitionId` | `String` | FK → Competition, `onDelete: Cascade` | Parent competition |
| `name` | `String` | **Required** | Category name |
| `minAge` | `Int` | **Required** | Minimum age for this category |
| `maxAge` | `Int` | **Required** | Maximum age for this category |
| `description` | `String?` | — | Category description |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Unique:** `[competitionId, name]`
**Index:** `competitionId`

---

#### `CompetitionExaminer`

Many-to-many join: which examiners are eligible for a competition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `competitionId` | `String` | FK → Competition, `onDelete: Cascade` | Competition |
| `examinerId` | `String` | FK → ExaminerProfile, `onDelete: Cascade` | Examiner |
| `assignedAt` | `DateTime` | `@default(now())` | Assignment timestamp |

**Unique:** `[competitionId, examinerId]`

---

#### `ScoringConfig`

Per-competition scoring configuration. One-to-one with Competition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `competitionId` | `String` | `@unique`, FK → Competition, `onDelete: Cascade` | Competition |
| `examinerCount` | `Int` | `@default(3)` | Number of examiners per essay |
| `maxMarks` | `Int` | `@default(100)` | Maximum possible score |
| `minMarks` | `Int` | `@default(0)` | Minimum possible score |
| `averagingMethod` | `String` | `@default("MEAN")` | MEAN, MEDIAN, or TRIMMED_MEAN |
| `outlierHandling` | `Boolean` | `@default(false)` | Enable trimmed mean outlier removal |
| `blindEvaluation` | `Boolean` | `@default(true)` | Hide student identity from examiners |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

---

### Registration Domain

#### `Registration`

Records a student's registration for a competition. Contains status lifecycle and generated registration number.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `registrationNo` | `String` | `@unique` | Human-readable ID (e.g., EC-2025-00001) |
| `studentId` | `String` | FK → StudentProfile | Student |
| `competitionId` | `String` | FK → Competition | Competition |
| `categoryId` | `String?` | FK → CompetitionCategory | Age category |
| `status` | `String` | `@default("PENDING")` | Registration status |
| `registeredAt` | `DateTime` | `@default(now())` | Registration timestamp |
| `confirmedAt` | `DateTime?` | — | When payment confirmed |
| `cancelledAt` | `DateTime?` | — | Cancellation timestamp |
| `cancelReason` | `String?` | — | Cancellation reason |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `studentId`, `competitionId`, `status`, `registrationNo`

---

### Payment Domain

#### `Payment`

Tracks Razorpay payment attempts linked to registrations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `registrationId` | `String` | FK → Registration | Associated registration |
| `razorpayOrderId` | `String` | `@unique` | Razorpay order ID |
| `razorpayPaymentId` | `String?` | `@unique` | Razorpay payment ID (after success) |
| `razorpaySignature` | `String?` | — | Payment signature for verification |
| `amount` | `Float` | **Required** | Amount in INR |
| `currency` | `String` | `@default("INR")` | Currency code |
| `status` | `String` | `@default("CREATED")` | Payment status |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |
| `verifiedAt` | `DateTime?` | — | Server-side verification time |
| `createdById` | `String` | FK → User ("CreatedBy") | Who initiated payment |

**Indexes:** `registrationId`, `status`, `razorpayOrderId`, `razorpayPaymentId`

---

#### `PaymentEvent`

Immutable log of payment events (order created, webhook received, verification, etc.).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `paymentId` | `String` | FK → Payment, `onDelete: Cascade` | Parent payment |
| `eventType` | `String` | — | Event type identifier |
| `eventData` | `String?` | — | JSON payload of the event |
| `ipAddress` | `String?` | — | Client IP address |
| `userAgent` | `String?` | — | Client user agent |
| `createdAt` | `DateTime` | `@default(now())` | Event timestamp |

**Indexes:** `paymentId`, `eventType`

---

### Essay & Examination Domain

#### `EssaySubmission`

Stores essay file metadata and validation status. One per registration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `registrationId` | `String` | `@unique`, FK → Registration | Parent registration |
| `studentId` | `String` | FK → StudentProfile | Student |
| `competitionId` | `String` | FK → Competition | Competition |
| `cloudinaryId` | `String?` | — | Cloudinary public ID |
| `fileUrl` | `String?` | — | Cloudinary URL (HTTP) |
| `secureUrl` | `String?` | — | Cloudinary URL (HTTPS) |
| `fileName` | `String?` | — | Stored file name |
| `originalName` | `String?` | — | Original upload file name |
| `fileSize` | `Int?` | — | File size in bytes |
| `mimeType` | `String?` | — | File MIME type |
| `fileHash` | `String?` | — | Content hash for duplicate detection |
| `status` | `String` | `@default("NOT_STARTED")` | Essay status |
| `submittedAt` | `DateTime?` | — | Submission timestamp |
| `validatedAt` | `DateTime?` | — | Validation timestamp |
| `validationNotes` | `String?` | — | Admin validation notes |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `studentId`, `competitionId`, `status`, `fileHash`

---

#### `ExaminerAssignment`

Links an examiner to an essay for evaluation. Each assignment becomes one evaluation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `essayId` | `String` | FK → EssaySubmission, `onDelete: Cascade` | Essay to evaluate |
| `examinerId` | `String` | FK → ExaminerProfile, `onDelete: Cascade` | Assigned examiner |
| `assignedBy` | `String?` | — | Admin who assigned |
| `assignedAt` | `DateTime` | `@default(now())` | Assignment timestamp |
| `status` | `String` | `@default("ASSIGNED")` | Assignment status |
| `deadline` | `DateTime?` | — | Evaluation deadline |
| `reassignedAt` | `DateTime?` | — | Reassignment timestamp |
| `reassignedBy` | `String?` | — | Admin who reassigned |

**Unique:** `[essayId, examinerId]`
**Indexes:** `examinerId`, `status`, `essayId`

---

#### `EvaluationCriterion`

Scoring rubric criteria defined per competition (e.g., "Content", "Grammar", "Creativity").

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `competitionId` | `String` | FK → Competition, `onDelete: Cascade` | Competition |
| `name` | `String` | **Required** | Criterion name |
| `description` | `String?` | — | What to evaluate |
| `maxMarks` | `Int` | **Required** | Maximum score for this criterion |
| `sortOrder` | `Int` | `@default(0)` | Display/evaluation order |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Unique:** `[competitionId, name]`
**Index:** `competitionId`

---

#### `ExaminerEvaluation`

An examiner's complete evaluation of an essay, including total marks and narrative feedback.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `assignmentId` | `String` | `@unique`, FK → ExaminerAssignment, `onDelete: Cascade` | Parent assignment |
| `essayId` | `String` | FK → EssaySubmission | Essay |
| `examinerId` | `String` | FK → ExaminerProfile | Examiner |
| `competitionId` | `String` | FK → Competition | Competition |
| `totalMarks` | `Float?` | — | Sum of all criterion scores |
| `justification` | `String?` | — | Overall justification |
| `comments` | `String?` | — | General comments |
| `ocrReferences` | `String?` | — | References to specific PDF sections |
| `status` | `String` | `@default("ASSIGNED")` | Evaluation status |
| `submittedAt` | `DateTime?` | — | Final submission timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `essayId`, `examinerId`, `status`

---

#### `EvaluationScore`

Individual criterion score within an evaluation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `evaluationId` | `String` | FK → ExaminerEvaluation, `onDelete: Cascade` | Parent evaluation |
| `criterionId` | `String` | FK → EvaluationCriterion | Scoring criterion |
| `marks` | `Float` | **Required** | Score awarded (0 to maxMarks) |
| `comments` | `String?` | — | Per-criterion comment |

**Unique:** `[evaluationId, criterionId]`
**Index:** `evaluationId`

---

### Results Domain

#### `Result`

Final calculated result for an essay. One-to-one with EssaySubmission.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `essayId` | `String` | `@unique`, FK → EssaySubmission | Essay |
| `competitionId` | `String` | FK → Competition | Competition |
| `categoryId` | `String?` | FK → CompetitionCategory | Age category |
| `studentId` | `String` | FK → StudentProfile | Student |
| `averageScore` | `Float?` | — | Simple average of examiner totals |
| `finalScore` | `Float?` | — | Score after applying averaging method |
| `rank` | `Int?` | — | Rank within category (set on publish) |
| `status` | `String` | `@default("PENDING")` | Result status |
| `publishedAt` | `DateTime?` | — | Publication timestamp |
| `calculatedAt` | `DateTime?` | — | Last calculation timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `competitionId`, `categoryId`, `studentId`, `status`

---

### System Domain

#### `Notification`

Direct in-app notification for a user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | Recipient |
| `title` | `String` | **Required** | Notification title |
| `message` | `String` | **Required** | Notification body |
| `type` | `String` | `@default("INFO")` | INFO, WARNING, SUCCESS, ERROR |
| `isRead` | `Boolean` | `@default(false)` | Read status |
| `readAt` | `DateTime?` | — | Read timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Indexes:** `userId`, `isRead`, `createdAt`

---

#### `Announcement`

Broadcast announcement targeting specific audience segments.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `title` | `String` | **Required** | Announcement title |
| `message` | `String` | **Required** | Announcement body |
| `audience` | `String` | `@default("ALL")` | Target audience type |
| `competitionId` | `String?` | FK → Competition | Competition-specific? |
| `scheduledAt` | `DateTime?` | — | Scheduled publish time |
| `status` | `String` | `@default("DRAFT")` | DRAFT, PUBLISHED, ARCHIVED |
| `createdBy` | `String?` | — | Admin creator |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Indexes:** `status`, `audience`

---

#### `UserNotification`

Junction table linking announcements to users for tracking read status.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User, `onDelete: Cascade` | Recipient |
| `announcementId` | `String?` | FK → Announcement | Announcement |
| `isRead` | `Boolean` | `@default(false)` | Read status |
| `readAt` | `DateTime?` | — | Read timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Indexes:** `userId`, `isRead`

---

#### `SystemSetting`

Key-value store for system configuration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `key` | `String` | `@unique` | Setting key |
| `value` | `String` | **Required** | Setting value (JSON-encoded for complex types) |
| `category` | `String` | **Required** | Setting category for grouping |
| `type` | `String` | `@default("STRING")` | Value type hint |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Index:** `category`

---

#### `AuditLog`

Immutable log of all significant system actions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String?` | FK → User (optional) | Actor |
| `userRole` | `String?` | — | Actor's role at time of action |
| `action` | `String` | **Required** | Action identifier (e.g., `USER_LOGIN`) |
| `entityType` | `String?` | — | Affected entity type (e.g., `User`) |
| `entityId` | `String?` | — | Affected entity ID |
| `previousValue` | `String?` | — | JSON of value before change |
| `newValue` | `String?` | — | JSON of value after change |
| `ipAddress` | `String?` | — | Actor's IP address |
| `userAgent` | `String?` | — | Actor's user agent |
| `requestId` | `String?` | — | Request correlation ID |
| `createdAt` | `DateTime` | `@default(now())` | Action timestamp |

**Indexes:** `userId`, `action`, `entityType`, `createdAt`

---

## State Machines

### Registration State Machine

```
                    ┌──────────┐
                    │  PENDING  │  ← Initial state after creation
                    └────┬─────┘
                         │
                    Email verified
                         │
                    ┌────▼─────┐
                    │ VERIFIED  │
                    └────┬─────┘
                         │
                  Initiate payment
                         │
                ┌────────▼───────────┐
                │  PAYMENT_PENDING   │ ← After order created
                └───┬──────────┬─────┘
                    │          │
             Payment   Payment
             success    failed
                    │          │
              ┌─────▼──┐  ┌──▼──────────┐
              │  PAID  │  │PAYMENT_PENDING│ (retry)
              └───┬────┘  └──────────────┘
                  │
            Auto-confirmed
                  │
           ┌──────▼──────┐
           │  CONFIRMED   │  ← Ready for essay submission
           └──────┬──────┘
                  │
         Admin/student
         cancellation
                  │
           ┌──────▼──────┐
           │  CANCELLED   │  ← Terminal state
           └─────────────┘
```

**Valid transitions:**

| From | To | Trigger | Notes |
|------|-----|---------|-------|
| PENDING | VERIFIED | Email verification | Auto after email verified |
| PENDING | PAYMENT_PENDING | Payment order created | Skip verified in dev |
| PAYMENT_PENDING | PAID | Payment success | Transaction: update payment + registration |
| PAYMENT_PENDING | CANCELLED | Cancel request | Only if no successful payment |
| PAID | CANCELLED | Admin cancel with refund | Requires refund flow |
| CONFIRMED | CANCELLED | Admin cancel with refund | Requires refund flow |

---

### Essay State Machine

```
  ┌──────────────┐
  │  NOT_STARTED  │  ← Registration confirmed, no upload yet
  └──────┬───────┘
         │
    Student begins upload
         │
  ┌──────▼───────┐
  │ UPLOAD_PENDING │
  └──────┬───────┘
         │
    File uploading
         │
  ┌──────▼───────┐
  │  UPLOADING    │
  └──────┬───────┘
         │
    Upload complete
         │
  ┌──────▼───────┐
  │  VALIDATING   │  ← Auto or admin-triggered
  └──┬────────┬───┘
     │        │
  Valid    Invalid
     │        │
  ┌──▼───┐  ┌▼────────┐
  │VALID │  │ INVALID │  ← Student can resubmit
  └──┬───┘  └───┬─────┘
     │          │
     │     Resubmit
     │          │
     │     UPLOAD_PENDING
     │
  Auto-transition
     │
  ┌──▼───────────┐
  │  SUBMITTED    │
  └──────┬───────┘
         │
   Examiner assigned
         │
  ┌──────▼───────────┐
  │ UNDER_EVALUATION  │
  └──────┬────────────┘
         │
  All examiners submit
         │
  ┌──────▼───────┐
  │  EVALUATED   │
  └──────┬───────┘
         │
  Admin publishes results
         │
  ┌──────▼─────────────┐
  │ RESULT_PUBLISHED   │  ← Terminal state
  └────────────────────┘
```

**Locked states** (no modification allowed): `SUBMITTED`, `UNDER_EVALUATION`, `EVALUATED`, `RESULT_PUBLISHED`

---

### Evaluation State Machine

```
  ┌──────────┐
  │ ASSIGNED │  ← Initial state after examiner assigned to essay
  └────┬─────┘
       │
  Examiner begins scoring
       │
  ┌────▼──────────┐
  │  IN_PROGRESS   │  ← Draft saved (not final)
  └────┬──────────┘
       │
  Examiner submits
       │
  ┌────▼───────┐
  │  SUBMITTED  │  ← Final, cannot be modified by examiner
  └────┬───────┘
       │
  Admin locks (after result calculated)
       │
  ┌────▼───────┐
  │   LOCKED   │  ← Immutable
  └────────────┘
```

---

### Payment State Machine

```
  ┌──────────┐
  │  CREATED  │  ← Order created, awaiting payment
  └────┬─────┘
       │
  Razorpay checkout opened
       │
  ┌────▼───────┐
  │  PENDING   │  ← Payment in progress
  └──┬──────┬──┘
     │      │
  Success  Failed
     │      │
  ┌──▼───┐ ┌▼────────┐
  │SUCCESS│ │ FAILED  │
  └──┬───┘ └┬────────┘
     │      │
     │   Retry
     │      │
     │   PENDING
     │
  Admin-initiated
     │
  ┌──▼─────────────┐  ┌───────────┐
  │   REFUNDED     │  │ CANCELLED │
  └────────────────┘  └───────────┘
```

---

### Competition State Machine

```
  ┌─────────┐
  │  DRAFT   │  ← Competition created, not visible to students
  └────┬────┘
       │
  Admin opens registration
       │
  ┌────▼────────────────┐
  │  REGISTRATION_OPEN  │  ← Students can register
  └────┬────────────────┘
       │
  Admin closes registration
       │
  ┌────▼────────────────┐
  │ REGISTRATION_CLOSED  │
  └────┬────────────────┘
       │
  Admin opens submission
       │
  ┌────▼───────────────┐
  │  SUBMISSION_OPEN   │  ← Students can upload essays
  └────┬───────────────┘
       │
  Admin closes submission
       │
  ┌────▼────────────────┐
  │ SUBMISSION_CLOSED   │
  └────┬────────────────┘
       │
  Admin starts evaluation
       │
  ┌────▼──────────────────┐
  │ EVALUATION_IN_PROGRESS│
  └────┬──────────────────┘
       │
  All evaluations complete
       │
  ┌────▼────────────┐
  │ RESULT_PENDING  │
  └────┬────────────┘
       │
  Admin publishes results
       │
  ┌────▼──────────────┐
  │ RESULT_PUBLISHED  │
  └────┬──────────────┘
       │
  Competition concluded
       │
  ┌────▼─────────┐
  │  COMPLETED   │  ← Terminal state
  └──────────────┘

  Any non-terminal state can transition to:
  ┌──────┐
  │CANCELLED│  ← Admin cancels competition
  └──────┘
```

---

## Index Strategy

### Index Summary

The schema defines **25 indexes** across models. These target the most common query patterns:

| Pattern | Indexed Fields | Example Query |
|---------|---------------|---------------|
| Lookup by status | `status` | `WHERE status = 'REGISTRATION_OPEN'` |
| Foreign key lookup | `studentId`, `competitionId`, `examinerId` | `WHERE competitionId = ?` |
| Unique constraint | `email`, `registrationNo`, `razorpayOrderId` | `WHERE email = ?` (login) |
| Time-range queries | `createdAt` | `WHERE createdAt > ?` (audit logs, notifications) |
| Read/unread filter | `isRead` | `WHERE isRead = false` (notifications) |
| Category filter | `category` (SystemSetting) | `WHERE category = 'EMAIL'` |
| Duplicate detection | `fileHash` (EssaySubmission) | `WHERE fileHash = ?` |
| Active filter | `isActive` (User, ExaminerProfile) | `WHERE isActive = true` |

### Missing Indexes (Recommended for Production)

| Table | Recommended Index | Rationale |
|-------|-------------------|-----------|
| `AuditLog` | Composite `[entityType, entityId]` | Filter audit logs by entity |
| `Notification` | Composite `[userId, isRead]` | Unread notification count per user |
| `Registration` | Composite `[competitionId, status]` | Registration analytics by competition |
| `Payment` | Composite `[registrationId, status]` | Latest payment status per registration |
| `Result` | Composite `[competitionId, status]` | Result analytics |
| `ExaminerEvaluation` | Composite `[essayId, status]` | Check if all evaluations submitted |

---

## Transaction Boundaries

Prisma `$transaction` is used for operations that must be atomic:

### User Registration
```
$transaction:
  1. Create User
  2. Create UserRole
  3. Create StudentProfile or TeacherProfile
```

### Payment Verification
```
$transaction:
  1. Update Payment status → SUCCESS
  2. Update Registration status → PAID
  3. Create PaymentEvent (PAYMENT_SUCCESS)
```

### Essay Submission
```
$transaction:
  1. Create/Update EssaySubmission
```

### Evaluation Save/Submit
```
$transaction:
  1. Upsert ExaminerEvaluation
  2. Upsert EvaluationScore (N records, one per criterion)
  3. Update ExaminerAssignment status
```

### Email Verification
```
$transaction (batch):
  1. Update User.emailVerified = true
  2. Update EmailVerificationToken.usedAt = now
```

---

## Data Integrity Rules

### Database-Level Constraints

| Rule | Enforcement | Model |
|------|-------------|-------|
| Email uniqueness | `@unique` | User.email |
| Registration number uniqueness | `@unique` | Registration.registrationNo |
| One profile per role per user | `@unique` on userId | StudentProfile, TeacherProfile, ExaminerProfile |
| One essay per registration | `@unique` on registrationId | EssaySubmission |
| One result per essay | `@unique` on essayId | Result |
| One evaluation per assignment | `@unique` on assignmentId | ExaminerEvaluation |
| No duplicate role assignment | `@@unique([userId, roleId])` | UserRole |
| No duplicate permission | `@@unique([userId, permission])` | AdminPermission |
| No duplicate category name per competition | `@@unique([competitionId, name])` | CompetitionCategory |
| No duplicate examiner per essay | `@@unique([essayId, examinerId])` | ExaminerAssignment |
| No duplicate score per criterion per eval | `@@unique([evaluationId, criterionId])` | EvaluationScore |
| No duplicate examiner per competition | `@@unique([competitionId, examinerId])` | CompetitionExaminer |

### Application-Level Rules

| Rule | Location | Description |
|------|----------|-------------|
| Age eligibility | Registration API | Student age vs competition min/max age |
| Duplicate registration | Registration API | No active (non-cancelled) registration per student per competition |
| Duplicate payment | Payment API | No SUCCESS payment exists before creating new order |
| File size limit | Essay API | File size ≤ competition.maxEssayFileSize |
| File type validation | Essay API | MIME type must be `application/pdf` |
| Score range | Evaluation API | 0 ≤ marks ≤ criterion.maxMarks |
| Locked essay modification | Essay API | Cannot resubmit if status is SUBMITTED, LOCKED, UNDER_EVALUATION |
| Submitted evaluation modification | Evaluation API | Cannot modify evaluation with assignment status SUBMITTED |
| Cancel with payment | Registration API | Cannot cancel registration with SUCCESS payment (requires refund) |
| Competition status gates | Multiple APIs | Registration only when REGISTRATION_OPEN, submission only when SUBMISSION_OPEN |

### Cascade Delete Rules

| Parent | Children Deleted | Notes |
|--------|-----------------|-------|
| User | UserRole, AdminPermission, Profiles, AuditLog, Notifications, EmailTokens, PasswordTokens, UserNotifications | Full account purge |
| Competition | Categories, ExaminerEvaluations, Criteria, ScoringConfig, CompetitionExaminers | Competition deletion cleans up all related data |
| EssaySubmission | ExaminerAssignments, ExaminerEvaluations (via assignments) | Essay deletion removes all evaluation work |
| Payment | PaymentEvents | Payment event history removed with payment |

---

## Migration Strategy

### Development (SQLite)

```bash
# Push schema changes directly (no migration files)
bun run db:push

# Generate Prisma client
bun run db:generate

# Seed data
bun run seed
```

### Production (Neon PostgreSQL)

#### Initial Migration

```bash
# 1. Set DATABASE_URL to Neon connection string
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# 2. Create initial migration
npx prisma migrate dev --name init

# 3. Apply migration to production
npx prisma migrate deploy
```

#### Schema Evolution

```bash
# Development: create migration
npx prisma migrate dev --name add_new_field

# Production: apply migration
npx prisma migrate deploy
```

#### Vercel Deployment Notes

1. **Connection pooling:** Use Neon's pooled connection string (`-pooler` suffix) for serverless
2. **Prisma adapter:** Install `@prisma/adapter-neon` and `@neondatabase/serverless`
3. **Migration on deploy:** Add `prisma migrate deploy` to Vercel build command
4. **Schema drift:** Use `prisma db push` only for prototyping; use migrations for production

#### Adapter Configuration (Neon)

```typescript
import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaNeon(pool)
const prisma = new PrismaClient({ adapter })
```

### Seed Data

The seed script (`prisma/seed.ts`) creates:

- **5 Roles:** SUPER_ADMIN, ADMIN, TEACHER, STUDENT, EXAMINER
- **1 Super Admin user:** `admin@essaycomp.com` / `admin123`
- **System Settings:** Default configuration for all categories
- **Sample Competition:** A draft competition with categories and criteria

```bash
# Run seed
bun run seed
```
