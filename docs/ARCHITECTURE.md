# Essay Writing Competition Management System — Architecture Document

> **Version:** 0.2.1 | **Last Updated:** 2025 | **Status:** Active Development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Architecture Diagram](#high-level-architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Client-Side Architecture](#client-side-architecture)
6. [Server-Side Architecture](#server-side-architecture)
7. [State Management](#state-management)
8. [Authentication Flow](#authentication-flow)
9. [Role-Based Access Control](#role-based-access-control)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Caching Strategy](#caching-strategy)
12. [Error Handling Architecture](#error-handling-architecture)
13. [Background Jobs Architecture](#background-jobs-architecture)

---

## Project Overview

The Essay Writing Competition Management System is a full-stack web application designed to manage the complete lifecycle of essay writing competitions. It handles student registration, fee collection via Razorpay payments, PDF essay submission to Cloudinary, multi-examiner blind evaluation, automated score calculation, and result publication.

**Key Capabilities:**

- **Multi-role user management** — 5 distinct roles (SUPER_ADMIN, ADMIN, TEACHER, STUDENT, EXAMINER) with granular permission system
- **Competition lifecycle** — Draft → Registration → Submission → Evaluation → Results → Completion
- **Payment processing** — Razorpay integration with order creation, signature verification, and webhook handling
- **Blind evaluation** — Configurable per competition; examiners evaluate without seeing student identity
- **Multi-examiner scoring** — Configurable N examiners per essay with MEAN, MEDIAN, or TRIMMED_MEAN averaging
- **Audit logging** — Immutable audit trail for all critical operations
- **Real-time notifications** — In-app notification system for all user roles

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  React SPA    │  │  Zustand      │  │  TanStack    │  │  shadcn/ui    │  │
│  │  (App Shell)  │  │  Stores       │  │  Query       │  │  Components   │  │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                  │                  │                  │           │
│         └──────────────────┴──────────────────┴──────────────────┘           │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTPS / JSON
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 16 APP SERVER                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      API Routes (src/app/api/)                       │   │
│  │  ┌────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │ /auth  │ │/competitns │ │/paymnts │ │ /essays  │ │/evaluation │  │   │
│  │  │        │ │            │ │         │ │          │ │            │  │   │
│  │  │/users  │ │/registers  │ │/dashbrd │ │/audit    │ │/notify     │  │   │
│  │  │        │ │            │ │         │ │          │ │            │  │   │
│  │  │/examin │ │/announce   │ │/settings│ │/notific  │ │            │  │   │
│  │  └───┬────┘ └─────┬──────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘  │   │
│  └──────┼────────────┼────────────┼────────────┼─────────────┼─────────┘   │
│         │            │            │            │             │             │
│  ┌──────┴────────────┴────────────┴────────────┴─────────────┴─────────┐   │
│  │                        MIDDLEWARE LAYER                              │   │
│  │  • Input validation  • Auth check  • Role check  • Audit logging    │   │
│  └──────┬────────────┬────────────┬────────────┬─────────────┬─────────┘   │
└─────────┼────────────┼────────────┼────────────┼─────────────┼─────────────┘
          │            │            │            │             │
          ▼            ▼            ▼            ▼             ▼
┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐
│  PRISMA     │  │  RAZORPAY   │  │ CLOUDINARY│  │  RESEND    │  │  LOCAL    │
│  ORM        │  │  API        │  │  API      │  │  EMAIL     │  │  CACHE    │
│             │  │             │  │           │  │  API       │  │  (none)  │
└──────┬──────┘  └──────┬──────┘  └─────┬─────┘  └─────┬──────┘  └───────────┘
       │                │               │              │
       ▼                │               │              ▼
┌─────────────┐         │               │      ┌───────────┐
│  DATABASE   │         │               │      │  STUDENT  │
│             │         │               │      │  INBOXES  │
│  SQLite/    │         │               │      │           │
│  PostgreSQL │         │               │      └───────────┘
└─────────────┘         │               │
                        │               │
              ┌─────────┴──────┐ ┌──────┴──────┐
              │  PAYMENT      │ │  FILE       │
              │  GATEWAY      │ │  STORAGE    │
              │  (Razorpay)   │ │  (CDN)      │
              └──────────────┘ └─────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Framework** | Next.js (App Router) | ^16.1.1 | React Server Components, API Routes |
| **Language** | TypeScript | ^5 | Strict mode, full type coverage |
| **Runtime** | Bun | Latest | Package manager & dev server |
| **React** | React | ^19.0.0 | Concurrent features, hooks |
| **Styling** | Tailwind CSS | ^4 | Utility-first, CSS-in-class |
| **UI Library** | shadcn/ui (New York) | — | Radix UI primitives, accessible |
| **Icons** | Lucide React | ^0.525.0 | Tree-shakeable SVG icons |
| **Database ORM** | Prisma | ^6.11.1 | Type-safe query builder |
| **Database (Dev)** | SQLite | — | Zero-config local development |
| **Database (Prod)** | Neon PostgreSQL | — | Serverless, Vercel-native |
| **Client State** | Zustand | ^5.0.6 | Lightweight, with persist middleware |
| **Server State** | TanStack Query | ^5.82.0 | Caching, refetch, optimistic updates |
| **Forms** | React Hook Form | ^7.60.0 | Performant form state management |
| **Validation** | Zod | ^4.0.2 | Schema-based input validation |
| **Animations** | Framer Motion | ^12.23.2 | View transitions, micro-interactions |
| **Charts** | Recharts | ^2.15.4 | Dashboard analytics |
| **Tables** | TanStack Table | ^8.21.3 | Headless, sortable, paginated |
| **Date Utils** | date-fns | ^4.1.0 | Tree-shakeable date formatting |
| **Payments** | Razorpay | — | Indian payment gateway (planned) |
| **File Storage** | Cloudinary | — | PDF essay file hosting (planned) |
| **Email** | Resend | — | Transactional email (planned) |
| **Auth** | NextAuth.js v4 | ^4.24.11 | Available but not yet integrated |
| **Drag & Drop** | dnd-kit | ^6.3.1 | Sortable lists |
| **Markdown** | react-markdown | ^10.1.0 | Rich text rendering |
| **Theme** | next-themes | ^0.4.6 | Light/dark mode |

---

## Project Structure

```
my-project/
├── prisma/
│   ├── schema.prisma          # Database schema (25 models)
│   ├── seed.ts                # Seed data script
│   └── migrations/            # Prisma migration files
├── db/
│   └── dev.db                 # SQLite database file (dev only)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, providers, metadata)
│   │   ├── page.tsx           # Single-page entry → renders <AppShell />
│   │   ├── globals.css        # Tailwind CSS 4 base styles
│   │   └── api/               # RESTful API routes
│   │       ├── route.ts       # Health check / root API
│   │       ├── auth/route.ts          # Login, register, email verification
│   │       ├── users/route.ts         # User CRUD, role management
│   │       ├── competitions/route.ts  # Competition CRUD with categories & criteria
│   │       ├── registrations/route.ts # Student registration, cancellation
│   │       ├── payments/route.ts      # Razorpay order, verify, webhook
│   │       ├── essays/route.ts        # Essay upload, validation
│   │       ├── evaluations/route.ts   # Evaluation save/submit, result calculation
│   │       ├── examiners/route.ts     # Examiner management
│   │       ├── announcements/route.ts # Announcement CRUD
│   │       ├── notifications/route.ts # User notifications
│   │       ├── dashboard/route.ts     # Dashboard statistics
│   │       ├── audit/route.ts         # Audit log retrieval
│   │       └── settings/route.ts      # System settings CRUD
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-shell.tsx      # Root SPA shell with auth/app router
│   │   │   ├── app-sidebar.tsx    # Role-based sidebar navigation
│   │   │   └── app-header.tsx     # Top bar (user menu, notifications, breadcrumbs)
│   │   ├── auth/
│   │   │   ├── login-view.tsx         # Login form
│   │   │   └── register-view.tsx      # Student/teacher registration
│   │   ├── admin/
│   │   │   ├── dashboard-view.tsx     # Admin dashboard with stats & charts
│   │   │   ├── students-view.tsx      # Student management
│   │   │   ├── teachers-view.tsx      # Teacher management
│   │   │   ├── examiners-view.tsx     # Examiner management
│   │   │   ├── competitions-view.tsx  # Competition CRUD & lifecycle
│   │   │   ├── registrations-view.tsx # Registration oversight
│   │   │   ├── finance-view.tsx       # Payment dashboard & revenue
│   │   │   ├── essays-view.tsx        # Essay listing & validation
│   │   │   ├── examination-view.tsx   # Examiner assignment management
│   │   │   ├── results-view.tsx       # Result calculation & publication
│   │   │   ├── announcements-view.tsx # Announcement management
│   │   │   ├── audit-view.tsx         # Audit log viewer
│   │   │   └── settings-view.tsx      # System configuration
│   │   ├── student/
│   │   │   ├── dashboard-view.tsx     # Student home with competitions & status
│   │   │   ├── profile-view.tsx       # Student profile editor
│   │   │   ├── competitions-view.tsx  # Browse & register for competitions
│   │   │   ├── essay-view.tsx         # Essay upload & status tracking
│   │   │   ├── payment-view.tsx       # Payment flow (Razorpay checkout)
│   │   │   ├── results-view.tsx       # View published results
│   │   │   └── notifications-view.tsx # Student notifications
│   │   ├── teacher/
│   │   │   ├── dashboard-view.tsx     # Teacher dashboard with student stats
│   │   │   ├── profile-view.tsx       # Teacher profile editor
│   │   │   ├── students-view.tsx      # Referred students list
│   │   │   ├── add-student-view.tsx   # Bulk student registration
│   │   │   └── notifications-view.tsx # Teacher notifications
│   │   ├── examiner/
│   │   │   ├── dashboard-view.tsx     # Examiner dashboard with pending essays
│   │   │   ├── workspace-view.tsx     # 3-column evaluation workspace
│   │   │   └── notifications-view.tsx # Examiner notifications
│   │   └── ui/                      # shadcn/ui primitives (~40 components)
│   │       ├── button.tsx, card.tsx, dialog.tsx, table.tsx,
│   │       ├── input.tsx, select.tsx, tabs.tsx, badge.tsx,
│   │       ├── sidebar.tsx, sheet.tsx, tooltip.tsx, ...
│   ├── hooks/
│   │   ├── use-mobile.ts       # Mobile viewport detection
│   │   └── use-toast.ts        # Toast notification hook
│   └── lib/
│       ├── db.ts               # Prisma client singleton (dev: query logging)
│       ├── store.ts            # Zustand stores (auth, nav, app)
│       ├── types.ts            # TypeScript type definitions
|       ├── constants.ts        # Application constants
│       └── utils.ts            # Utility functions (cn, etc.)
├── public/                     # Static assets
├── package.json                # Dependencies & scripts
├── Caddyfile                   # Reverse proxy / gateway config
├── .env                        # Environment variables (local)
└── docs/                       # Documentation
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── SECURITY.md
    ├── PAYMENTS.md
    ├── DEPLOYMENT.md
    └── EXAMINATION.md
```

---

## Client-Side Architecture

### SPA Routing via Zustand Nav Store

The application uses a **single-page architecture** with no file-system routing. Instead of Next.js pages, the entire app lives at `/` and uses a Zustand store (`useNavStore`) to manage view switching:

```
User clicks sidebar item
    ↓
navigate('admin-dashboard')  →  useNavStore.currentView = 'admin-dashboard'
    ↓
AppShell re-renders → AppRouter switch statement
    ↓
Renders <AdminDashboardView /> with Framer Motion transition
```

The `NavView` type union defines all possible views (~35 views):

| Prefix | Views | Role |
|--------|-------|------|
| `login`, `register`, `forgot-password` | 3 | Unauthenticated |
| `admin-*` | 14 | SUPER_ADMIN, ADMIN |
| `student-*` | 7 | STUDENT |
| `teacher-*` | 5 | TEACHER |
| `examiner-*` | 3 | EXAMINER |

### Role-Based View Switching

On authentication, the `AppShell` component auto-navigates to the correct dashboard based on the user's primary role:

```typescript
useEffect(() => {
  if (isAuthenticated && user) {
    const role = user.roles[0];
    switch (role) {
      case 'SUPER_ADMIN': case 'ADMIN': navigate('admin-dashboard'); break;
      case 'STUDENT':      navigate('student-dashboard'); break;
      case 'TEACHER':      navigate('teacher-dashboard'); break;
      case 'EXAMINER':    navigate('examiner-dashboard'); break;
    }
  }
}, [isAuthenticated, user]);
```

### Component Hierarchy

```
<page.tsx>
  └── <AppShell>
        ├── [Unauthenticated] <AuthRouter>
        │     ├── <LoginView />
        │     └── <RegisterView />
        │
        └── [Authenticated] <motion.div>
              ├── <SidebarProvider>
              │     ├── <AppSidebar />        ← Role-based nav items
              │     └── <SidebarInset>
              │           ├── <AppHeader />   ← Breadcrumbs, notifications, user menu
              │           └── <AppRouter /> ← View switch via NavStore
              │                 ├── Admin Views (14)
              │                 ├── Student Views (7)
              │                 ├── Teacher Views (5)
              │                 └── Examiner Views (3)
              └──</SidebarProvider>
```

---

## Server-Side Architecture

### API Route Pattern

All API routes follow a consistent pattern:

```
POST /api/{resource}?action={verb}   → Action-based routing via query params
GET  /api/{resource}?filter=value    → Query with optional filters + pagination
PUT  /api/{resource}?action={verb}   → Update operations
```

**Action-based routing** is used instead of dynamic route segments (`[id]`). Each route file exports GET, POST, and optionally PUT handlers that internally dispatch to action handlers via `searchParams.get('action')`.

```typescript
// Typical route structure
export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action');
  switch (action) {
    case 'create-order': return handleCreateOrder(request);
    case 'verify':       return handleVerifyPayment(request);
    case 'webhook':      return handleWebhook(request);
    default:             return error(400, 'Invalid action');
  }
}
```

### API Route Registry

| Route | GET | POST (actions) | PUT (actions) |
|-------|-----|-----------------|---------------|
| `/api/auth` | — | `login`, `register`, `verify-email` | — |
| `/api/users` | List users | `create`, `update-role`, `toggle-active` | — |
| `/api/competitions` | List (filter by status) | `create`, `update`, `update-status` | — |
| `/api/registrations` | List (filter) | `create` | `cancel` |
| `/api/payments` | List (filter) | `create-order`, `verify`, `webhook` | — |
| `/api/essays` | List (filter) | Upload (multipart/JSON) | `validate` |
| `/api/evaluations` | List (filter) | Save/submit evaluation | `calculate-result` |
| `/api/examiners` | List | `create`, `assign`, `reassign` | — |
| `/api/announcements` | List | `create`, `update`, `publish` | — |
| `/api/notifications` | List (by user) | `mark-read`, `mark-all-read` | — |
| `/api/dashboard` | Stats | — | — |
| `/api/audit` | List (filter) | — | — |
| `/api/settings` | List (by category) | `upsert` | — |

### Middleware Layers

Each API route applies the following checks in order:

1. **Input parsing** — Extract `searchParams` and `request.json()` / `request.formData()`
2. **Required field validation** — Check for missing required fields
3. **Business rule validation** — Check status constraints, duplicates, eligibility
4. **Database operations** — Prisma queries within `$transaction` where needed
5. **Audit logging** — Create `AuditLog` entry after successful mutation
6. **Notifications** — Create in-app `Notification` for relevant users
7. **Response** — Return `{ success, data, message }` JSON

### Service Abstraction

Currently, business logic lives directly in route handlers. The pattern uses internal handler functions (`handleCreateOrder`, `handleVerifyPayment`, etc.) within each route file. There is no separate service layer, but the handler pattern provides clean separation within each file.

---

## State Management

### Zustand Stores

Three Zustand stores manage all client-side state:

#### 1. Auth Store (`useAuthStore`)

- **Persistence:** `localStorage` via `persist` middleware (key: `essay-auth`)
- **State:** `user: UserSession | null`, `isAuthenticated`, `isLoading`
- **Actions:** `login()`, `logout()`, `updateUser()`, `setLoading()`, `hasRole()`, `hasAnyRole()`
- **Purpose:** Manages user session, role checking, and authentication state

#### 2. Nav Store (`useNavStore`)

- **Persistence:** None (resets on page reload)
- **State:** `currentView: NavView`, `sidebarOpen`, `breadcrumbs`
- **Actions:** `navigate()`, `setSidebarOpen()`, `toggleSidebar()`, `setBreadcrumbs()`, `pushBreadcrumb()`
- **Purpose:** SPA routing, sidebar toggle, breadcrumb trail

#### 3. App Store (`useAppStore`)

- **Persistence:** None
- **State:** `notifications[]`, `unreadCount`
- **Actions:** `setNotifications()`, `markAsRead()`, `markAllAsRead()`
- **Purpose:** In-memory notification cache for the notification bell

### Server State (TanStack Query)

TanStack Query (`@tanstack/react-query`) is available for server state caching and synchronization. Individual view components use it for data fetching with automatic refetch, stale-while-revalidate, and optimistic updates.

---

## Authentication Flow

### Login

```
Student/Teacher/Admin
    │
    ▼
POST /api/auth?action=login
    │  { email, password }
    │
    ├─ User not found → 401 "Invalid email or password"
    ├─ User inactive  → 403 "Account is deactivated"
    ├─ Password invalid → 401
    │
    ▼
User found, password valid
    │  • Fetch roles, profiles
    │  • Create audit log (USER_LOGIN)
    │  • Return session data
    │
    ▼
Client: useAuthStore.login(sessionData)
    │  • Persist to localStorage
    │  • Auto-navigate to role dashboard
```

### Registration

```
POST /api/auth?action=register
    │  { email, password, name, role, ...profileFields }
    │
    ├─ Validate required fields
    ├─ Check email uniqueness → 409 if exists
    ├─ Password min 6 chars → 400
    ├─ Create User + UserRole + Profile (in transaction)
    ├─ Create audit log (USER_REGISTER)
    │
    ▼
Return { id, email, name, role }
```

### Email Verification

```
POST /api/auth?action=verify-email
    │  { token }
    │
    ├─ Find EmailVerificationToken
    ├─ Check not used, not expired
    ├─ Mark user.emailVerified = true
    ├─ Mark token.usedAt = now (transaction)
    ├─ Create audit log (EMAIL_VERIFIED)
    │
    ▼
Return success
```

### Session Management

The system uses a **client-side session** pattern:

1. Login returns full `UserSession` object (id, email, name, roles, profiles)
2. Client stores session in `localStorage` via Zustand `persist`
3. Each API request does **not** include session token (currently trust-based)
4. On page load, Zustand hydrates from `localStorage`
5. Logout clears the store and navigates to login

> **Note:** This is a development-mode architecture. Production should add JWT tokens, HTTP-only cookies, or NextAuth.js session management.

---

## Role-Based Access Control

### Five Roles

| Role | Description | Dashboard | Access Level |
|------|-------------|-----------|-------------|
| `SUPER_ADMIN` | Full system access | admin-dashboard | All permissions + ADMIN_MANAGE |
| `ADMIN` | Operational admin | admin-dashboard | Subset of permissions (configured) |
| `TEACHER` | School teacher, refers students | teacher-dashboard | Own students, profile, notifications |
| `STUDENT` | Competition participant | student-dashboard | Own profile, competitions, essays, results |
| `EXAMINER` | Essay evaluator | examiner-dashboard | Assigned essays, workspace, notifications |

### Permission System (ADMIN only)

ADMIN users have a granular permission system via the `AdminPermission` model:

| Permission | Grants Access To |
|-----------|-----------------|
| `STUDENT_VIEW` | View student list and profiles |
| `STUDENT_EDIT` | Create, edit, deactivate students |
| `TEACHER_VIEW` | View teacher list and profiles |
| `TEACHER_EDIT` | Create, edit teachers |
| `EXAMINER_MANAGE` | Create, activate, deactivate, assign examiners |
| `COMPETITION_MANAGE` | Create, edit, publish competitions |
| `PAYMENT_VIEW` | View payment transactions |
| `PAYMENT_MANAGE` | Process refunds, financial operations |
| `EXAM_ASSIGN` | Assign examiners to essays |
| `RESULT_VIEW` | View results and scores |
| `RESULT_MANAGE` | Calculate, publish, override results |
| `NOTIFICATION_MANAGE` | Create and publish announcements |
| `AUDIT_VIEW` | View audit logs |
| `SETTINGS_MANAGE` | Modify system settings |
| `ADMIN_MANAGE` | Create, edit admin users (SUPER_ADMIN only) |

### Enforcement

- **Frontend:** Sidebar items are conditionally rendered based on `useAuthStore.hasRole()` and permission checks
- **Backend:** API routes should validate roles before processing (currently partially implemented)

---

## Data Flow Diagrams

### Registration Flow

```
Student          Client          API Server         Database
  │                │                 │                  │
  │ Browse comps   │                 │                  │
  │───────────────>│                 │                  │
  │                │ GET /api/competitions?status=REGISTRATION_OPEN
  │                │────────────────>│                  │
  │                │                 │─────────────────>│
  │                │   Competition list                   │
  │                │<────────────────│<─────────────────│
  │ Click Register │                 │                  │
  │───────────────>│                 │                  │
  │                │ POST /api/registrations              │
  │                │ {studentId, competitionId}            │
  │                │────────────────>│                  │
  │                │                 │ • Check eligibility│
  │                │                 │ • Check duplicate │
  │                │                 │ • Generate RegNo  │
  │                │                 │─────────────────>│
  │                │   Registration  │                  │
  │                │<────────────────│<─────────────────│
  │   Reg #EC-2025-00001              │                  │
  │<───────────────│                 │                  │
```

### Payment Flow

```
Student           Client           API Server        Razorpay        Database
  │                  │                  │                │               │
  │ Pay Now          │                  │                │               │
  │─────────────────>│                  │                │               │
  │                  │ POST /api/payments?action=create-order
  │                  │─────────────────>│                │               │
  │                  │                  │ • Check reg    │               │
  │                  │                  │ • Check dup    │               │
  │                  │                  │ • Create order │               │
  │                  │                  │───────────────────────────────>│
  │                  │  {orderId, amount}                │               │
  │                  │<─────────────────│                │               │
  │  Razorpay Checkout opened                    │               │
  │<─────────────────│                  │                │               │
  │  Enter payment details                     │               │
  │─────────────────────────────────────────────────────>│
  │  payment.captured webhook                  │               │
  │                  │                  │<───────────────│
  │                  │                  │ POST /api/payments?action=webhook
  │                  │                  │───────────────────────────────>│
  │                  │                  │ • Verify sig  │               │
  │                  │                  │ • Mark SUCCESS │               │
  │                  │                  │ • Update reg   │               │
  │                  │                  │                │               │
  │  Payment Confirmed!                     │               │
  │<─────────────────│<─────────────────│                │               │
```

### Essay Submission Flow

```
Student         Client          API Server        Cloudinary       Database
  │                │                 │                │               │
  │ Upload PDF     │                 │                │               │
  │───────────────>│                 │                │               │
  │                │ POST /api/essays (multipart/form-data)
  │                │────────────────>│                │               │
  │                │                 │ • Check reg    │               │
  │                │                 │ • Check status │               │
  │                │                 │ • Validate PDF │               │
  │                │                 │ • Check size   │               │
  │                │                 │ • Upload file  │               │
  │                │                 │───────────────>│               │
  │                │                 │  {url, id}     │               │
  │                │                 │<───────────────│               │
  │                │                 │ • Save metadata│               │
  │                │                 │───────────────────────────────>│
  │                │  Essay record    │               │               │
  │                │<────────────────│<───────────────────────────────│
  │  Submitted!    │                  │               │               │
  │<───────────────│                  │               │               │
```

### Evaluation Flow

```
Admin             API Server           Database
  │                    │                   │
  │ Assign examiners   │                   │
  │───────────────────>│                   │
  │                    │ Create ExaminerAssignment (N per essay)
  │                    │──────────────────>│
  │                    │                   │
  │                    │  Assignments created
  │                    │<──────────────────│
  │                    │                   │
Examiner              │                   │
  │ Open workspace     │                   │
  │───────────────────>│                   │
  │                    │ GET /api/evaluations?examinerId=...
  │                    │──────────────────>│
  │  Essay list + PDFs │                   │
  │<───────────────────│<──────────────────│
  │                    │                   │
  │ Score & submit     │                   │
  │───────────────────>│                   │
  │                    │ POST /api/evaluations
  │                    │ {scores[], justification, submit: true}
  │                    │──────────────────>│
  │                    │ • Validate scores │
  │                    │ • Upsert evaluation + scores
  │                    │ • Lock assignment  │
  │                    │<──────────────────│
  │  Submitted!        │                   │
  │<───────────────────│                   │
```

### Result Calculation Flow

```
Admin                  API Server              Database
  │                       │                       │
  │ Calculate Results     │                       │
  │──────────────────────>│                       │
  │                       │ For each essay:        │
  │                       │   GET all SUBMITTED    │
  │                       │   evaluations          │
  │                       │──────────────────────>│
  │                       │                       │
  │                       │  Evaluation scores    │
  │                       │<──────────────────────│
  │                       │                       │
  │                       │ Apply scoring config: │
  │                       │ • MEAN / MEDIAN /     │
  │                       │   TRIMMED_MEAN        │
  │                       │ • Outlier handling    │
  │                       │                       │
  │                       │ Upsert Result         │
  │                       │──────────────────────>│
  │                       │                       │
  │                       │ Calculate ranks       │
  │                       │ (category-wise)       │
  │                       │                       │
  │  Results ready        │                       │
  │<──────────────────────│<──────────────────────│
  │                       │                       │
  │ Publish Results       │                       │
  │──────────────────────>│                       │
  │                       │ Update status → PUBLISHED
  │                       │──────────────────────>│
  │                       │ Notify students       │
  │                       │                       │
```

---

## Caching Strategy

### Client-Side Caching

| Layer | Technology | What's Cached | TTL / Invalidation |
|-------|-----------|---------------|---------------------|
| **Auth session** | Zustand + `persist` | User session, roles | Manual logout / localStorage clear |
| **Navigation** | Zustand (no persist) | Current view, sidebar state | Page reload resets |
| **Notifications** | Zustand (no persist) | Notification list, unread count | Refetch on view mount |
| **Server data** | TanStack Query | API responses (competitions, users, etc.) | `staleTime`, `refetchOnMount`, `refetchOnWindowFocus` |

### Server-Side Caching

| Layer | Technology | What's Cached | TTL |
|-------|-----------|---------------|-----|
| **Database** | None (in-memory Prisma) | Connection pooling | Process lifetime |
| **API responses** | None | — | — |
| **Static assets** | Next.js built-in | CSS, JS, images | Immutable hashes |

### Prisma Connection

The Prisma client uses a global singleton pattern to prevent connection exhaustion in development:

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

> **Production Note:** Add Prisma connection pooling via `@prisma/adapter-pg` or Neon's serverless driver for serverless deployment.

---

## Error Handling Architecture

### API Response Contract

All API responses follow a consistent envelope:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;   // Operation result
  data?: T;           // Response payload
  error?: string;     // Error message (human-readable)
  message?: string;   // Success message
}
```

Paginated responses extend this:

```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;      // Total matching records
  page: number;       // Current page (1-based)
  pageSize: number;   // Items per page
  totalPages: number; // Total pages
}
```

### Error Handling Pattern

Every API route wraps its handler in a try-catch:

```typescript
export async function POST(request: NextRequest) {
  try {
    // ... business logic
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful GET / PUT |
| `201` | Successful POST (created) |
| `400` | Bad request (missing fields, invalid state, business rule violation) |
| `401` | Unauthorized (invalid credentials) |
| `403` | Forbidden (account deactivated, insufficient permissions) |
| `404` | Not found (entity doesn't exist) |
| `409` | Conflict (duplicate email, duplicate registration) |
| `500` | Internal server error (uncaught exception) |

### Client Error Display

- **Toast notifications** via `sonner` for action feedback (success, error, warning)
- **Form validation errors** displayed inline via React Hook Form + Zod
- **API errors** caught in view components and displayed as toast messages

---

## Background Jobs Architecture

### Current State

The system does **not** currently use a background job queue. All operations are synchronous within API request handlers. This includes:

- Email sending (planned — currently in-app notifications only)
- File upload to Cloudinary (currently mocked)
- Result calculation (triggered manually by admin)
- Notification dispatch (created synchronously in DB)

### Planned Background Jobs

For production, the following should be migrated to a job queue:

| Job | Trigger | Implementation Option |
|-----|---------|----------------------|
| Welcome email | User registration | Resend API + Vercel Cron / BullMQ |
| Payment confirmation email | Payment success | Webhook → email queue |
| Essay validation | Essay upload | File processing queue |
| Result notification | Result publication | Batch notification job |
| Registration reminder | Scheduled | Vercel Cron Job |
| Deadline notifications | Scheduled | Vercel Cron Job |
| Bulk result calculation | Admin action | Queue + progress tracking |

### Recommended Architecture

```
API Route
    │
    ├─ Fast path: Create DB record, return immediately
    │
    └─ Async path: Push to job queue
          │
          ▼
    ┌─────────────┐
    │ Job Queue    │  (BullMQ / Inngest / Trigger.dev)
    │ (Redis/DB)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Worker      │  Process jobs: email, file ops, calculations
    └─────────────┘
```

For Vercel serverless deployment, **Inngest** or **Trigger.dev** are recommended as they integrate natively without requiring a persistent Redis instance.
