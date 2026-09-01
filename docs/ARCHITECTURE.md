# NexusBoard Architecture Documentation

> **Version:** 1.0.0 | **Last Updated:** September 2025

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Client Architecture](#3-client-architecture)
4. [API Layer Architecture](#4-api-layer-architecture)
5. [Data Access Layer](#5-data-access-layer)
6. [State Management Strategy](#6-state-management-strategy)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Navigation & Routing](#8-navigation--routing)
9. [Component Architecture](#9-component-architecture)
10. [External Service Integration](#10-external-service-integration)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Performance & Caching](#12-performance--caching)
13. [Security Architecture](#13-security-architecture)
14. [Scalability Considerations](#14-scalability-considerations)
15. [Deployment Architecture](#15-deployment-architecture)

---

## 1. System Overview

NexusBoard is a full-stack SaaS platform for managing essay writing competitions. It follows a **single-page application (SPA) architecture** built on Next.js 16 with the App Router pattern.

### Core Principles

- **Separation of Concerns**: Clear boundaries between client UI, API routes, data access, and database
- **Role-Based Access Control (RBAC)**: Five distinct user roles with granular permissions
- **Type Safety**: End-to-end TypeScript with Zod schema validation
- **Scalability**: Stateless API routes, database-agnostic ORM, and Vercel-optimized deployment
- **Developer Experience**: shadcn/ui components, Zustand for simple state, comprehensive documentation

### Technology Matrix

```
┌──────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                      │
│   React 19 + Next.js 16 + Tailwind CSS 4 + shadcn/ui    │
│   Framer Motion + Recharts + Lucide Icons                │
├──────────────────────────────────────────────────────────┤
│                    STATE LAYER                            │
│   Zustand (client) + TanStack Query (server)              │
├──────────────────────────────────────────────────────────┤
│                     API LAYER                             │
│   Next.js Route Handlers + Zod Validation                 │
├──────────────────────────────────────────────────────────┤
│                  DATA ACCESS LAYER                        │
│   Prisma ORM + SQLite (dev) / Neon PostgreSQL (prod)     │
├──────────────────────────────────────────────────────────┤
│                 EXTERNAL SERVICES                         │
│   NextAuth.js + Razorpay + Cloudinary + Resend            │
└──────────────────────────────────────────────────────────┘
```

---

## 2. High-Level Architecture

### Request Flow

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│ Browser  │───>│ Next.js     │───>│ Route        │───>│ Prisma    │───>│ Database │
│ (React)  │<───│ Server      │<───│ Handler      │<───│ ORM       │<───│          │
└─────────┘    └──────────────┘    └──────────────┘    └───────────┘    └──────────┘
     │                                    │
     │  Zustand (navigation)              │  External Services
     │  TanStack Query (data fetching)    │  ├─ Razorpay (payments)
     │                                    │  ├─ Cloudinary (storage)
     │                                    │  └─ Resend (email)
```

### Architecture Layers

| Layer | Responsibility | Key Files |
|---|---|---|
| **Presentation** | UI rendering, user interaction, animations | `src/components/**/*.tsx` |
| **State** | Client-side state, server state caching | `src/lib/store.ts`, TanStack Query hooks |
| **API** | Business logic, input validation, RBAC | `src/app/api/**/route.ts` |
| **Data Access** | Database queries, transactions, schema | `src/lib/db.ts`, `prisma/schema.prisma` |
| **Infrastructure** | Auth, payments, email, file storage | NextAuth config, service integrations |

---

## 3. Client Architecture

### SPA Routing Pattern

NexusBoard uses a **single-page application** pattern where all views are rendered client-side from the `/` route. Navigation is managed entirely by the Zustand `useNavStore`.

```
┌─────────────────────────────────────────────────┐
│  page.tsx (single route)                        │
│  └── AppShell                                   │
│      ├── Authenticated?                         │
│      │   ├── YES ──> Sidebar + Header + Router   │
│      │   │              └── AppRouter (switch)   │
│      │   └── NO  ──> AuthRouter (switch)         │
│      │              └── Login / Register         │
```

### Navigation Store (Zustand)

```typescript
// Navigation state
interface NavState {
  currentView: NavView;       // Current active view identifier
  sidebarOpen: boolean;       // Sidebar toggle state
  breadcrumbs: Breadcrumb[];  // Breadcrumb trail
  navigate: (view) => void;   // Navigate to a view
}
```

### View Component Organization

```
src/components/
├── auth/           # 2 components (login, register)
├── admin/          # 13 components (dashboard, students, teachers, ...)
├── student/        # 7 components (dashboard, profile, competitions, ...)
├── teacher/        # 5 components (dashboard, profile, students, ...)
├── examiner/       # 3 components (dashboard, workspace, notifications)
├── layout/         # 3 components (app-shell, app-sidebar, app-header)
├── views/          # 6 shared view components
└── ui/             # 40+ shadcn/ui base components
```

### Component Design Patterns

1. **View Components**: Each view is a self-contained component with its own data fetching, state, and UI
2. **Layout Components**: AppShell, Sidebar, Header provide the application chrome
3. **UI Components**: shadcn/ui provides consistent, accessible base components
4. **Compound Components**: Complex UIs (forms, tables) use compound component patterns

---

## 4. API Layer Architecture

### Route Handler Pattern

Each API route follows a consistent pattern:

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Input validation schemas
const CreateSchema = z.object({ ... });

// GET handler
export async function GET(request: NextRequest) {
  // 1. Extract query parameters
  // 2. Validate input
  // 3. Check authorization
  // 4. Query database
  // 5. Return response
}

// POST handler
export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  // 2. Check authorization
  // 3. Business logic
  // 4. Database transaction
  // 5. Audit logging
  // 6. Return response
}
```

### API Route Inventory

| Route | Methods | Complexity | Description |
|---|---|---|---|
| `/api` | GET | Low | Health check |
| `/api/auth` | POST | High | Login, register, verify-email |
| `/api/users` | GET, PUT, DELETE | Medium | User CRUD, search, toggle active |
| `/api/competitions` | GET, POST, PUT | High | Competition CRUD with categories & criteria |
| `/api/registrations` | GET, POST, PUT | Medium | Registration lifecycle management |
| `/api/payments` | GET, POST | High | Razorpay order creation & verification |
| `/api/essays` | GET, POST, PUT | High | Upload, validate, lock essays |
| `/api/evaluations` | GET, POST, PUT | High | Multi-criterion scoring & submission |
| `/api/examiners` | GET, POST, PUT | Medium | Examiner profile management |
| `/api/dashboard` | GET | Medium | Aggregated analytics queries |
| `/api/announcements` | GET, POST, PUT | Low | Announcement CRUD |
| `/api/notifications` | GET, PUT | Low | Notification listing & read status |
| `/api/settings` | GET, PUT | Low | System settings key-value store |
| `/api/audit` | GET | Medium | Paginated audit log queries |

### Input Validation Strategy

All API inputs are validated using Zod schemas:

```
Client Request ──> Zod Schema Validation ──> Type-safe Data ──> Business Logic
                      │
                      └──> 400 Bad Request (on failure)
```

### Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## 5. Data Access Layer

### Prisma Client Configuration

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### Database Provider Strategy

```
Development:  SQLite (file:./db/custom.db)
Production:   Neon PostgreSQL (postgresql://...?sslmode=require)
```

Switching between providers requires:
1. Changing `provider` in `schema.prisma`
2. Updating `DATABASE_URL` environment variable
3. Running `prisma db push` or `prisma migrate deploy`

### Transaction Usage

Critical operations (payment verification, result calculation) use Prisma transactions:

```typescript
await db.$transaction([
  db.payment.update({ where: { id }, data: { status: 'SUCCESS' } }),
  db.registration.update({ where: { id }, data: { status: 'CONFIRMED' } }),
]);
```

---

## 6. State Management Strategy

### State Categories

| Category | Tool | Persistence | Use Case |
|---|---|---|---|
| **Auth State** | Zustand + persist | localStorage | User session, authentication status |
| **Navigation State** | Zustand | Memory only | Current view, sidebar state, breadcrumbs |
| **App State** | Zustand | Memory only | Notifications, unread count |
| **Server State** | TanStack Query | Cache + refetch | API data, dashboard stats, lists |
| **Form State** | React Hook Form | Component only | Form inputs, validation, submission |
| **UI State** | React useState | Component only | Modals, dropdowns, toggles |

### Zustand Store Architecture

```
┌──────────────────────────────────────────────┐
│              useAuthStore (persisted)        │
│  ├── user: UserSession | null                │
│  ├── isAuthenticated: boolean                │
│  ├── login(user)                             │
│  ├── logout()                                │
│  ├── hasRole(role)                           │
│  └── hasAnyRole(roles)                       │
├──────────────────────────────────────────────┤
│              useNavStore                     │
│  ├── currentView: NavView                    │
│  ├── sidebarOpen: boolean                    │
│  ├── breadcrumbs: Breadcrumb[]               │
│  ├── navigate(view)                          │
│  └── setSidebarOpen(open)                    │
├──────────────────────────────────────────────┤
│              useAppStore                     │
│  ├── notifications: Notification[]           │
│  ├── unreadCount: number                     │
│  ├── setNotifications(notifications)         │
│  ├── markAsRead(id)                          │
│  └── markAllAsRead()                         │
└──────────────────────────────────────────────┘
```

---

## 7. Authentication & Authorization

### Authentication Flow

```
┌────────┐    POST /api/auth     ┌──────────┐    Verify Password    ┌─────────┐
│ Login  │──────────────────────>│ API      │──────────────────────>│ Database│
│ Form   │<──────────────────────│ Handler  │<──────────────────────│         │
└────────┘    JWT + User Data    └──────────┘    User Record       └─────────┘
     │
     └──> Store in Zustand (persisted to localStorage)
     └──> Navigate to role-specific dashboard
```

### Role-Based Access Control

```
Request ──> Extract Role ──> Check Permission ──> Allow/Deny
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
               SUPER_ADMIN    ADMIN        OTHERS
               Full Access   14 Named    Role-Limited
                              Permissions  Access
```

### Permission Enforcement

Each API route checks permissions before processing:

```typescript
const user = getUserFromSession(request);
if (!hasPermission(user, 'COMPETITION_MANAGE')) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

---

## 8. Navigation & Routing

### SPA Navigation Flow

```
User Action ──> useNavStore.navigate(view) ──> Update currentView
                                                │
                                          AppRouter (switch)
                                                │
                              ┌─────────────┼─────────────┐
                              │             │             │
                         Admin Views  Student Views  Teacher Views
```

### Role-Based Navigation

The sidebar component renders different navigation items based on the user's role:

| Role | Navigation Items |
|---|---|
| SUPER_ADMIN | Dashboard, Students, Teachers, Examiners, Admins, Competitions, Registrations, Finance, Essays, Examination, Results, Announcements, Audit, Settings |
| ADMIN | Dashboard, Students, Teachers, Examiners, Competitions, Registrations, Finance, Essays, Examination, Results, Announcements |
| STUDENT | Dashboard, Profile, Competitions, My Essay, Payment, Results, Notifications |
| TEACHER | Dashboard, Profile, My Students, Add Student, Notifications |
| EXAMINER | Dashboard, Workspace, Notifications |

---

## 9. Component Architecture

### Component Hierarchy

```
page.tsx
└── AppShell
    ├── [Authenticated]
    │   ├── SidebarProvider
    │   │   ├── AppSidebar
    │   │   └── SidebarInset
    │   │       ├── AppHeader
    │   │       └── AppRouter
    │   │           ├── AdminDashboardView
    │   │           ├── AdminStudentsView
    │   │           ├── ... (28+ views)
    │   │           └── PlaceholderView
    └── [Unauthenticated]
        └── AuthRouter
            ├── LoginView
            └── RegisterView
```

### View Component Pattern

Each view component follows this pattern:

```typescript
'use client';

import { useAuthStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';

export function SomeView() {
  // 1. Auth/role check
  const user = useAuthStore(s => s.user);

  // 2. Data fetching with TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ['some-data'],
    queryFn: () => fetch('/api/some-data').then(r => r.json()),
  });

  // 3. Render with loading/error states
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay />;

  return (
    <div className="p-6 space-y-6">
      {/* View content */}
    </div>
  );
}
```

---

## 10. External Service Integration

### Razorpay (Payments)

```
┌──────────┐    Create Order     ┌──────────┐    Order API    ┌──────────┐
│ Frontend │──────────────────>│  /api/   │───────────────>│ Razorpay │
│          │<──────────────────│ payments │<───────────────│          │
└──────────┘   Order ID        └──────────┘   Order Object  └──────────┘
     │
     │ Open Checkout Modal
     ▼
┌──────────┐   Verify Payment  ┌──────────┐   Verify API   ┌──────────┐
│ Razorpay │─────────────────>│  /api/   │──────────────>│ Razorpay │
│  Modal   │  Payment Details  │ payments │  Signature    │          │
└──────────┘                   └──────────┘                └──────────┘
```

### Cloudinary (File Storage)

```
┌──────────┐   Upload PDF     ┌──────────┐   Upload API   ┌───────────┐
│ Student  │────────────────>│  /api/   │──────────────>│ Cloudinary│
│          │<────────────────│  essays  │<──────────────│           │
└──────────┘   File Metadata  └──────────┘  URL + Hash   └───────────┘
```

### Resend (Email)

```
API Handler ──> Resend SDK ──> SMTP ──> User Inbox
```

---

## 11. Error Handling Strategy

### Error Categories

| Category | HTTP Status | Handling |
|---|---|---|
| Validation Error | 400 | Zod schema validation returns detailed errors |
| Authentication Error | 401 | Redirect to login, clear session |
| Authorization Error | 403 | Return forbidden, log attempt |
| Not Found | 404 | Return not found with suggestion |
| Server Error | 500 | Log error, return generic message |
| Rate Limit | 429 | Return retry-after header |

### Error Flow

```
API Error ──> Try/Catch in Route Handler
                │
                ├──> Zod Validation Error ──> 400 + field errors
                ├──> Prisma Unique Constraint ──> 409 + conflict message
                ├──> External Service Error ──> 502 + service name
                └──> Unknown Error ──> 500 + generic message
                                          │
                                    Audit Log (if authenticated)
```

### Client Error Handling

```typescript
const { data, error } = useQuery({
  queryKey: ['data'],
  queryFn: () => fetch('/api/data').then(r => r.json()),
});

if (error) {
  // TanStack Query automatically retries 3 times
  // Shows error boundary or inline error message
}
```

---

## 12. Performance & Caching

### Caching Layers

| Layer | Strategy | TTL | Invalidation |
|---|---|---|---|
| Browser | TanStack Query (staleTime) | 5 min | Manual refetch, mutation success |
| Server | Prisma query result | None (stateless) | N/A |
| Database | Connection pooling | Connection reuse | Prisma manages |
| CDN | Vercel Edge (static assets) | Immutable | Deployment |

### Performance Optimizations

1. **Bundle Splitting**: Next.js automatic code splitting per route
2. **Image Optimization**: Next.js Image component with sharp
3. **Font Optimization**: next/font for zero-layout-shift fonts
4. **Query Deduplication**: TanStack Query deduplicates identical requests
5. **Optimistic Updates**: Immediate UI response before server confirmation
6. **Skeleton Loading**: Progressive content loading with shadcn/ui Skeleton

### Database Indexing Strategy

All frequently queried fields have database indexes:

```prisma
@@index([email])        // User lookup
@@index([status])       // Competition/Registration filtering
@@index([userId])       // Related record queries
@@index([createdAt])    // Chronological sorting
@@index([entityType])   // Audit log filtering
```

---

## 13. Security Architecture

### Security Layers

```
┌──────────────────────────────────────────────┐
│              APPLICATION SECURITY             │
│  ├── Input Validation (Zod schemas)           │
│  ├── Output Sanitization                      │
│  └── CSRF Protection (SameSite cookies)       │
├──────────────────────────────────────────────┤
│              AUTHENTICATION                   │
│  ├── JWT Sessions (NextAuth.js)               │
│  ├── Password Hashing (bcrypt)                │
│  └── Email Verification Tokens                │
├──────────────────────────────────────────────┤
│              AUTHORIZATION                    │
│  ├── Role-Based Access Control (5 roles)      │
│  ├── Named Permissions (14 permissions)       │
│  └── Resource-Level Access Checks             │
├──────────────────────────────────────────────┤
│              DATA SECURITY                    │
│  ├── File Integrity (SHA-256 hashing)         │
│  ├── Payment Signature Verification           │
│  ├── Parameterized Queries (Prisma)           │
│  └── Audit Logging (immutable trail)          │
├──────────────────────────────────────────────┤
│              INFRASTRUCTURE SECURITY          │
│  ├── Environment Variables (.env.local)       │
│  ├── HTTPS (Vercel default)                   │
│  └── Secure Headers (Next.js config)          │
└──────────────────────────────────────────────┘
```

---

## 14. Scalability Considerations

### Current Scalability Features

1. **Stateless API Routes**: Each request is independent, enabling horizontal scaling
2. **Database Connection Pooling**: Prisma manages connection pools efficiently
3. **Serverless Deployment**: Vercel auto-scales based on traffic
4. **CDN for Static Assets**: Vercel Edge Network serves static files globally
5. **Neon PostgreSQL**: Serverless Postgres with auto-scaling compute

### Scaling Path

```
┌──────────────────────────────────────────────────────┐
│                   SINGLE SERVER                       │
│  Vercel Hobby (free)                                 │
│  - Single region                                     │
│  - SQLite / Neon Free Tier                           │
│  - Suitable for: < 1,000 users                       │
├──────────────────────────────────────────────────────┤
│                  PRODUCTION TIER                      │
│  Vercel Pro                                           │
│  - Multi-region Edge                                 │
│  - Neon Pro (auto-scaling)                           │
│  - Suitable for: 1,000 - 100,000 users               │
├──────────────────────────────────────────────────────┤
│                   ENTERPRISE                          │
│  Vercel Enterprise + Custom Infra                    │
│  - Multi-region with edge functions                  │
│  - Managed PostgreSQL (AWS RDS / Neon Scale)         │
│  - Redis caching layer                               │
│  - Queue-based async processing                      │
│  - Suitable for: 100,000+ users                      │
└──────────────────────────────────────────────────────┘
```

### Future Enhancement Points

| Feature | Description | Priority |
|---|---|---|
| Redis Cache | Cache dashboard stats, competition data | Medium |
| Message Queue | Async email sending, webhook processing | Medium |
| WebSocket | Real-time notifications via Socket.io | Low |
| File Upload to S3 | Replace Cloudinary with S3 for cost | Low |
| Rate Limiting | Per-user API rate limiting | High |
| E2E Testing | Playwright test suite | Medium |

---

## 15. Deployment Architecture

### Vercel Deployment

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL PLATFORM                    │
│  ┌──────────────────────────────────────────────────┐│
│  │              Edge Network (CDN)                   ││
│  │  Static Assets, Images, Fonts                    ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │           Serverless Functions                    ││
│  │  API Routes (auto-scaled)                         ││
│  │  Next.js SSR (if needed)                          ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
         │                              │
         │                              │
┌────────▼─────────┐      ┌────────────▼─────────┐
│   Neon Database   │      │   External Services   │
│   (PostgreSQL)    │      │   Razorpay, Resend,   │
│                   │      │   Cloudinary           │
└───────────────────┘      └───────────────────────┘
```

### Build Configuration

- **Output Mode**: `standalone` (optimized for Vercel serverless)
- **Image Optimization**: `sharp` for server-side image processing
- **Environment**: Variables configured in Vercel dashboard

### Deployment Steps

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Configure environment variables
4. Deploy (automatic on push to `main`)
5. Run database migrations against Neon

---

*This architecture document is a living reference. Update it as the system evolves.*
