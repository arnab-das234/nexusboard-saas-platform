# NexusBoard SaaS Platform - Database Design Documentation

> **Version:** 1.0.0  
> **ORM:** Prisma  
> **Development:** SQLite  
> **Production:** Neon PostgreSQL  
> **Last Updated:** 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Model Catalog](#model-catalog)
   - [User & Authentication](#1-user--authentication)
   - [Profiles](#2-profiles)
   - [Competition Management](#3-competition-management)
   - [Registration & Payment](#4-registration--payment)
   - [Essay & Examination](#5-essay--examination)
   - [Results & Scoring](#6-results--scoring)
   - [Notifications](#7-notifications)
   - [System & Audit](#8-system--audit)
4. [Relationships Summary](#relationships-summary)
5. [Indexing Strategy](#indexing-strategy)
6. [Data Integrity Constraints](#data-integrity-constraints)
7. [Migration Strategy (SQLite to PostgreSQL)](#migration-strategy-sqlite-to-postgresql)
8. [Performance Considerations](#performance-considerations)

---

## Overview

NexusBoard uses a relational database model with **26 Prisma models** organized into 8 logical domains. The schema supports a multi-role essay competition platform where students register, submit essays, and receive evaluated results through a pipeline involving teachers, examiners, and administrators.

### Architecture Principles

- **CUID primary keys** for globally unique, sortable identifiers
- **Soft deletion via status fields** (no physical delete for critical records)
- **Cascade deletes** for dependent child records
- **Timestamps** on all mutable entities (`createdAt`, `updatedAt`)
- **JSON-serialized audit trails** (`previousValue`, `newValue` as strings)

### Domain Count

| Domain | Models | Tables |
|--------|--------|--------|
| User & Auth | 4 | `User`, `Role`, `UserRole`, `AdminPermission` |
| Profiles | 3 | `StudentProfile`, `TeacherProfile`, `ExaminerProfile` |
| Competition | 3 | `Competition`, `CompetitionCategory`, `CompetitionExaminer` |
| Registration & Payment | 3 | `Registration`, `Payment`, `PaymentEvent` |
| Essay & Examination | 5 | `EssaySubmission`, `ExaminerAssignment`, `EvaluationCriterion`, `ExaminerEvaluation`, `EvaluationScore` |
| Results & Scoring | 2 | `Result`, `ScoringConfig` |
| Notifications | 3 | `Announcement`, `Notification`, `UserNotification` |
| System & Audit | 2 | `SystemSetting`, `AuditLog` |
| **Total** | **26** | **26** |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          NEXUSBOARD ENTITY RELATIONSHIP DIAGRAM                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐       ┌──────────┐       ┌──────────────────┐
  │   Role   │──────<│ UserRole │>──────│      User        │
  └──────────┘       └──────────┘       └────────┬─────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
         ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
         │  StudentProfile  │         │  TeacherProfile  │         │ ExaminerProfile  │
         └────────┬─────────┘         └──────────────────┘         └────────┬─────────┘
                  │                                                        │
                  │ referredByTeacherId                                     │
                  ├────────────────>TeacherProfile                          │
                  │                                                        │
    ┌─────────────┼──────────────────┐                                     │
    ▼             ▼                  ▼                                     ▼
┌──────────┐ ┌─────────┐  ┌──────────────┐                    ┌───────────────────────┐
│Registratn│ │  Essay  │  │    Result    │                    │   CompetitionExaminer  │
│          │ │Submission│  │             │                    │  (competition+examiner) │
└────┬─────┘ └────┬────┘  └──────────────┘                    └───────────┬───────────┘
     │            │                                                          │
     │            │                                                          │
     ▼            ▼                                                          │
┌──────────┐ ┌───────────────────┐       ┌──────────────────────┐             │
│ Payment  │ │ExaminerAssignment │>──────│ ExaminerEvaluation   │             │
└────┬─────┘ └───────────────────┘       └──────────┬───────────┘             │
     │                                                 │                       │
     ▼                                                 ▼                       │
┌──────────────┐                              ┌──────────────────┐            │
│ PaymentEvent │                              │ EvaluationScore  │            │
└──────────────┘                              └────────┬─────────┘            │
                                                       │                       │
                                                       ▼                       │
                                              ┌───────────────────────┐       │
                                              │ EvaluationCriterion   │<──────┘
                                              └───────────┬───────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   Competition    │
                                                 └──┬───────────┬───┘
                                                    │           │
                                       ┌────────────┘           └────────────┐
                                       ▼                                     ▼
                              ┌──────────────────┐                 ┌──────────────┐
                              │CompetitionCategory│                 │ ScoringConfig │
                              └──────────────────┘                 └──────────────┘

  ┌─────────────────── SYSTEM CROSS-CUTTING ───────────────────┐
  │                                                             │
  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐         │
  │  │  User    │──│ Notification  │  │AuditLog      │         │
  │  │          │──│ Announcement─>│  │(userId?)     │         │
  │  │          │──│UserNotificatn │  └──────────────┘         │
  │  └──────────┘  └──────────────┘                            │
  │       │                                                     │
  │       ├── EmailVerificationToken                            │
  │       ├── PasswordResetToken                                │
  │       └── AdminPermission                                   │
  └─────────────────────────────────────────────────────────────┘
```

### Simplified Cardinality Reference

```
User            1──* UserRole           *──1 Role
User            1──* AdminPermission
User            1──1 StudentProfile
User            1──1 TeacherProfile
User            1──1 ExaminerProfile
StudentProfile  *──1 TeacherProfile        (referredByTeacherId)
Competition     1──* CompetitionCategory
Competition     1──* CompetitionExaminer   *──1 ExaminerProfile
Competition     1──* Registration          *──1 StudentProfile
Competition     1──* EssaySubmission       1──1 Registration
Competition     1──* EvaluationCriterion
Competition     1──1 ScoringConfig
Registration    1──* Payment
Payment         1──* PaymentEvent
EssaySubmission 1──* ExaminerAssignment    *──1 ExaminerProfile
ExaminerAssign. 1──1 ExaminerEvaluation
ExaminerEval.   1──* EvaluationScore      *──1 EvaluationCriterion
EssaySubmission 1──0..1 Result
Competition     1──* Result
Announcement    1──* UserNotification      *──1 User
User            1──* Notification
User            1──* EmailVerificationToken
User            1──* PasswordResetToken
User            0..* AuditLog
```

---

## Model Catalog

### 1. User & Authentication

#### `User`

Central identity entity. Every actor in the system (admin, teacher, student, examiner) is a `User` first.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `email` | `String` | `@unique`, indexed | Login credential, case-sensitive lookup |
| `passwordHash` | `String` | required | bcrypt/argon2 hash of user password |
| `name` | `String?` | nullable | Display name |
| `phone` | `String?` | nullable | Contact number |
| `avatar` | `String?` | nullable | URL to avatar image |
| `emailVerified` | `Boolean` | default `false` | Email verification status |
| `isActive` | `Boolean` | default `true`, indexed | Soft-disable flag |
| `createdAt` | `DateTime` | auto | Account creation timestamp |
| `updatedAt` | `DateTime` | auto | Last modification timestamp |

**Relations (outgoing):** `roles`, `permissions`, `studentProfile`, `teacherProfile`, `examinerProfile`, `auditLogs`, `notifications`, `paymentsCreated`, `emailTokens`, `passwordTokens`, `userNotifications`

---

#### `Role`

RBAC role definitions. Seed data defines five roles:

| Name | Description |
|------|-------------|
| `SUPER_ADMIN` | Full system access |
| `ADMIN` | Management access |
| `TEACHER` | Can refer students |
| `STUDENT` | Competition participant |
| `EXAMINER` | Essay evaluator |

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `name` | `String` | `@unique` | Role slug (e.g. `SUPER_ADMIN`) |
| `description` | `String?` | nullable | Human-readable description |
| `createdAt` | `DateTime` | auto | Creation timestamp |

---

#### `UserRole`

Junction table implementing many-to-many User-Role relationship.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, indexed | Reference to user |
| `roleId` | `String` | FK→Role | Reference to role |
| `assignedAt` | `DateTime` | auto | When the role was assigned |

**Constraints:** `@@unique([userId, roleId])` — a user cannot hold the same role twice.  
**Cascade:** Both FKs cascade on delete.

---

#### `AdminPermission`

Fine-grained permission grants for admin-level users. Complements the role system for granular access control.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, indexed | Admin user |
| `permission` | `String` | required | Permission key (e.g. `payments.manage`) |
| `grantedAt` | `DateTime` | auto | Grant timestamp |

**Constraints:** `@@unique([userId, permission])` — no duplicate permission grants.

---

### 2. Profiles

Role-specific profile data linked 1:1 to `User`. Each profile type is optional — a user only has a profile row for their active role(s).

#### `StudentProfile`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, `@unique`, cascade | Owner user |
| `dateOfBirth` | `DateTime` | required, indexed | For age eligibility checks |
| `gender` | `String?` | nullable | Student gender |
| `address` | `String?` | nullable | Home address |
| `schoolName` | `String` | required, indexed | School affiliation |
| `schoolAddress` | `String?` | nullable | School address |
| `board` | `String?` | nullable | Education board (CBSE, ICSE, etc.) |
| `classGrade` | `String?` | nullable | Class/grade level |
| `section` | `String?` | nullable | Section within grade |
| `rollNumber` | `String?` | nullable | School roll number |
| `studentId` | `String?` | nullable | School-issued student ID |
| `guardianName` | `String?` | nullable | Parent/guardian name |
| `guardianRelation` | `String?` | nullable | Relationship to guardian |
| `guardianPhone` | `String?` | nullable | Guardian contact |
| `guardianEmail` | `String?` | nullable | Guardian email |
| `referredByTeacherId` | `String?` | FK→TeacherProfile, indexed | Referring teacher |
| `createdAt` | `DateTime` | auto | Profile creation |
| `updatedAt` | `DateTime` | auto | Last update |

---

#### `TeacherProfile`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, `@unique`, cascade | Owner user |
| `schoolName` | `String` | required | Employing school |
| `schoolAddress` | `String?` | nullable | School address |
| `designation` | `String?` | nullable | Job title |
| `employeeId` | `String?` | nullable | School employee ID |
| `address` | `String?` | nullable | Personal address |
| `createdAt` | `DateTime` | auto | Profile creation |
| `updatedAt` | `DateTime` | auto | Last update |

**Note:** Teachers can have many `StudentProfile` records linked via `referredByTeacherId`.

---

#### `ExaminerProfile`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, `@unique`, cascade | Owner user |
| `specialization` | `String?` | nullable | Subject area expertise |
| `qualification` | `String?` | nullable | Academic qualification |
| `isActive` | `Boolean` | default `true`, indexed | Can be assigned new essays |
| `createdAt` | `DateTime` | auto | Profile creation |
| `updatedAt` | `DateTime` | auto | Last update |

---

### 3. Competition Management

#### `Competition`

Core entity representing an essay competition event. Contains all scheduling, eligibility, and configuration metadata.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `name` | `String` | required | Competition title |
| `description` | `String?` | nullable | Detailed description |
| `academicYear` | `String?` | indexed | Academic year (e.g. `2025-26`) |
| `startDate` | `DateTime?` | nullable | Competition start |
| `registrationOpenDate` | `DateTime?` | nullable | Registration window opens |
| `registrationCloseDate` | `DateTime?` | nullable | Registration window closes |
| `submissionOpenDate` | `DateTime?` | nullable | Essay submission opens |
| `submissionCloseDate` | `DateTime?` | nullable | Essay submission deadline |
| `competitionDate` | `DateTime?` | nullable | Event date |
| `resultDeclarationDate` | `DateTime?` | nullable | When results go live |
| `minAge` | `Int` | required | Minimum age for eligibility |
| `maxAge` | `Int` | required | Maximum age for eligibility |
| `ageCalculationDate` | `DateTime` | required | Reference date for age calculation |
| `registrationFee` | `Float` | default `100` | Fee in INR |
| `maxEssayFileSize` | `Int` | default `5242880` | Max upload size in bytes |
| `allowedFileFormats` | `String` | default `"application/pdf"` | MIME types allowed |
| `maxFileSizeMB` | `Int` | default `5` | Human-readable file size limit |
| `status` | `String` | default `"DRAFT"`, indexed | Lifecycle state |
| `rules` | `String?` | nullable | Competition rules (rich text) |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

**Status Lifecycle:** `DRAFT` → `REGISTRATION_OPEN` → `REGISTRATION_CLOSED` → `SUBMISSION_OPEN` → `SUBMISSION_CLOSED` → `EVALUATION_IN_PROGRESS` → `RESULTS_PUBLISHED` → `ARCHIVED`

---

#### `CompetitionCategory`

Age-based or topic-based categories within a competition (e.g., "Junior (10-12 yrs)", "Senior (13-15 yrs)").

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `competitionId` | `String` | FK→Competition, cascade, indexed | Parent competition |
| `name` | `String` | required | Category name |
| `minAge` | `Int` | required | Min age for this category |
| `maxAge` | `Int` | required | Max age for this category |
| `description` | `String?` | nullable | Category description |
| `createdAt` | `DateTime` | auto | Creation timestamp |

**Constraints:** `@@unique([competitionId, name])` — no duplicate category names per competition.

---

#### `CompetitionExaminer`

Junction table assigning examiners to competitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `competitionId` | `String` | FK→Competition, cascade | Competition |
| `examinerId` | `String` | FK→ExaminerProfile, cascade | Examiner |
| `assignedAt` | `DateTime` | auto | Assignment timestamp |

**Constraints:** `@@unique([competitionId, examinerId])` — no duplicate assignments.

---

### 4. Registration & Payment

#### `Registration`

Links a student to a competition with a unique registration number.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `registrationNo` | `String` | `@unique`, indexed | Human-readable registration number |
| `studentId` | `String` | FK→StudentProfile, indexed | Student |
| `competitionId` | `String` | FK→Competition, indexed | Competition |
| `categoryId` | `String?` | FK→CompetitionCategory, nullable | Category (optional) |
| `status` | `String` | default `"PENDING"`, indexed | Registration state |
| `registeredAt` | `DateTime` | auto | Registration timestamp |
| `confirmedAt` | `DateTime?` | nullable | Payment confirmed at |
| `cancelledAt` | `DateTime?` | nullable | Cancellation timestamp |
| `cancelReason` | `String?` | nullable | Cancellation reason |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

**Status Lifecycle:** `PENDING` → `CONFIRMED` → `CANCELLED`

---

#### `Payment`

Razorpay payment tracking per registration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `registrationId` | `String` | FK→Registration, indexed | Associated registration |
| `razorpayOrderId` | `String` | `@unique`, indexed | Razorpay order ID |
| `razorpayPaymentId` | `String?` | `@unique`, indexed, nullable | Razorpay payment ID (set on capture) |
| `razorpaySignature` | `String?` | nullable | Webhook signature for verification |
| `amount` | `Float` | required | Payment amount |
| `currency` | `String` | default `"INR"` | ISO currency code |
| `status` | `String` | default `"CREATED"`, indexed | Payment state |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |
| `verifiedAt` | `DateTime?` | nullable | Signature verification timestamp |
| `createdById` | `String` | FK→User ("CreatedBy") | User who initiated payment |

**Status Lifecycle:** `CREATED` → `PAID` → `FAILED` / `REFUNDED`

---

#### `PaymentEvent`

Immutable audit log of payment state transitions from Razorpay webhooks.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `paymentId` | `String` | FK→Payment, cascade, indexed | Parent payment |
| `eventType` | `String` | required, indexed | Event type (e.g. `payment.captured`) |
| `eventData` | `String?` | nullable | Full webhook payload (JSON) |
| `ipAddress` | `String?` | nullable | Source IP |
| `userAgent` | `String?` | nullable | Client user agent |
| `createdAt` | `DateTime` | auto | Event timestamp |

---

### 5. Essay & Examination

#### `EssaySubmission`

One essay per registration. Stores Cloudinary file metadata and submission state.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `registrationId` | `String` | FK→Registration, `@unique` | Parent registration (1:1) |
| `studentId` | `String` | FK→StudentProfile, indexed | Student author |
| `competitionId` | `String` | FK→Competition, indexed | Competition |
| `cloudinaryId` | `String?` | nullable | Cloudinary public ID |
| `fileUrl` | `String?` | nullable | Cloudinary URL |
| `secureUrl` | `String?` | nullable | HTTPS Cloudinary URL |
| `fileName` | `String?` | nullable | Stored file name |
| `originalName` | `String?` | nullable | User's original file name |
| `fileSize` | `Int?` | nullable | File size in bytes |
| `mimeType` | `String?` | nullable | File MIME type |
| `fileHash` | `String?` | nullable, indexed | SHA-256 hash for plagiarism detection |
| `status` | `String` | default `"NOT_STARTED"`, indexed | Submission state |
| `submittedAt` | `DateTime?` | nullable | Upload timestamp |
| `validatedAt` | `DateTime?` | nullable | Admin validation timestamp |
| `validationNotes` | `String?` | nullable | Admin validation remarks |
| `createdAt` | `DateTime` | auto | Record creation |
| `updatedAt` | `DateTime` | auto | Last update |

**Status Lifecycle:** `NOT_STARTED` → `UPLOADED` → `VALIDATED` → `REJECTED`

---

#### `ExaminerAssignment`

Assigns an examiner to evaluate a specific essay. Multiple examiners can be assigned per essay (configured via `ScoringConfig.examinerCount`).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `essayId` | `String` | FK→EssaySubmission, cascade, indexed | Essay to evaluate |
| `examinerId` | `String` | FK→ExaminerProfile, cascade, indexed | Assigned examiner |
| `assignedBy` | `String?` | nullable | Admin user who assigned |
| `assignedAt` | `DateTime` | auto | Initial assignment timestamp |
| `status` | `String` | default `"ASSIGNED"`, indexed | Assignment state |
| `deadline` | `DateTime?` | nullable | Evaluation deadline |
| `reassignedAt` | `DateTime?` | nullable | Reassignment timestamp |
| `reassignedBy` | `String?` | nullable | Admin who reassigned |

**Constraints:** `@@unique([essayId, examinerId])` — no duplicate assignments.  
**Status Lifecycle:** `ASSIGNED` → `IN_PROGRESS` → `COMPLETED` → `REASSIGNED`

---

#### `EvaluationCriterion`

Rubric criteria defined per competition (e.g., "Content & Creativity", "Grammar & Language", "Structure & Organization").

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `competitionId` | `String` | FK→Competition, cascade, indexed | Competition |
| `name` | `String` | required | Criterion name |
| `description` | `String?` | nullable | Scoring guidelines |
| `maxMarks` | `Int` | required | Maximum score for this criterion |
| `sortOrder` | `Int` | default `0` | Display order |
| `createdAt` | `DateTime` | auto | Creation timestamp |

**Constraints:** `@@unique([competitionId, name])` — no duplicate criteria per competition.

---

#### `ExaminerEvaluation`

An examiner's complete evaluation of an essay, including per-criterion scores and overall comments.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `assignmentId` | `String` | FK→ExaminerAssignment, `@unique`, cascade | Parent assignment (1:1) |
| `essayId` | `String` | FK→EssaySubmission, indexed | Essay evaluated |
| `examinerId` | `String` | FK→ExaminerProfile, indexed | Evaluating examiner |
| `competitionId` | `String` | FK→Competition, indexed | Competition context |
| `totalMarks` | `Float?` | nullable | Computed total score |
| `justification` | `String?` | nullable | Score justification |
| `comments` | `String?` | nullable | General feedback |
| `ocrReferences` | `String?` | nullable | OCR extraction notes (JSON) |
| `status` | `String` | default `"ASSIGNED"`, indexed | Evaluation state |
| `submittedAt` | `DateTime?` | nullable | Submission timestamp |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

**Status Lifecycle:** `ASSIGNED` → `IN_PROGRESS` → `SUBMITTED`

---

#### `EvaluationScore`

Individual criterion score within an evaluation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `evaluationId` | `String` | FK→ExaminerEvaluation, cascade, indexed | Parent evaluation |
| `criterionId` | `String` | FK→EvaluationCriterion | Criterion being scored |
| `marks` | `Float` | required | Awarded marks |
| `comments` | `String?` | nullable | Criterion-specific feedback |

**Constraints:** `@@unique([evaluationId, criterionId])` — one score per criterion per evaluation.

---

### 6. Results & Scoring

#### `Result`

Aggregated result for an essay, computed from multiple examiner evaluations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `essayId` | `String` | FK→EssaySubmission, `@unique` | Essay (1:1) |
| `competitionId` | `String` | FK→Competition, indexed | Competition |
| `categoryId` | `String?` | FK→CompetitionCategory, indexed, nullable | Category for ranking |
| `studentId` | `String` | FK→StudentProfile, indexed | Student |
| `averageScore` | `Float?` | nullable | Mean of examiner scores |
| `finalScore` | `Float?` | nullable | Score after outlier handling |
| `rank` | `Int?` | nullable | Rank within category |
| `status` | `String` | default `"PENDING"`, indexed | Result state |
| `publishedAt` | `DateTime?` | nullable | When result was published |
| `calculatedAt` | `DateTime?` | nullable | When scores were calculated |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

**Status Lifecycle:** `PENDING` → `CALCULATED` → `PUBLISHED`

---

#### `ScoringConfig`

Competition-level scoring rules. One per competition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `competitionId` | `String` | FK→Competition, `@unique`, cascade | Competition (1:1) |
| `examinerCount` | `Int` | default `3` | Number of examiners per essay |
| `maxMarks` | `Int` | default `100` | Maximum total marks |
| `minMarks` | `Int` | default `0` | Minimum total marks |
| `averagingMethod` | `String` | default `"MEAN"` | `MEAN`, `MEDIAN`, `TRIMMED_MEAN` |
| `outlierHandling` | `Boolean` | default `false` | Enable IQR-based outlier removal |
| `blindEvaluation` | `Boolean` | default `true` | Hide student identity from examiners |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

---

### 7. Notifications

#### `Announcement`

Broadcast messages created by admins. Can target specific audiences or competitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `title` | `String` | required | Announcement title |
| `message` | `String` | required | Announcement body |
| `audience` | `String` | default `"ALL"`, indexed | `ALL`, `STUDENTS`, `TEACHERS`, `EXAMINERS` |
| `competitionId` | `String?` | FK→Competition, nullable | Scope to competition |
| `scheduledAt` | `DateTime?` | nullable | Scheduled publish time |
| `status` | `String` | default `"DRAFT"`, indexed | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `createdBy` | `String?` | nullable | Admin user ID (not FK) |
| `createdAt` | `DateTime` | auto | Creation timestamp |
| `updatedAt` | `DateTime` | auto | Last update |

---

#### `Notification`

Direct, user-specific notifications (e.g., "Your essay has been evaluated").

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, cascade, indexed | Recipient |
| `title` | `String` | required | Notification title |
| `message` | `String` | required | Notification body |
| `type` | `String` | default `"INFO"` | `INFO`, `SUCCESS`, `WARNING`, `ERROR` |
| `isRead` | `Boolean` | default `false`, indexed | Read status |
| `readAt` | `DateTime?` | nullable | When marked as read |
| `createdAt` | `DateTime` | auto, indexed | Notification timestamp |

---

#### `UserNotification`

Junction linking announcements to users for read-tracking.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, cascade, indexed | Recipient |
| `announcementId` | `String?` | FK→Announcement, nullable | Announcement |
| `isRead` | `Boolean` | default `false`, indexed | Read status |
| `readAt` | `DateTime?` | nullable | Read timestamp |
| `createdAt` | `DateTime` | auto | Creation timestamp |

---

### 8. System & Audit

#### `EmailVerificationToken`

Time-limited tokens for email verification.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, cascade, indexed | Token owner |
| `token` | `String` | `@unique`, indexed | Cryptographic token |
| `expiresAt` | `DateTime` | required | Expiration timestamp |
| `usedAt` | `DateTime?` | nullable | When token was consumed |
| `createdAt` | `DateTime` | auto | Token creation |

---

#### `PasswordResetToken`

Time-limited tokens for password reset flows.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String` | FK→User, cascade, indexed | Token owner |
| `token` | `String` | `@unique`, indexed | Cryptographic token |
| `expiresAt` | `DateTime` | required | Expiration timestamp |
| `usedAt` | `DateTime?` | nullable | When token was consumed |
| `createdAt` | `DateTime` | auto | Token creation |

---

#### `SystemSetting`

Key-value configuration store for platform settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `key` | `String` | `@unique` | Setting key |
| `value` | `String` | required | Setting value (serialized) |
| `category` | `String` | required, indexed | Setting group |
| `type` | `String` | default `"STRING"` | `STRING`, `NUMBER`, `BOOLEAN`, `JSON` |
| `updatedAt` | `DateTime` | auto | Last update |

---

#### `AuditLog`

Immutable audit trail for compliance and debugging. Records all significant state changes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, CUID | Unique identifier |
| `userId` | `String?` | FK→User (nullable), indexed | Acting user |
| `userRole` | `String?` | nullable | Role at time of action |
| `action` | `String` | required, indexed | Action identifier |
| `entityType` | `String?` | nullable, indexed | Entity type (e.g., `Competition`) |
| `entityId` | `String?` | nullable | Entity ID affected |
| `previousValue` | `String?` | nullable | Before state (JSON) |
| `newValue` | `String?` | nullable | After state (JSON) |
| `ipAddress` | `String?` | nullable | Client IP |
| `userAgent` | `String?` | nullable | Client user agent |
| `requestId` | `String?` | nullable | Request trace ID |
| `createdAt` | `DateTime` | auto, indexed | Log timestamp |

---

## Relationships Summary

### One-to-One

| From | To | Via | Notes |
|------|----|-----|-------|
| `StudentProfile` | `User` | `userId` | Profile-side `@unique` |
| `TeacherProfile` | `User` | `userId` | Profile-side `@unique` |
| `ExaminerProfile` | `User` | `userId` | Profile-side `@unique` |
| `EssaySubmission` | `Registration` | `registrationId` | Essay-side `@unique` |
| `ExaminerEvaluation` | `ExaminerAssignment` | `assignmentId` | Evaluation-side `@unique` |
| `Result` | `EssaySubmission` | `essayId` | Result-side `@unique` |
| `ScoringConfig` | `Competition` | `competitionId` | Config-side `@unique` |

### One-to-Many

| Parent | Child | FK Field | Cascade |
|--------|------|----------|--------|
| `User` | `UserRole` | `userId` | Yes |
| `Role` | `UserRole` | `roleId` | Yes |
| `User` | `AdminPermission` | `userId` | Yes |
| `User` | `Notification` | `userId` | Yes |
| `User` | `EmailVerificationToken` | `userId` | Yes |
| `User` | `PasswordResetToken` | `userId` | Yes |
| `User` | `UserNotification` | `userId` | Yes |
| `TeacherProfile` | `StudentProfile` | `referredByTeacherId` | No |
| `Competition` | `CompetitionCategory` | `competitionId` | Yes |
| `Competition` | `CompetitionExaminer` | `competitionId` | Yes |
| `Competition` | `Registration` | `competitionId` | No |
| `Competition` | `EssaySubmission` | `competitionId` | No |
| `Competition` | `EvaluationCriterion` | `competitionId` | Yes |
| `Competition` | `Announcement` | `competitionId` | No |
| `Competition` | `ExaminerEvaluation` | `competitionId` | No |
| `Competition` | `Result` | `competitionId` | No |
| `CompetitionCategory` | `Registration` | `categoryId` | No |
| `CompetitionCategory` | `Result` | `categoryId` | No |
| `StudentProfile` | `Registration` | `studentId` | No |
| `StudentProfile` | `EssaySubmission` | `studentId` | No |
| `StudentProfile` | `Result` | `studentId` | No |
| `Registration` | `Payment` | `registrationId` | No |
| `Registration` | `EssaySubmission` | `registrationId` | No |
| `Payment` | `PaymentEvent` | `paymentId` | Yes |
| `EssaySubmission` | `ExaminerAssignment` | `essayId` | Yes |
| `ExaminerEvaluation` | `EvaluationScore` | `evaluationId` | Yes |
| `EvaluationCriterion` | `EvaluationScore` | `criterionId` | No |
| `ExaminerProfile` | `ExaminerAssignment` | `examinerId` | Yes |
| `ExaminerProfile` | `ExaminerEvaluation` | `examinerId` | No |
| `ExaminerProfile` | `CompetitionExaminer` | `examinerId` | Yes |
| `Announcement` | `UserNotification` | `announcementId` | No |

### Many-to-Many (via Junction)

| Entity A | Entity B | Junction Table | Unique Constraint |
|----------|----------|---------------|-------------------|
| `User` | `Role` | `UserRole` | `[userId, roleId]` |
| `Competition` | `ExaminerProfile` | `CompetitionExaminer` | `[competitionId, examinerId]` |
| `EssaySubmission` | `ExaminerProfile` | `ExaminerAssignment` | `[essayId, examinerId]` |

---

## Indexing Strategy

### Primary Indexes (CUID PKs)

All 26 tables use CUID (`@id @default(cuid())`) as the primary key. CUIDs are:
- Globally unique (no central coordination needed)
- Time-sortable (monotonically increasing prefixes)
- URL-safe (no special characters)

### Unique Constraints (Implicit Unique Indexes)

| Table | Fields | Purpose |
|-------|--------|---------|
| `User` | `email` | Login lookup, uniqueness enforcement |
| `Role` | `name` | Role slug uniqueness |
| `StudentProfile` | `userId` | 1:1 with User |
| `TeacherProfile` | `userId` | 1:1 with User |
| `ExaminerProfile` | `userId` | 1:1 with User |
| `Registration` | `registrationNo` | Human-readable ID lookup |
| `Payment` | `razorpayOrderId` | Idempotency key for Razorpay |
| `Payment` | `razorpayPaymentId` | Payment resolution |
| `EssaySubmission` | `registrationId` | 1:1 with Registration |
| `ExaminerEvaluation` | `assignmentId` | 1:1 with Assignment |
| `Result` | `essayId` | 1:1 with EssaySubmission |
| `ScoringConfig` | `competitionId` | 1:1 with Competition |
| `EmailVerificationToken` | `token` | Token lookup |
| `PasswordResetToken` | `token` | Token lookup |
| `SystemSetting` | `key` | Configuration key uniqueness |

### Composite Unique Constraints

| Table | Fields | Purpose |
|-------|--------|---------|
| `UserRole` | `[userId, roleId]` | Prevent duplicate role assignments |
| `AdminPermission` | `[userId, permission]` | Prevent duplicate permission grants |
| `CompetitionCategory` | `[competitionId, name]` | No duplicate category names per competition |
| `CompetitionExaminer` | `[competitionId, examinerId]` | Prevent duplicate examiner assignments |
| `ExaminerAssignment` | `[essayId, examinerId]` | Prevent duplicate essay assignments |
| `EvaluationCriterion` | `[competitionId, name]` | No duplicate criteria per competition |
| `EvaluationScore` | `[evaluationId, criterionId]` | One score per criterion per evaluation |

### Explicit Non-Unique Indexes

| Table | Index Fields | Query Pattern |
|-------|-------------|---------------|
| `User` | `email` | Login, user lookup (redundant with `@unique`, explicit for clarity) |
| `User` | `isActive` | Filter active users in auth queries |
| `StudentProfile` | `dateOfBirth` | Age-based eligibility filtering |
| `StudentProfile` | `schoolName` | School-based queries, analytics |
| `StudentProfile` | `referredByTeacherId` | Teacher's student list |
| `ExaminerProfile` | `isActive` | Assignment eligibility filter |
| `Competition` | `status` | Filter competitions by lifecycle state |
| `Competition` | `academicYear` | Filter by academic year |
| `CompetitionCategory` | `competitionId` | Categories per competition |
| `Registration` | `studentId` | Student's registrations |
| `Registration` | `competitionId` | Competition's registrations |
| `Registration` | `status` | Filter by registration state |
| `Registration` | `registrationNo` | Lookup by registration number |
| `Payment` | `registrationId` | Payments for a registration |
| `Payment` | `status` | Filter by payment state |
| `Payment` | `razorpayOrderId` | Webhook lookup |
| `Payment` | `razorpayPaymentId` | Payment resolution |
| `PaymentEvent` | `paymentId` | Events for a payment |
| `PaymentEvent` | `eventType` | Filter by event type |
| `EssaySubmission` | `studentId` | Student's essays |
| `EssaySubmission` | `competitionId` | Competition's essays |
| `EssaySubmission` | `status` | Filter by submission state |
| `EssaySubmission` | `fileHash` | Plagiarism/duplicate detection |
| `ExaminerAssignment` | `examinerId` | Examiner's assignments |
| `ExaminerAssignment` | `status` | Filter by assignment state |
| `ExaminerAssignment` | `essayId` | Assignments for an essay |
| `EvaluationCriterion` | `competitionId` | Criteria per competition |
| `ExaminerEvaluation` | `essayId` | Evaluations for an essay |
| `ExaminerEvaluation` | `examinerId` | Evaluations by an examiner |
| `ExaminerEvaluation` | `status` | Filter by evaluation state |
| `EvaluationScore` | `evaluationId` | Scores for an evaluation |
| `Result` | `competitionId` | Results per competition |
| `Result` | `categoryId` | Results per category |
| `Result` | `studentId` | Student's results |
| `Result` | `status` | Filter by result state |
| `Announcement` | `status` | Filter by announcement state |
| `Announcement` | `audience` | Filter by target audience |
| `Notification` | `userId` | User's notifications |
| `Notification` | `isRead` | Unread notification count |
| `Notification` | `createdAt` | Chronological ordering |
| `UserNotification` | `userId` | User's announcement reads |
| `UserNotification` | `isRead` | Unread announcement count |
| `EmailVerificationToken` | `token` | Token verification lookup |
| `EmailVerificationToken` | `userId` | User's verification tokens |
| `PasswordResetToken` | `token` | Token verification lookup |
| `PasswordResetToken` | `userId` | User's reset tokens |
| `SystemSetting` | `category` | Settings by category |
| `AuditLog` | `userId` | User's audit trail |
| `AuditLog` | `action` | Filter by action type |
| `AuditLog` | `entityType` | Filter by entity type |
| `AuditLog` | `createdAt` | Time-range queries |
| `AdminPermission` | `userId` | User's permissions |

### Recommended PostgreSQL-Only Indexes (Future)

These composite indexes should be added for production PostgreSQL via raw SQL migrations:

```sql
-- Hot query: dashboard competition list filtered by status
CREATE INDEX idx_competition_status_academicYear ON "Competition" (status, "academicYear");

-- Hot query: registration count per competition per status
CREATE INDEX idx_registration_competition_status ON "Registration" ("competitionId", status);

-- Hot query: unread notifications for a user, ordered by time
CREATE INDEX idx_notification_user_unread ON "Notification" ("userId", "isRead", "createdAt" DESC);

-- Hot query: audit log time-range queries per entity
CREATE INDEX idx_audit_entity_created ON "AuditLog" ("entityType", "createdAt" DESC);

-- Hot query: essay submissions by competition + status
CREATE INDEX idx_essay_competition_status ON "EssaySubmission" ("competitionId", status);

-- Hot query: results ranking within a category
CREATE INDEX idx_result_category_score ON "Result" ("categoryId", "finalScore" DESC NULLS LAST);
```

---

## Data Integrity Constraints

### Foreign Key Constraints

| Relationship | On Delete | Rationale |
|-------------|-----------|-----------|
| `UserRole → User` | `CASCADE` | Roles are meaningless without user |
| `UserRole → Role` | `CASCADE` | Role deletion cleans up assignments |
| `AdminPermission → User` | `CASCADE` | Permissions tied to user lifecycle |
| Profile → `User` | `CASCADE` | Profile deleted with user account |
| `CompetitionCategory → Competition` | `CASCADE` | Categories belong to competition |
| `CompetitionExaminer → Competition` | `CASCADE` | Assignment tied to competition |
| `CompetitionExaminer → ExaminerProfile` | `CASCADE` | Assignment tied to examiner |
| `ExaminerAssignment → EssaySubmission` | `CASCADE` | Assignments tied to essay |
| `ExaminerAssignment → ExaminerProfile` | `CASCADE` | Assignments tied to examiner |
| `ExaminerEvaluation → ExaminerAssignment` | `CASCADE` | Evaluation tied to assignment |
| `ExaminerEvaluation → EssaySubmission` | **RESTRICT** (implicit) | Preserves essay evaluation history |
| `ExaminerEvaluation → ExaminerProfile` | **RESTRICT** (implicit) | Preserves examiner evaluation history |
| `ExaminerEvaluation → Competition` | **RESTRICT** (implicit) | Preserves competition evaluation history |
| `EvaluationScore → ExaminerEvaluation` | `CASCADE` | Scores tied to evaluation |
| `EvaluationScore → EvaluationCriterion` | **RESTRICT** (implicit) | Preserves criterion scoring history |
| `PaymentEvent → Payment` | `CASCADE` | Events tied to payment |
| `ScoringConfig → Competition` | `CASCADE` | Config tied to competition |
| `Notification → User` | `CASCADE` | Notifications cleaned with user |
| `UserNotification → User` | `CASCADE` | Read states cleaned with user |
| `EmailVerificationToken → User` | `CASCADE` | Tokens cleaned with user |
| `PasswordResetToken → User` | `CASCADE` | Tokens cleaned with user |
| `StudentProfile → TeacherProfile` | **RESTRICT** (implicit) | Preserves teacher referral records |
| `Registration → StudentProfile` | **RESTRICT** (implicit) | Preserves student registration history |
| `Registration → Competition` | **RESTRICT** (implicit) | Preserves competition registration records |
| `Payment → Registration` | **RESTRICT** (implicit) | Preserves payment records |
| `Payment → User (CreatedBy)` | **RESTRICT** (implicit) | Preserves payment creator reference |
| `EssaySubmission → Registration` | **RESTRICT** (implicit) | Preserves submission records |
| `EssaySubmission → StudentProfile` | **RESTRICT** (implicit) | Preserves student submission history |
| `EssaySubmission → Competition` | **RESTRICT** (implicit) | Preserves competition submission history |
| `Result → EssaySubmission` | **RESTRICT** (implicit) | Preserves result records |
| `Result → Competition` | **RESTRICT** (implicit) | Preserves competition results |
| `Result → CompetitionCategory` | **RESTRICT** (implicit) | Preserves category results |
| `Result → StudentProfile` | **RESTRICT** (implicit) | Preserves student results |
| `Announcement → Competition` | **RESTRICT** (implicit) | Preserves announcement records |
| `UserNotification → Announcement` | **RESTRICT** (implicit) | Preserves notification reads |
| `AuditLog → User` | **RESTRICT** (implicit, nullable) | Preserves audit trail even if user deleted |

### Application-Level Constraints

These constraints are enforced in application code, not at the database level:

1. **Status Enums:** All `status` fields use string literals. The application must validate against allowed values:
   - `Competition.status`: `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `SUBMISSION_OPEN`, `SUBMISSION_CLOSED`, `EVALUATION_IN_PROGRESS`, `RESULTS_PUBLISHED`, `ARCHIVED`
   - `Registration.status`: `PENDING`, `CONFIRMED`, `CANCELLED`
   - `Payment.status`: `CREATED`, `PAID`, `FAILED`, `REFUNDED`
   - `EssaySubmission.status`: `NOT_STARTED`, `UPLOADED`, `VALIDATED`, `REJECTED`
   - `ExaminerAssignment.status`: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `REASSIGNED`
   - `ExaminerEvaluation.status`: `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`
   - `Result.status`: `PENDING`, `CALCULATED`, `PUBLISHED`
   - `Announcement.status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
   - `ScoringConfig.averagingMethod`: `MEAN`, `MEDIAN`, `TRIMMED_MEAN`

2. **Age Validation:** `Competition.minAge < maxAge` and category age ranges must fall within competition age range.

3. **File Size Consistency:** `Competition.maxEssayFileSize` should equal `Competition.maxFileSizeMB * 1024 * 1024`.

4. **Score Bounds:** `EvaluationScore.marks` must be `>= 0` and `<= EvaluationCriterion.maxMarks`.

5. **Deadline Ordering:** Competition date fields must follow logical chronology (registration opens before closes, submission opens before closes, etc.).

---

## Migration Strategy (SQLite to PostgreSQL)

### Overview

NexusBoard uses **SQLite** for local development and **Neon PostgreSQL** for production. Prisma abstracts most differences, but several SQLite-specific behaviors require attention during migration.

### Prisma Schema Configuration

The `prisma/schema.prisma` datasource is configured for SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

For production, switch to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Migration Checklist

#### 1. Schema Changes Required

| Aspect | SQLite (Dev) | PostgreSQL (Prod) | Action Required |
|--------|-------------|-------------------|-----------------|
| Boolean | `0`/`1` integers | Native `BOOLEAN` | Prisma handles automatically |
| DateTime | Text (ISO 8601) | Native `TIMESTAMP` | Prisma handles automatically |
| Float | 8-byte IEEE float | `DOUBLE PRECISION` | Prisma handles automatically |
| String | `TEXT` (length ignored) | `TEXT` or `VARCHAR(n)` | No action needed (using `String` without length) |
| Auto-increment | `AUTOINCREMENT` | `SERIAL`/`BIGSERIAL` | N/A (using CUID, not auto-increment) |
| Foreign Keys | Enforced (pragma) | Enforced by default | No action needed |
| CASCADE | Supported | Supported | No action needed |
| JSON | Not native | Native `JSONB` | Consider using `Json` type for audit data in future |

#### 2. Data Type Migration

Current schema uses `String` for JSON-serializable fields. For PostgreSQL, consider migrating these to native `Json` type:

```prisma
// Current (SQLite-compatible)
previousValue  String?
newValue       String?
eventData     String?
ocrReferences  String?
rules          String?
allowedFileFormats String

// Future (PostgreSQL-only)
previousValue  Json?
newValue       Json?
eventData     Json?
ocrReferences  Json?
rules          Json?
allowedFileFormats Json  // or keep as String for simple MIME lists
```

#### 3. Enum Migration

Currently all status fields use `String`. For PostgreSQL, consider Prisma enums:

```prisma
enum CompetitionStatus {
  DRAFT
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  SUBMISSION_OPEN
  SUBMISSION_CLOSED
  EVALUATION_IN_PROGRESS
  RESULTS_PUBLISHED
  ARCHIVED
}

model Competition {
  status CompetitionStatus @default(DRAFT)
  // ...
}
```

> **Note:** This is a breaking schema change. Plan for a dedicated migration with data backfill.

#### 4. Migration Workflow

```bash
# 1. Ensure all dev migrations are up to date
npx prisma migrate dev

# 2. Generate the Prisma client for the current schema
npx prisma generate

# 3. Switch datasource to postgresql in schema.prisma

# 4. Create a baseline migration for production
npx prisma migrate dev --name init_postgresql

# 5. Deploy to Neon PostgreSQL
npx prisma migrate deploy

# 6. Seed production data (roles, admin user, system settings)
npx prisma db seed
```

#### 5. Neon PostgreSQL-Specific Setup

```bash
# Install Neon serverless driver (recommended for edge/serverless)
npm install @neondatabase/serverless

# Connection string format
DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"
```

#### 6. Seed Data Strategy

Production seeding should be idempotent and separate from dev seed data:

- **Production seed:** Roles, super admin user, system settings, default scoring config
- **Dev seed:** Demo competitions, sample students, test examiners, mock payments

Use the existing `prisma/seed.ts` with environment-aware branching:

```typescript
if (process.env.NODE_ENV === 'production') {
  await seedProductionData(db);
} else {
  await seedDevelopmentData(db);
}
```

#### 7. Data Migration (SQLite → PostgreSQL)

For migrating existing SQLite data to PostgreSQL:

```bash
# 1. Export SQLite data
sqlite3 prisma/db/custom.db .dump > sqlite_dump.sql

# 2. Use pgloader or a custom script to transform and import
# pgloader handles type conversion automatically:
pgloader sqlite://prisma/db/custom.db postgresql://user:pass@host/dbname

# 3. Or use Prisma-based export/import:
# - Read all records from SQLite via Prisma
# - Write all records to PostgreSQL via Prisma
# - Handle foreign key ordering (parents before children)
```

#### 8. Rollback Strategy

- All Prisma migrations are version-controlled in `prisma/migrations/`
- Use `npx prisma migrate rollback` for single-step rollbacks
- For catastrophic failure, Neon supports point-in-time recovery (PITR)
- Always backup before migration: `pg_dump $DATABASE_URL > backup.sql`

### Known SQLite vs PostgreSQL Differences

| Feature | SQLite | PostgreSQL | Impact |
|---------|--------|------------|--------|
| `DateTime` comparison | String comparison (works for ISO 8601) | Native timestamp comparison | None (ISO format compatible) |
| `LIKE` | Case-insensitive by default | Case-sensitive by default | Use `ILIKE` in Postgres or Prisma `contains` mode |
| `GROUP BY` | Allows non-aggregated columns | Strict (all non-aggregated must be in GROUP BY) | Review raw SQL queries |
| `ALTER TABLE` | Limited (no drop column in older SQLite) | Full support | No impact (Prisma creates new tables for schema changes) |
| Concurrent writes | Single writer | MVCC, many writers | Better production concurrency |
| Connection pooling | N/A (embedded) | Required (Neon uses pgBouncer) | Use `@neondatabase/serverless` or connection pooler URL |

---

## Performance Considerations

### Query Optimization

#### Hot Paths

| Query Path | Frequency | Optimization Strategy |
|------------|-----------|---------------------|
| User login (`User.findUnique` by email) | Every auth request | Covered by `@unique` on `email` |
| Student dashboard (registrations, essays, results) | Every page load | Batch with `include` for single round-trip |
| Admin competition list (filtered by status) | Dashboard loads | Indexed on `status` and `academicYear` |
| Examiner assignment list | Workspace loads | Indexed on `examinerId` and `status` |
| Unread notification count | Header on every page | Indexed on `userId` + `isRead` |
| Razorpay webhook lookup | On payment callback | `@unique` on `razorpayOrderId` and `razorpayPaymentId` |

#### N+1 Prevention

Use Prisma `include` for eager loading:

```typescript
// Good: Single query with joins
const registrations = await db.registration.findMany({
  where: { studentId },
  include: {
    competition: { select: { name: true, status: true } },
    category: { select: { name: true } },
    payments: { where: { status: 'PAID' }, select: { amount: true } },
    essays: { select: { status: true, submittedAt: true } },
  },
});

// Bad: N+1 queries
const registrations = await db.registration.findMany({ where: { studentId } });
for (const r of registrations) {
  const comp = await db.competition.findUnique({ where: { id: r.competitionId } });
}
```

### Connection Management

```typescript
// Current: Prisma singleton with query logging (dev)
export const db = new PrismaClient({ log: ['query'] });

// Production: Disable query logging, use connection pooling
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
});
```

For Neon PostgreSQL with serverless:

```typescript
import { neon } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const sql = neon(process.env.DATABASE_URL!);
const adapter = new PrismaNeon(sql);
export const db = new PrismaClient({ adapter });
```

### Table Growth Estimates

| Table | Growth Rate | 1 Year Estimate | Archival Strategy |
|-------|-------------|-----------------|-------------------|
| `User` | ~500/month | 6,000 | Never archive |
| `Registration` | ~400/month | 4,800 | Archive after 2 years |
| `Payment` | ~400/month | 4,800 | Never archive (financial) |
| `PaymentEvent` | ~800/month | 9,600 | Archive after 1 year |
| `EssaySubmission` | ~400/month | 4,800 | Archive after 2 years |
| `ExaminerEvaluation` | ~1,200/month | 14,400 | Archive after 2 years |
| `EvaluationScore` | ~3,600/month | 43,200 | Archive after 2 years |
| `Notification` | ~2,000/month | 24,000 | Purge read after 90 days |
| `AuditLog` | ~5,000/month | 60,000 | Archive after 1 year |
| `AdminPermission` | Rare | <50 | Never archive |

### Scaling Thresholds

| Metric | SQLite Limit | PostgreSQL (Neon) | Action at 80% |
|--------|-------------|-------------------|------------------|
| Database size | 280 TB (theoretical) | 500 GB (free tier) | Upgrade Neon plan or add storage |
| Concurrent connections | 1 writer | 20 (free tier) | Use connection pooling |
| Query performance | Degrades >1M rows | Linear with indexes | Add composite indexes |
| Write throughput | ~1K writes/sec | ~10K writes/sec | Batch writes, use transactions |

### Database-Level Optimizations

1. **Prisma Middleware for Soft Deletes:** Implement `isActive` filtering in middleware rather than per-query.

2. **Transaction Batching:** For result calculation (aggregating multiple evaluations), wrap in a transaction:

```typescript
await db.$transaction([
  db.result.update({ where: { id }, data: { averageScore, finalScore, status: 'CALCULATED' } }),
  db.essaySubmission.update({ where: { id: essayId }, data: { status: 'EVALUATED' } }),
]);
```

3. **Read Replicas:** Neon supports read replicas. Route analytics and dashboard queries to replicas.

4. **Full-Text Search:** For essay content search, consider PostgreSQL `pg_trgm` or external search (Meilisearch, Typesense) rather than `LIKE` queries.

5. **Plagiarism Detection:** The `fileHash` index on `EssaySubmission` enables O(1) duplicate detection within a competition.

6. **Notification Cleanup:** Implement a scheduled job to purge read notifications older than 90 days:

```typescript
await db.notification.deleteMany({
  where: { isRead: true, createdAt: { lt: ninetyDaysAgo } },
});
```

---

## Appendix: Full Schema Summary Statistics

- **Total Models:** 26
- **Total Relations:** 55
- **Unique Constraints (single):** 15
- **Unique Constraints (composite):** 7
- **Non-Unique Indexes:** 46
- **Cascade Deletes:** 16
- **Nullable Foreign Keys:** 6 (`categoryId` in Registration, `categoryId` in Result, `competitionId` in Announcement, `announcementId` in UserNotification, `userId` in AuditLog, `referredByTeacherId` in StudentProfile)
