# NexusBoard - Examination Process

> **Version:** 1.0.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Examiner Assignment](#2-examiner-assignment)
3. [Blind Evaluation](#3-blind-evaluation)
4. [Rubric & Scoring](#4-rubric--scoring)
5. [Score Calculation Methods](#5-score-calculation-methods)
6. [Result Publication](#6-result-publication)
7. [State Machine](#7-state-machine)

---

## 1. Overview

The examination process manages how examiners evaluate student essays and how final scores are calculated.

### Key Entities

```
Competition ──> EssaySubmission ──> ExaminerAssignment ──> ExaminerEvaluation ──> EvaluationScore
                                        │                         │                    │
                                   ExaminerProfile          ScoringConfig      EvaluationCriterion
```

---

## 2. Examiner Assignment

### Assignment Flow

1. Admin navigates to **Examination** view
2. Selects a competition
3. Views list of submitted essays
4. For each essay, assigns N examiners (configured via `ScoringConfig`)
5. Each assignment creates an `ExaminerAssignment` record

### Assignment States

```
ASSIGNED --> IN_PROGRESS --> COMPLETED
```

---

## 3. Blind Evaluation

When `ScoringConfig.blindEvaluation` is `true`:

- Examiners **cannot see** the student's name, school, or any identifying information
- Only the essay content (PDF from Cloudinary) is accessible
- This prevents bias in scoring

When `blindEvaluation` is `false`:

- Examiners can see student profile information
- Useful for internal competitions or non-anonymous evaluations

---

## 4. Rubric & Scoring

### Evaluation Criteria

Each competition has configurable evaluation criteria, e.g.:

| Criterion | Max Marks | Description |
|---|---|---|
| Content | 20 | Relevance, depth, originality of ideas |
| Organization | 15 | Structure, logical flow, coherence |
| Language | 15 | Grammar, vocabulary, sentence structure |
| Creativity | 20 | Originality, imagination, unique perspective |
| Grammar | 15 | Spelling, punctuation, syntax |
| Overall Impact | 15 | Overall impression and effectiveness |
| **Total** | **100** | |

### Scoring Interface

Each examiner scores each criterion independently:

```
Essay: "Climate Change and My Community"
├── Criterion 1: Content       [___/20]
├── Criterion 2: Organization  [___/15]
├── Criterion 3: Language      [___/15]
├── Criterion 4: Creativity    [___/20]
├── Criterion 5: Grammar       [___/15]
├── Criterion 6: Overall Impact [___/15]
└── Justification: [______________]
```

---

## 5. Score Calculation Methods

### MEAN (Default)

```
Final Score = (Examiner1_Total + Examiner2_Total + Examiner3_Total) / N
```

### MEDIAN

```
Scores sorted: [72, 78, 85]
Final Score = 78 (middle value)
```

### TRIMMED_MEAN

```
Scores sorted: [72, 78, 85]
Remove highest (85) and lowest (72)
Final Score = 78
```

### Outlier Handling

When `ScoringConfig.outlierHandling` is `true`:

- Scores beyond 2 standard deviations from the mean are flagged
- Flagged scores can be reviewed by admins
- Does not automatically exclude outliers

---

## 6. Result Publication

### Calculation Process

1. All examiners must submit their evaluations
2. Admin triggers "Calculate Results" from the Results view
3. System calculates final scores using the configured method
4. Students are ranked within each category
5. Admin reviews and publishes results

### Result States

```
PENDING --> CALCULATED --> PUBLISHED
```

---

## 7. State Machine

### Evaluation Status Flow

```
ASSIGNED ──> IN_PROGRESS ──> SUBMITTED ──> LOCKED
```

### Complete Competition Flow

```
Essay Submitted
    │
    ▼
Assign Examiners (N per essay)
    │
    ▼
Examiners Evaluate (blind or open)
    │
    ▼
All Evaluations Submitted
    │
    ▼
Calculate Final Scores
    │
    ▼
Rank Within Categories
    │
    ▼
Admin Reviews
    │
    ▼
Publish Results
```

---

*For the full API reference, see the main [README.md](../README.md).*
