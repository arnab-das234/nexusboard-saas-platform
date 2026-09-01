# Examination System Documentation

> Essay Writing Competition Management System — Examination & Evaluation Module
> Version: 0.2.1 | Last Updated: 2025

---

## Table of Contents

1. [Examination Workflow Overview](#examination-workflow-overview)
2. [Examiner Management](#examiner-management)
3. [Essay Assignment](#essay-assignment)
4. [Examiner Workspace UI](#examiner-workspace-ui)
5. [Evaluation Form](#evaluation-form)
6. [Blind Evaluation](#blind-evaluation)
7. [Multiple Examiner Evaluation](#multiple-examiner-evaluation)
8. [Score Calculation](#score-calculation)
9. [Result Generation](#result-generation)
10. [Result Publication](#result-publication)
11. [Admin Overrides](#admin-overrides)

---

## Examination Workflow Overview

The examination system manages the complete lifecycle from essay submission through evaluation to result publication. It supports multiple examiners per essay, blind evaluation, and configurable scoring methods.

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXAMINATION WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌───────────────┐    ┌──────────────────────┐              │
│  │  Admin   │    │   Student     │    │      Examiner        │              │
│  │Creates   │───>│ Submits Essay │───>│  Evaluates Essay    │              │
│  │Competition│   │ (PDF upload)  │    │  (criteria scoring)  │              │
│  └────┬─────┘    └───────────────┘    └──────────┬───────────┘              │
│       │                                            │                          │
│       │    ┌──────────────────┐                    │                          │
│       └───>│ Assigns Examiners │<───────────────────┘                          │
│            │ to Essays        │                                               │
│            └────────┬─────────┘                                               │
│                     │                                                         │
│                     ▼                                                         │
│            ┌──────────────────┐                                               │
│            │  System Calculates│                                              │
│            │  Average Scores  │                                               │
│            │  & Ranks         │                                               │
│            └────────┬─────────┘                                               │
│                     │                                                         │
│                     ▼                                                         │
│            ┌──────────────────┐    ┌──────────────────┐                       │
│            │  Admin Publishes │───>│  Student Views   │                       │
│            │  Results         │    │  Results         │                       │
│            └──────────────────┘    └──────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Process

| Step | Actor | Action | Data Change |
|------|-------|--------|-------------|
| 1 | Admin | Create competition with categories and evaluation criteria | `Competition`, `CompetitionCategory`, `EvaluationCriterion` |
| 2 | Admin | Configure scoring (examiner count, averaging method, blind evaluation) | `ScoringConfig` |
| 3 | Student | Register and pay for competition | `Registration` → `PAID` |
| 4 | Student | Upload essay PDF | `EssaySubmission` → `SUBMITTED` → `LOCKED` |
| 5 | Admin | Assign examiners to competition | `CompetitionExaminer` |
| 6 | Admin | Assign examiners to individual essays | `ExaminerAssignment` |
| 7 | Examiner | Open workspace, view essay, score criteria | `ExaminerEvaluation` → `SUBMITTED` |
| 8 | System | Calculate average scores and ranks (when all evaluations complete) | `Result` |
| 9 | Admin | Publish results | `Result.status` → `PUBLISHED` |
| 10 | Student | View published results | Read-only access to `Result` |

### Data Model Overview

```
Competition
├── CompetitionCategory[]          (age-based categories for ranking)
├── EvaluationCriterion[]          (scoring rubric: name + maxMarks)
├── ScoringConfig                  (evaluation configuration)
├── CompetitionExaminer[]          (examiners assigned to this competition)
├── EssaySubmission[]
│   ├── ExaminerAssignment[]       (which examiners evaluate this essay)
│   │   └── ExaminerEvaluation?    (the evaluation record)
│   │       └── EvaluationScore[]  (per-criterion scores)
│   └── Result?                    (final calculated result)
└── ExaminerEvaluation[]           (all evaluations for this competition)
```

---

## Examiner Management

### Creating Examiner Accounts

Examiners are created by administrators through the Admin → Examiners view (`admin-examiners`). Each examiner has:

- A **User** account with email, password, name, and the `EXAMINER` role.
- An **ExaminerProfile** with specialization, qualification, and active status.

```prisma
model ExaminerProfile {
  id             String   @id @default(cuid())
  userId         String   @unique
  specialization String?
  qualification  String?
  isActive       Boolean  @default(true)
}
```

### Required Permissions

| Action | Permission | Role |
|--------|-----------|------|
| Create examiner | `EXAMINER_MANAGE` | SUPER_ADMIN, ADMIN |
| Deactivate examiner | `EXAMINER_MANAGE` | SUPER_ADMIN, ADMIN |
| Assign to competition | `EXAM_ASSIGN` | SUPER_ADMIN, ADMIN |

### Activating / Deactivating Examiners

An examiner's `isActive` flag controls whether they can:

- **Active (`true`)**: Appear in the examiner assignment dropdown, log in, access the workspace.
- **Inactive (`false`)**: Cannot log in, hidden from assignment lists, existing evaluations remain intact.

> Deactivating an examiner does **not** delete their evaluations or assignments. Past evaluations are preserved for result integrity.

### Assigning Examiners to Competitions

Before examiners can evaluate essays, they must be assigned to the competition via `CompetitionExaminer`:

```prisma
model CompetitionExaminer {
  id             String   @id @default(cuid())
  competitionId  String
  examinerId     String
  assignedAt     DateTime @default(now())

  @@unique([competitionId, examinerId])  // Prevent duplicate assignment
}
```

This is a **prerequisite** — only examiners linked to a competition can be assigned to essays within that competition.

---

## Essay Assignment

### Assignment Interface

The admin assigns examiners to essays via the **Admin → Examination** view (`admin-examination`). For each submitted essay, the admin can:

1. View the essay details (student name, competition, category, file).
2. See currently assigned examiners and their evaluation status.
3. Add additional examiners (from those linked to the competition).
4. View evaluation scores for completed evaluations.

### Assignment Record

```prisma
model ExaminerAssignment {
  id            String    @id @default(cuid())
  essayId       String
  examinerId    String
  assignedBy    String?   // Admin user ID
  assignedAt    DateTime  @default(now())
  status        String    @default("ASSIGNED")  // ASSIGNED
  deadline      DateTime?
  reassignedAt  DateTime?
  reassignedBy  String?

  @@unique([essayId, examinerId])  // Prevent double assignment
}
```

### Preventing Double Assignment

The `@@unique([essayId, examinerId])` constraint ensures that:

- The same examiner cannot be assigned to the same essay twice.
- Attempting a duplicate assignment raises a Prisma unique constraint error.
- This applies even if a previous assignment was reassigned.

### Workload Distribution Considerations

When assigning examiners, the admin should consider:

| Factor | Guidance |
|--------|----------|
| **Total assignments** | Check each examiner's current assignment count. Aim for even distribution. |
| **Specialization** | Match examiner expertise to essay topic/competition category when possible. |
| **Deadlines** | Set reasonable evaluation deadlines based on examiner workload. |
| **Reassignment** | If an examiner is slow or unavailable, reassign the essay to another. |
| **Minimum coverage** | Each essay should have at least `ScoringConfig.examinerCount` examiners. |

### Assignment Status

| Status | Description |
|--------|-------------|
| `ASSIGNED` | Examiner has been assigned but has not started evaluation. |
| `IN_PROGRESS` | Examiner has started the evaluation (evaluation record created). |
| `SUBMITTED` | Examiner has submitted their evaluation. |
| `LOCKED` | Evaluation is locked (admin override). |

> The assignment status is derived from the associated `ExaminerEvaluation.status` when present.

---

## Examiner Workspace UI

The examiner workspace is a full-screen, three-column layout accessible to users with the `EXAMINER` role via **Examiner → Evaluation Workspace** (`examiner-workspace`).

### Layout Structure

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Evaluation Workspace                                          [User ▼]  │
├──────────┬─────────────────────────────────┬──────────────────────────────┤
│  LEFT    │          MIDDLE                 │          RIGHT               │
│  PANEL   │          PANEL                  │          PANEL               │
│  (272px) │         (flex-1)                │          (384px)             │
│          │                                 │                              │
│  Essay   │     PDF Viewer                  │   Evaluation Form            │
│  List    │                                 │                              │
│          │  ┌─────────────────────────┐    │   Criteria 1: [___] / 20     │
│  ┌─────┐ │  │                         │    │   Criteria 2: [___] / 30     │
│  │ E-1 │ │  │    Essay PDF Content    │    │   Criteria 3: [___] / 25     │
│  │ ✓   │ │  │                         │    │   Criteria 4: [___] / 25     │
│  └─────┘ │  │    (zoomable, paginated) │    │   ─────────────────────      │
│  ┌─────┐ │  │                         │    │   Total: 85 / 100            │
│  │ E-2 │ │  │                         │    │   ─────────────────────      │
│  │ ⏳   │ │  │                         │    │   Justification:             │
│  └─────┘ │  └─────────────────────────┘    │   [textarea]                  │
│  ┌─────┐ │                                 │                              │
│  │ E-3 │ │  [< Prev]  Page 1 of 5  [Next >]│   Comments:                   │
│  │ ○   │ │                                 │   [textarea]                  │
│  └─────┘ │  [Zoom+][Zoom-][Max][Download]  │                              │
│          │                                 │   OCR Reference:              │
│  Search  │                                 │   [textarea]                  │
│  Filter  │                                 │                              │
└──────────┴─────────────────────────────────┴──────────────────────────────┘
│                              [ Save Draft ]  [ Submit Evaluation ]        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Left Panel: Essay List

- Displays all essays assigned to the logged-in examiner.
- Each essay item shows:
  - **Anonymized ID** (if blind evaluation is enabled) or student name.
  - **File name** and **file size**.
  - **Evaluation status** badge (ASSIGNED / IN_PROGRESS / SUBMITTED / LOCKED).
  - **Time since assignment** (e.g., "2h ago", "1d ago").
- **Search bar**: Filter essays by ID or name.
- **Status filter**: Dropdown to filter by evaluation status.
- Clicking an essay loads it in the PDF viewer and evaluation form.

### Middle Panel: PDF Viewer

- Displays the uploaded essay PDF.
- **Zoom controls**: Zoom in, zoom out, maximize to fullscreen.
- **Page navigation**: Previous/next page buttons with page counter.
- **Download**: Option to download the original PDF.
- Fallback: If no PDF is available, displays a placeholder with essay metadata.

### Right Panel: Evaluation Form

- Contains the full evaluation form (see [Evaluation Form](#evaluation-form) for details).
- Scrollable to accommodate many criteria.
- Sticky action buttons (Save Draft / Submit) at the bottom.

---

## Evaluation Form

### Criteria-Based Scoring

The evaluation form is dynamically generated from the `EvaluationCriterion` records linked to the competition:

```prisma
model EvaluationCriterion {
  id            String   @id @default(cuid())
  competitionId String
  name          String      // e.g., "Content & Ideas"
  description   String?
  maxMarks      Int         // e.g., 30
  sortOrder     Int      @default(0)

  @@unique([competitionId, name])
}
```

### Example Criteria Configuration

| Criterion | Max Marks | Description |
|-----------|-----------|-------------|
| Content & Ideas | 30 | Originality, depth of thought, relevance to topic |
| Organization & Structure | 25 | Logical flow, paragraph structure, introduction/conclusion |
| Language & Expression | 25 | Grammar, vocabulary, clarity, style |
| Critical Thinking | 20 | Analysis, argumentation, evidence usage |
| **Total** | **100** | |

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Per-criterion marks | `number` input | Yes | One input per criterion, range `0` to `maxMarks` |
| Per-criterion comments | `string` (optional) | No | Optional notes per criterion (stored in `EvaluationScore.comments`) |
| Justification | `textarea` | On submit | Overall justification for the score awarded |
| Comments | `textarea` | No | Additional feedback or remarks for the student |
| OCR References | `textarea` | No | Reference text from the essay (OCR or manual transcription) for audit purposes |

### Data Storage

Scores are stored in the `EvaluationScore` table with a unique constraint per evaluation-criterion pair:

```prisma
model EvaluationScore {
  id           String  @id @default(cuid())
  evaluationId String
  criterionId  String
  marks        Float
  comments     String?

  @@unique([evaluationId, criterionId])
}
```

The parent `ExaminerEvaluation` record holds the aggregate score and narrative fields:

```prisma
model ExaminerEvaluation {
  id              String   @id @default(cuid())
  assignmentId    String   @unique
  essayId         String
  examinerId      String
  competitionId   String
  totalMarks      Float?         // Sum of all criterion scores
  justification   String?       // Overall justification
  comments        String?       // Additional comments
  ocrReferences   String?       // OCR text reference
  status          String   @default("ASSIGNED")
  submittedAt     DateTime?
}
```

### Total Marks Calculation

The `totalMarks` is computed as the sum of all individual criterion scores:

```typescript
const totalMarks = scores.reduce((sum, s) => sum + s.marks, 0);
```

This is calculated client-side during form entry and stored on submission.

---

## Blind Evaluation

### Overview

Blind evaluation ensures that examiners evaluate essays without knowing the student's identity, preventing bias.

### Configuration

Blind evaluation is controlled by the `ScoringConfig.blindEvaluation` flag:

```prisma
model ScoringConfig {
  competitionId   String   @unique
  blindEvaluation Boolean  @default(true)  // Enabled by default
}
```

### How It Works

| Aspect | Blind Mode (`true`) | Non-Blind Mode (`false`) |
|--------|---------------------|--------------------------|
| Essay list item | Shows anonymized essay ID (e.g., "Essay #E-001") | Shows student name |
| PDF viewer | No student info displayed | Student name may appear on PDF |
| Evaluation form | No student identifying fields | Student name visible |
| Assignment list (admin) | Always shows student name (admin bypass) | Always shows student name |

### Implementation Details

1. When `blindEvaluation` is `true`, the examiner workspace API **excludes** `student` relation data from essay queries for the examiner role.
2. The essay is identified by its database ID or a generated anonymous ID.
3. The admin examination view always shows student names regardless of blind evaluation setting.
4. The PDF itself may contain student information — this is a known limitation. Administrators should instruct students to **not** include personal information on the essay pages.

---

## Multiple Examiner Evaluation

### Configuration

The `ScoringConfig.examinerCount` determines how many examiners evaluate each essay:

```prisma
model ScoringConfig {
  competitionId   String   @unique
  examinerCount   Int      @default(3)  // 3 examiners by default
  // ...
}
```

### How It Works

1. The admin assigns **N** examiners to each essay (where N = `examinerCount`).
2. Each examiner creates an **independent** `ExaminerEvaluation` record.
3. Evaluations are stored separately — examiners cannot see each other's scores.
4. The unique constraint `@@unique([essayId, examinerId])` on `ExaminerAssignment` ensures no examiner evaluates the same essay twice.

### Independent Evaluation Storage

```
Essay: "National Essay 2025 - ESS-001"
│
├── Examiner 1 (Dr. Smith)
│   └── ExaminerEvaluation { totalMarks: 82, status: SUBMITTED }
│       └── EvaluationScore[] [Content: 26, Structure: 21, Language: 22, Critical: 13]
│
├── Examiner 2 (Prof. Jones)
│   └── ExaminerEvaluation { totalMarks: 78, status: SUBMITTED }
│       └── EvaluationScore[] [Content: 24, Structure: 20, Language: 19, Critical: 15]
│
└── Examiner 3 (Dr. Patel)
    └── ExaminerEvaluation { totalMarks: 85, status: SUBMITTED }
        └── EvaluationScore[] [Content: 28, Structure: 22, Language: 20, Critical: 15]
```

### Ensuring Complete Coverage

The admin examination view should verify:

- Each essay has exactly `examinerCount` assignments.
- All assignments have been submitted before results are calculated.
- If an examiner is unresponsive, the admin can reassign the essay.

---

## Score Calculation

### Averaging Methods

The `ScoringConfig.averagingMethod` determines how multiple examiner scores are combined:

```prisma
model ScoringConfig {
  averagingMethod  String   @default("MEAN")  // MEAN | MEDIAN | TRIMMED_MEAN
  outlierHandling  Boolean  @default(false)
  // ...
}
```

### Method: MEAN (Default)

Simple arithmetic average of all examiner scores:

```typescript
// MEAN: Standard average
function calculateMean(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// Example: [82, 78, 85] → (82 + 78 + 85) / 3 = 81.67
```

### Method: MEDIAN

The middle value when scores are sorted:

```typescript
// MEDIAN: Middle value (resistant to outliers)
function calculateMedian(scores: number[]): number {
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Example: [78, 82, 85] → 82
// Example: [78, 82, 85, 88] → (82 + 85) / 2 = 83.5
```

### Method: TRIMMED_MEAN

Average after removing the highest and lowest scores:

```typescript
// TRIMMED_MEAN: Remove extremes, then average
function calculateTrimmedMean(scores: number[]): number {
  const sorted = [...scores].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1); // Remove first and last
  return trimmed.reduce((sum, s) => sum + s, 0) / trimmed.length;
}

// Example: [78, 82, 85] → trimmed: [82] → 82.0
// Example: [70, 78, 82, 85, 95] → trimmed: [78, 82, 85] → 81.67
```

> **Note**: For `TRIMMED_MEAN` to be meaningful, `examinerCount` should be at least 3 (preferably 5+). With only 2 examiners, trimmed mean equals the regular mean.

### Outlier Handling

When `ScoringConfig.outlierHandling` is `true`, the system applies additional outlier detection:

```typescript
// Outlier detection using IQR (Interquartile Range)
function detectOutliers(scores: number[]): number[] {
  const sorted = [...scores].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length / 4)];
  const q3 = sorted[Math.floor(3 * sorted.length / 4)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return scores.filter(s => s >= lower && s <= upper);
}
```

When outlier handling is enabled:
1. Detect outliers using the IQR method.
2. Exclude outlier scores from the averaging calculation.
3. Log the exclusion in the audit trail.
4. Flag the result for admin review if any scores were excluded.

### ScoringConfig Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `examinerCount` | `Int` | `3` | Number of examiners per essay |
| `maxMarks` | `Int` | `100` | Maximum possible total score |
| `minMarks` | `Int` | `0` | Minimum possible total score |
| `averagingMethod` | `String` | `"MEAN"` | `MEAN`, `MEDIAN`, or `TRIMMED_MEAN` |
| `outlierHandling` | `Boolean` | `false` | Whether to detect and exclude outlier scores |
| `blindEvaluation` | `Boolean` | `true` | Whether examiners see anonymized essays |

---

## Result Generation

### When Results Are Calculated

Results are generated when:

1. All `examinerCount` examiners have submitted their evaluations for an essay.
2. All evaluation statuses are `SUBMITTED`.
3. The admin triggers result calculation (or it runs automatically).

### Calculation Process

```
For each essay with all evaluations submitted:
│
├── 1. Collect totalMarks from each ExaminerEvaluation
│       scores = [82, 78, 85]
│
├── 2. Apply outlier handling (if enabled)
│       filtered = [82, 78, 85]  (no outliers)
│
├── 3. Calculate average using configured method
│       averageScore = MEAN([82, 78, 85]) = 81.67
│
├── 4. Store in Result record
│       averageScore: 81.67
│       finalScore: 81.67  (may be rounded/adjusted)
│
└── 5. Calculate rank within category
        Category A: [88, 85, 82, 81.67, 79]
        This essay rank: 4
```

### Result Record

```prisma
model Result {
  id              String   @id @default(cuid())
  essayId         String   @unique  // One result per essay
  competitionId   String
  categoryId      String?           // Category for ranking
  studentId       String
  averageScore    Float?           // Calculated average from evaluations
  finalScore      Float?           // May be adjusted by admin
  rank            Int?             // Rank within category
  status          String   @default("PENDING")
  publishedAt     DateTime?
  calculatedAt    DateTime?
}
```

### Rank Calculation

Ranks are calculated **within each category** (not across the entire competition):

1. Group results by `categoryId`.
2. Sort by `finalScore` descending (highest first).
3. Assign ranks: 1, 2, 3, ... (ties get the same rank).

```typescript
// Example ranking within Category A (ages 14-16)
// Score: 95 → Rank 1
// Score: 90 → Rank 2
// Score: 90 → Rank 2  (tie)
// Score: 85 → Rank 4
// Score: 81.67 → Rank 5
```

### Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Default. Not yet calculated or all evaluations not complete. |
| `CALCULATED` | Scores calculated and ranks assigned, awaiting admin review. |
| `PUBLISHED` | Results are live and visible to students. |

---

## Result Publication

### Admin Publishes Results

The admin publishes results through the **Admin → Results** view (`admin-results`):

1. Admin reviews calculated results (scores, ranks).
2. Admin can adjust `finalScore` if needed (with audit log).
3. Admin clicks **"Publish Results"** for the competition.
4. System updates all results for the competition:
   - `status` → `PUBLISHED`
   - `publishedAt` → current timestamp
5. Competition status changes to `RESULT_PUBLISHED`.

### Student View

After publication, students can view their results on the **Student → Results** page:

- Competition name and category.
- Their score (`finalScore`) and rank.
- Category-wise ranking table (if visible).
- No access to individual examiner scores or breakdowns.

### Notifications

When results are published:

- A system `Notification` is created for each student.
- An optional `Announcement` can be sent to all registered students.

---

## Admin Overrides

### Reopen Evaluation

If an evaluation was submitted with errors, the admin can:

1. Navigate to **Admin → Examination**.
2. Find the specific evaluation.
3. Click **"Reopen"** to set the evaluation status back to `IN_PROGRESS`.
4. The examiner can then access the essay again and resubmit.

**Requirements:**
- `RESULT_MANAGE` permission.
- Audit log entry created with action `EVALUATION_REOPEN`.
- Previous evaluation data is preserved until resubmission.

### Reassign Examiner

If an examiner is unavailable or biased:

1. Navigate to **Admin → Examination**.
2. Find the essay assignment.
3. Click **"Reassign"** and select a new examiner.
4. The old assignment is marked with `reassignedAt` and `reassignedBy`.
5. A new `ExaminerAssignment` is created for the new examiner.

**Requirements:**
- `EXAM_ASSIGN` permission.
- The new examiner must be linked to the competition via `CompetitionExaminer`.
- Audit log entry created with action `EXAMINER_REASSIGN`.

### Recalculate Results

If scores or averaging configuration changes:

1. Navigate to **Admin → Results**.
2. Click **"Recalculate"** for the competition.
3. System re-runs the score calculation and rank assignment.
4. If results are already published, the admin must unpublish first.

**Requirements:**
- `RESULT_MANAGE` permission.
- All evaluations must be in `SUBMITTED` status.
- Audit log entry created with action `RESULT_RECALCULATE`.

### Audit Trail for Overrides

All admin overrides are recorded in the `AuditLog` table:

| Action | Description |
|--------|-------------|
| `EVALUATION_REOPEN` | Evaluation status changed from SUBMITTED to IN_PROGRESS |
| `EXAMINER_REASSIGN` | Examiner reassigned to a different evaluator |
| `RESULT_RECALCULATE` | Results recalculated after changes |
| `SCORE_OVERRIDE` | Admin manually adjusted a finalScore |
| `RESULT_PUBLISH` | Results published for a competition |
| `RESULT_UNPUBLISH` | Published results retracted |

Each audit log entry includes:

- `userId`: The admin who performed the action.
- `previousValue`: The state before the change.
- `newValue`: The state after the change.
- `ipAddress` and `userAgent`: Request metadata.
- `requestId`: For tracing related operations.

---

## Permissions Summary

### Examination-Related Permissions

| Permission | Grants Access To |
|------------|-----------------|
| `EXAM_ASSIGN` | Assign/reassign examiners to essays, manage examiner assignments |
| `RESULT_VIEW` | View calculated results and rankings |
| `RESULT_MANAGE` | Publish/unpublish results, recalculate scores, reopen evaluations, override scores |
| `EXAMINER_MANAGE` | Create/deactivate examiner accounts, manage examiner profiles |
| `AUDIT_VIEW` | View examination-related audit logs |

### Role-Based Access

| Capability | SUPER_ADMIN | ADMIN | EXAMINER | STUDENT |
|-----------|:-----------:|:-----:|:--------:|:-------:|
| Create competition & criteria | ✅ | ✅ | ❌ | ❌ |
| Configure scoring | ✅ | ✅ | ❌ | ❌ |
| Assign examiners | ✅ | ✅ | ❌ | ❌ |
| Evaluate essays | ❌ | ❌ | ✅ | ❌ |
| View own evaluation | ❌ | ❌ | ✅ | ❌ |
| View all evaluations | ✅ | ✅ | ❌ | ❌ |
| Calculate results | ✅ | ✅ | ❌ | ❌ |
| Publish results | ✅ | ✅ | ❌ | ❌ |
| View published results | ✅ | ✅ | ❌ | ✅ |
| Reopen evaluation | ✅ | ✅ | ❌ | ❌ |
| Reassign examiner | ✅ | ✅ | ❌ | ❌ |
| Override scores | ✅ | ✅ | ❌ | ❌ |

---

*This document is part of the Essay Writing Competition Management System documentation set. See also: [DATABASE.md](./DATABASE.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PAYMENTS.md](./PAYMENTS.md), [SECURITY.md](./SECURITY.md).*
