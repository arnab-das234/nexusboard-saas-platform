# NexusBoard SaaS Platform

**Enterprise-Grade Essay Competition Management System**

Version 1.0.0 | Production-Ready | Vercel Deployable

<p align="center">
  <strong>NexusBoard</strong> is a full-stack, scalable SaaS platform that manages the complete lifecycle of essay writing competitions — from student registration and fee collection through multi-examiner blind evaluation to automated score calculation and result publication.
</p>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Seed Data](#seed-data)
  - [Running the Dev Server](#running-the-dev-server)
- [Project Structure](#project-structure)
- [Development Credentials](#development-credentials)
- [API Reference](#api-reference)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Competition Lifecycle](#competition-lifecycle)
- [Payment Flow](#payment-flow)
- [Essay Submission Flow](#essay-submission-flow)
- [Examination Flow](#examination-flow)
- [Environment Variables Reference](#environment-variables-reference)
- [Deployment on Vercel](#deployment-on-vercel)
- [External Services Setup](#external-services-setup)
- [Free Tier Considerations](#free-tier-considerations)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

NexusBoard manages every stage of an essay writing competition:

- **Administrators** create and configure competitions with categories, age groups, and evaluation criteria
- **Teachers** refer students and manage their profiles
- **Students** register for competitions, pay fees, and submit PDF essays
- **Examiners** evaluate essays blind using configurable rubrics with multiple criteria
- **Results** are automatically calculated with configurable averaging methods (mean, median, trimmed mean) and published per category

The application uses a single-page architecture with client-side routing via Zustand, meaning the entire UI is served from the `/` route and navigation is handled in the browser.

---

## Key Features

- **Multi-role user management** -- 5 distinct roles with granular permission system (14 named permissions)
- **Competition lifecycle management** -- Draft through Registration, Submission, Evaluation, Results, and Completion
- **Razorpay payment integration** -- Order creation, client-side checkout, signature verification, and webhook handling
- **Blind evaluation** -- Configurable per competition; examiners evaluate without seeing student identity
- **Multi-examiner scoring** -- Configurable N examiners per essay with MEAN, MEDIAN, or TRIMMED_MEAN averaging
- **Audit logging** -- Immutable audit trail for all critical operations with IP and user-agent tracking
- **Real-time notifications** -- In-app notification system for all user roles with read/unread tracking
- **Announcements** -- Targeted announcements by audience type and competition
- **Dashboard analytics** -- Role-specific dashboards with charts, trends, and KPIs
- **Teacher referral system** -- Teachers can register and refer students to competitions
- **Responsive design** -- Mobile-first design with shadcn/ui component library
- **Dark mode support** -- Full light/dark theme with next-themes
- **Type-safe** -- End-to-end TypeScript with Zod validation

---

## Architecture Overview

NexusBoard follows a layered, scalable architecture:

```
Browser (React SPA) --> Zustand (state) --> TanStack Query --> API Routes --> Prisma ORM --> Database
                                                                                    |
                                                                         Razorpay / Cloudinary / Resend
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  React   │  │ Zustand  │  │ TanStack     │  │  Framer Motion          │ │
│  │  Views   │  │  Store   │  │  Query       │  │  Animations             │ │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └─────────────────────────┘ │
│       └──────────────┴───────────────┘                                      │
│                          │ Fetch / POST                                     │
├──────────────────────────┼──────────────────────────────────────────────────┤
│                    API LAYER (Next.js Route Handlers)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  /auth   │  │ /users   │  │  /comp.. │  │  /pay..  │  │  /eval..     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       └──────────────┴────────────┴─────────────┴───────────────┘          │
│                          │                                                  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                                       │
│  ┌──────────────────────┴──────────────────────┐                           │
│  │            Prisma ORM                        │                           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │                           │
│  │  │ Models  │  │  Query  │  │ Transactions│  │                           │
│  │  └─────────┘  └─────────┘  └─────────────┘  │                           │
│  └──────────────────────┬──────────────────────┘                           │
│                          │                                                  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│                    DATABASE LAYER                                          │
│  ┌──────────────────────┴──────────────────────┐                           │
│  │  SQLite (Dev) / Neon PostgreSQL (Prod)       │                           │
│  └──────────────────────────────────────────────┘                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐    │
│  │  Razorpay    │  │  Cloudinary  │  │  Resend      │  │  NextAuth.js  │    │
│  │  (Payments)  │  │  (Storage)   │  │  (Email)     │  │  (Auth)       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| SPA with Zustand routing | Avoids full-page reloads, instant navigation, simpler deployment |
| 13 API route handlers | Clean separation between client and server logic |
| 28+ view components organized by role | Scalable — new roles/features add views without affecting others |
| 20+ Prisma models | Comprehensive data model covering the entire competition lifecycle |
| SQLite for dev, PostgreSQL for prod | Fast local development with production-grade database |
| Role-Based Access Control (RBAC) | 5 roles with 14 named permissions for fine-grained access control |
| Audit logging | Immutable audit trail for compliance and debugging |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (New York style) | Latest |
| Icons | Lucide React | Latest |
| State Management | Zustand | 5.x |
| Server State | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Database ORM | Prisma | 6.x |
| Database (dev) | SQLite | Built-in |
| Database (prod) | Neon PostgreSQL | Serverless |
| Authentication | NextAuth.js | 4.x |
| Payments | Razorpay | Latest |
| Email | Resend | Latest |
| File Storage | Cloudinary | Latest |
| Animations | Framer Motion | 12.x |
| Charts | Recharts | 2.x |
| Date Utilities | date-fns | 4.x |
| Runtime | Bun / Node.js | Latest |

---

## Quick Start

### Prerequisites

- **Bun** (v1.0+) -- [installation guide](https://bun.sh)
- **Node.js** (v18+) -- if not using Bun as the primary runtime
- A **Razorpay** account (for payment processing in production)
- A **Resend** account (for email delivery in production)
- A **Cloudinary** account (for file storage in production)

### Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in the required values. For local development, the only required change is to set `AUTH_SECRET`:

   ```bash
   # Generate a random secret
   openssl rand -base64 32
   ```

   The SQLite database URL is pre-configured. Razorpay, Resend, and Cloudinary credentials are only needed when using those features in production.

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate
```

### Database Setup

```bash
# Push the schema to the SQLite database
bun run db:push
```

### Seed Data

```bash
# Populate the database with test users, competitions, and demo data
bun run seed
```

### Running the Dev Server

```bash
bun run dev
```

The application runs on `http://localhost:3000`. Open it in your browser and log in using the [development credentials](#development-credentials).

---

## Project Structure

```
nexusboard-saas-platform/
├── prisma/
│   ├── schema.prisma          # Database schema (20+ models)
│   ├── seed.ts                # Seed script with demo data
│   └── db/
│       └── custom.db          # SQLite database file (dev only)
├── docs/
│   ├── ARCHITECTURE.md        # Architecture document
│   ├── DATABASE.md            # Database design document
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── EXAMINATION.md         # Examination process document
│   ├── PAYMENTS.md            # Payment integration document
│   └── SECURITY.md            # Security considerations
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Single entry point (SPA shell)
│   │   ├── globals.css        # Global styles
│   │   └── api/
│   │       ├── route.ts               # Health check
│   │       ├── auth/route.ts          # Authentication
│   │       ├── competitions/route.ts  # Competition CRUD
│   │       ├── registrations/route.ts # Registration management
│   │       ├── payments/route.ts      # Payment processing
│   │       ├── essays/route.ts        # Essay submission
│   │       ├── evaluations/route.ts   # Evaluation management
│   │       ├── examiners/route.ts     # Examiner management
│   │       ├── users/route.ts         # User management
│   │       ├── dashboard/route.ts     # Dashboard analytics
│   │       ├── announcements/route.ts # Announcement management
│   │       ├── notifications/route.ts # Notification management
│   │       ├── settings/route.ts      # System settings
│   │       └── audit/route.ts         # Audit log queries
│   ├── components/
│   │   ├── auth/               # Login and registration views (2)
│   │   ├── admin/              # Admin view components (13)
│   │   ├── student/            # Student view components (7)
│   │   ├── teacher/            # Teacher view components (5)
│   │   ├── examiner/           # Examiner view components (3)
│   │   ├── layout/             # App shell, sidebar, header (3)
│   │   ├── views/              # Shared view components (6)
│   │   └── ui/                 # 40+ shadcn/ui base components
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── store.ts           # Zustand global stores (auth, nav, app)
│   │   ├── constants.ts       # Enums, navigation config, state machines
│   │   ├── types.ts           # TypeScript type definitions
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.ts      # Mobile detection hook
│   │   └── use-toast.ts       # Toast notification hook
│   └── providers.tsx           # Client-side providers wrapper
├── public/
│   └── robots.txt              # Search engine directives
├── .env.example               # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind configuration
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
└── components.json             # shadcn/ui configuration
```

---

## Development Credentials

The seed script creates the following test users. Passwords match the email prefix.

| Role | Email | Password | Name |
|---|---|---|---|
| SUPER_ADMIN | admin@essaycomp.com | admin123 | System Administrator |
| ADMIN | ops@essaycomp.com | admin123 | Operations Admin |
| TEACHER | teacher@essaycomp.com | teacher123 | Dr. Sharma |
| TEACHER | teacher2@essaycomp.com | teacher123 | Ms. Gupta |
| STUDENT | student1@essaycomp.com | student123 | Arjun Patel |
| STUDENT | student2@essaycomp.com | student123 | Priya Sharma |
| STUDENT | student3@essaycomp.com | student123 | Rahul Kumar |
| STUDENT | student4@essaycomp.com | student123 | Ananya Singh |
| STUDENT | student5@essaycomp.com | student123 | Vikram Reddy |
| STUDENT | student6@essaycomp.com | student123 | Meera Nair |
| EXAMINER | examiner1@essaycomp.com | examiner123 | Prof. Verma |
| EXAMINER | examiner2@essaycomp.com | examiner123 | Dr. Iyer |
| EXAMINER | examiner3@essaycomp.com | examiner123 | Ms. Das |

The seed also creates:

- 1 active competition: "National Essay Writing Competition 2025" with 3 age-group categories
- 6 evaluation criteria (Content, Organization, Language, Creativity, Grammar, Overall Impact)
- 4 registrations across various statuses
- 2 essay submissions with different statuses
- 6 examiner assignments
- 13 system settings across 5 categories
- 3 announcements and 12+ notifications

---

## API Reference

All API routes are prefixed with `/api`. Authentication is via session cookie (set on login). Role-based access control is enforced on every endpoint.

| Route | Methods | Description |
|---|---|---|
| `/api/auth` | POST | Authentication: login (`?action=login`), register (`?action=register`), verify-email (`?action=verify-email`) |
| `/api/competitions` | GET, POST, PUT | List/create/update competitions. Query by `status`, `academicYear` |
| `/api/registrations` | GET, POST, PUT | List/create/update registrations. Supports status transitions |
| `/api/payments` | GET, POST | List payments (query by `status`, `competitionId`, `registrationId`); create Razorpay orders and verify signatures |
| `/api/essays` | GET, POST, PUT | List/create/update essay submissions. Handles Cloudinary upload and validation |
| `/api/evaluations` | GET, POST, PUT | List/create/update examiner evaluations. Query by `status`, `essayId`, `examinerId`, `competitionId` |
| `/api/examiners` | GET, POST, PUT | List/create/update examiners and their profiles |
| `/api/users` | GET, PUT, DELETE | List users (query by `role`, `search`); get current user (`?action=me`); toggle active status; soft delete |
| `/api/dashboard` | GET | Dashboard analytics: `?action=stats`, `?action=registration-trend`, `?action=recent-registrations` |
| `/api/announcements` | GET, POST, PUT | List/create/update announcements. Query by `status`, `audience`, `competitionId` |
| `/api/notifications` | GET, PUT | List notifications (query by `userId`, `action=unread-count`); mark as read; mark all as read |
| `/api/settings` | GET, PUT | Get settings by `category`; upsert settings |
| `/api/audit` | GET | Query audit logs. Filter by `userId`, `action`, `entityType`, `startDate`, `endDate`. Paginated |
| `/api` | GET | Health check endpoint |

---

## User Roles and Permissions

### Roles

| Role | Description |
|---|---|
| SUPER_ADMIN | Full system access. Can manage all users, settings, and audit logs. Single instance recommended. |
| ADMIN | Management access for competitions, users, payments, results, and announcements. |
| TEACHER | Can view their profile, manage referred students, and register new students. |
| STUDENT | Can register for competitions, pay fees, submit essays, and view results. |
| EXAMINER | Can view assigned essays, evaluate them using rubrics, and submit scores. |

### Named Permissions (granted to ADMIN role)

| Permission | Description |
|---|---|
| STUDENT_VIEW | View student profiles and listings |
| STUDENT_EDIT | Create and edit student profiles |
| TEACHER_VIEW | View teacher profiles and listings |
| TEACHER_EDIT | Create and edit teacher profiles |
| EXAMINER_MANAGE | Create, update, and deactivate examiners |
| COMPETITION_MANAGE | Create, update, and manage competitions |
| PAYMENT_VIEW | View payment records and transactions |
| PAYMENT_MANAGE | Process refunds and manage payment statuses |
| EXAM_ASSIGN | Assign examiners to essays |
| RESULT_VIEW | View results and score breakdowns |
| RESULT_MANAGE | Calculate, publish, and manage results |
| NOTIFICATION_MANAGE | Create and manage announcements |
| AUDIT_VIEW | Access the audit log |
| SETTINGS_MANAGE | Update system settings |
| ADMIN_MANAGE | Create and manage administrator accounts |

### Navigation by Role

- **SUPER_ADMIN / ADMIN**: Dashboard, Users (Students, Teachers, Examiners, Administrators), Competitions, Registrations, Finance, Essays, Examination, Results, Announcements, Audit Logs (SUPER_ADMIN only), Settings (SUPER_ADMIN only)
- **STUDENT**: Dashboard, Profile, Competitions, My Essay, Payment, Results, Notifications
- **TEACHER**: Dashboard, Profile, My Students, Add Student, Notifications
- **EXAMINER**: Dashboard, Evaluation Workspace, Notifications

---

## Competition Lifecycle

Competitions progress through the following states:

```
DRAFT --> REGISTRATION_OPEN --> REGISTRATION_CLOSED --> SUBMISSION_OPEN --> SUBMISSION_CLOSED
  --> EVALUATION_IN_PROGRESS --> RESULT_PENDING --> RESULT_PUBLISHED --> COMPLETED
                                                                                    |
                                                                              CANCELLED
```

| Status | Description |
|---|---|
| DRAFT | Competition is being configured. Not visible to students. |
| REGISTRATION_OPEN | Students can register and pay fees. |
| REGISTRATION_CLOSED | Registration period has ended. |
| SUBMISSION_OPEN | Registered students can upload essay PDFs. |
| SUBMISSION_CLOSED | Submission period has ended. |
| EVALUATION_IN_PROGRESS | Examiners are evaluating submitted essays. |
| RESULT_PENDING | All evaluations complete; results awaiting calculation. |
| RESULT_PUBLISHED | Results are visible to students. |
| COMPLETED | Competition is finalized. |
| CANCELLED | Competition was cancelled. |

Each competition can have multiple age-based categories (e.g., Group A: 10-12, Group B: 13-15, Group C: 16-18) with separate rankings.

---

## Payment Flow

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│ Student │────>│  Register │────>│ Create    │────>│ Razorpay │────>│ Verify    │
│         │     │          │     │ Order     │     │ Checkout │     │ Signature │
└─────────┘     └──────────┘     └───────────┘     └──────────┘     └─────┬─────┘
                                                                            │
                                                              ┌─────────────▼────────────┐
                                                              │  Update Payment Status   │
                                                              │  Confirm Registration    │
                                                              └──────────────────────────┘
```

1. **Registration**: Student registers for a competition and the registration status becomes `PAYMENT_PENDING`.
2. **Order Creation**: The frontend calls `POST /api/payments` which creates a Razorpay order and returns the order ID.
3. **Client Checkout**: The Razorpay checkout modal opens using the `NEXT_PUBLIC_RAZORPAY_KEY_ID` and the order details.
4. **Payment Capture**: After successful payment, the frontend sends the Razorpay payment ID and signature to `POST /api/payments` for verification.
5. **Signature Verification**: The server verifies the payment signature using `RAZORPAY_KEY_SECRET`. On success, the payment status is updated to `SUCCESS` and the registration moves to `CONFIRMED`.
6. **Webhook**: Razorpay sends webhook events to the server (e.g., `payment.captured`, `payment.failed`) which are verified using `RAZORPAY_WEBHOOK_SECRET`.

Payment statuses: `CREATED` -> `PENDING` -> `SUCCESS` / `FAILED` / `CANCELLED` / `REFUNDED` / `PARTIALLY_REFUNDED`

---

## Essay Submission Flow

1. **Eligibility**: Student must have a `CONFIRMED` registration and the competition must be in `SUBMISSION_OPEN` status.
2. **Upload**: Student selects a PDF file (max 5 MB by default, configurable per competition). The file is uploaded to Cloudinary.
3. **Validation**: The server validates file format, size, and computes a SHA-256 hash for integrity.
4. **Storage**: Cloudinary returns a public URL and secure URL. These are stored along with the file hash.
5. **Status Update**: Essay status progresses through: `NOT_STARTED` -> `UPLOAD_PENDING` -> `UPLOADING` -> `VALIDATING` -> `VALID` -> `SUBMITTED` -> `LOCKED`
6. **Locking**: Once the submission window closes, essays are locked and assigned to examiners.

---

## Examination Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│  Admin   │────>│  Assign N    │────>│  Examiner    │────>│  Calculate    │────>│ Publish  │
│          │     │  Examiners   │     │  Evaluates   │     │  Final Score  │     │ Results  │
└──────────┘     └──────────────┘     └──────────────┘     └───────────────┘     └──────────┘
                      │                     │                      │
                      ▼                     ▼                      ▼
               ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
               │ Blind Mode   │     │ Rubric Score │     │ MEAN / MEDIAN│
               │ (if enabled) │     │ per Criterion│     │ / TRIMMED    │
               └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Examiner Assignment**: Admin assigns N examiners (configurable, default 3) to each essay via the Examination management view.
2. **Blind Evaluation**: When blind evaluation is enabled, examiners see only the essay content (downloaded from Cloudinary) without student identity.
3. **Rubric Scoring**: Each examiner scores the essay against evaluation criteria (e.g., Content, Organization, Language, Creativity, Grammar, Overall Impact). Each criterion has a maximum mark.
4. **Submission**: The examiner submits scores along with justification comments.
5. **Result Calculation**: Once all examiners have submitted, the system calculates the final score using the configured averaging method:
   - **MEAN**: Simple average of all examiner scores
   - **MEDIAN**: Median of all examiner scores
   - **TRIMMED_MEAN**: Average after removing the highest and lowest scores
6. **Ranking**: Students are ranked within each competition category based on their final scores.
7. **Publication**: Admin publishes results, making them visible to students.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the complete list with comments. Summary:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Database connection string (SQLite for dev, Neon PostgreSQL for prod) |
| `AUTH_SECRET` | Yes | NextAuth.js secret for JWT signing and session encryption |
| `RAZORPAY_KEY_ID` | Prod | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Prod | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Prod | Razorpay webhook signature verification secret |
| `RESEND_API_KEY` | Prod | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | Prod | Verified sender email address for Resend |
| `CLOUDINARY_CLOUD_NAME` | Prod | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Prod | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Prod | Cloudinary secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Prod | Public Razorpay key ID (exposed to client) |
| `APP_URL` | No | Public URL of the application (default: `http://localhost:3000`) |
| `NODE_ENV` | No | Environment mode (`development` or `production`) |

---

## Deployment on Vercel

NexusBoard is designed for seamless deployment on Vercel with Neon PostgreSQL as the production database.

### Step-by-Step Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NexusBoard SaaS Platform"
   git remote add origin https://github.com/your-username/nexusboard-saas-platform.git
   git push -u origin main
   ```

2. **Set up Neon PostgreSQL**:
   - Create a project at [neon.tech](https://neon.tech)
   - Copy the connection string
   - Change Prisma provider in `schema.prisma` from `sqlite` to `postgresql`

3. **Connect Vercel**:
   - Go to [vercel.com](https://vercel.com) and import the GitHub repository
   - Configure environment variables in the Vercel project settings
   - Set `DATABASE_URL` to the Neon connection string with `?sslmode=require`
   - Set `AUTH_SECRET` to a random string (`openssl rand -base64 32`)

4. **Deploy**:
   - Vercel will auto-detect Next.js and deploy
   - Run `npx prisma db push` against the Neon database after first deploy

5. **Custom Domain** (optional):
   - Add custom domain in Vercel project settings

### Vercel Configuration

The `next.config.ts` is pre-configured for Vercel with:
- `output: 'standalone'` for optimized serverless deployment
- Image optimization via `sharp`
- Proper headers for security

---

## External Services Setup

### Neon (PostgreSQL Database)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the Dashboard
3. Set `DATABASE_URL` to the connection string with `?sslmode=require`
4. Free tier includes 0.5 GB storage and one compute endpoint

### Razorpay (Payments)

1. Create an account at [razorpay.com](https://razorpay.com)
2. Navigate to Settings > API Keys to generate keys
3. Set up webhooks at Settings > Webhooks for events: `payment.captured`, `payment.failed`
4. Test mode is available for development without real transactions

### Resend (Email)

1. Create an account at [resend.com](https://resend.com)
2. Generate an API key from the API Keys page
3. Add and verify a sending domain in the Domains section
4. Free tier includes 3,000 emails/month and 100 emails/day

### Cloudinary (File Storage)

1. Create an account at [cloudinary.com](https://cloudinary.com)
2. Find your Cloud Name, API Key, and API Secret on the Dashboard
3. Configure upload presets for PDF files in Settings > Upload
4. Free tier includes 25 GB storage and 25 GB bandwidth/month

---

## Free Tier Considerations

| Service | Free Tier Limits | Notes |
|---|---|---|
| Vercel | 100 GB bandwidth, serverless function executions | Hobby plan is free for personal projects |
| Neon | 0.5 GB storage, 1 compute endpoint | Sufficient for small-to-medium competitions |
| Razorpay | Test mode (no real transactions) | Production requires KYC and business verification |
| Resend | 3,000 emails/month, 100/day | Custom domain required for production |
| Cloudinary | 25 GB storage, 25 GB bandwidth/month | PDF uploads only; no image transformations needed |

**Total estimated cost for a small deployment: $0/month (all free tiers)**

---

## Documentation

Detailed documentation is available in the `docs/` directory:

| Document | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, data flows, caching, error handling |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema design, models, relationships, indexing |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment guide, environment setup, migrations |
| [docs/EXAMINATION.md](docs/EXAMINATION.md) | Examination process, scoring methods, rubric design |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Razorpay integration, payment flow, webhook handling |
| [docs/SECURITY.md](docs/SECURITY.md) | Security considerations, authentication, input validation |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure `bun run lint` passes
4. Test your changes thoroughly
5. Commit with descriptive messages: `git commit -m "Add feature description"`
6. Push to your branch: `git push origin feature/your-feature`
7. Open a pull request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <strong>Arnab Das</strong> using Next.js, TypeScript, Tailwind CSS & shadcn/ui
</p>
