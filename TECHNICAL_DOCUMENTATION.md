# NexusBoard — Technical Documentation

## SaaS Analytics & Project Management Platform

**Version:** 1.0.0  
**Framework:** Next.js 16 (App Router)  
**Runtime:** Node.js / Bun  
**Deployment Target:** Vercel

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [State Management](#6-state-management)
7. [API Routes](#7-api-routes)
8. [Component Architecture](#8-component-architecture)
9. [Authentication Flow](#9-authentication-flow)
10. [Views & Features](#10-views--features)
11. [Deployment Guide](#11-deployment-guide)
12. [Environment Variables](#12-environment-variables)
13. [Development Workflow](#13-development-workflow)
14. [Scalability Considerations](#14-scalability-considerations)
15. [Security Considerations](#15-security-considerations)

---

## 1. Project Overview

**NexusBoard** is a production-ready SaaS analytics dashboard and project management platform. It provides teams with a comprehensive workspace for managing projects, tracking tasks, analyzing performance metrics, and collaborating effectively.

### Key Features
- **Authentication System** — Login/Register with workspace creation
- **Dashboard Analytics** — KPI cards, area charts, pie charts, bar charts
- **Project Management** — CRUD operations, status tracking, budget management, progress monitoring
- **Team Management** — Member invitation, role-based access control (Owner/Admin/Manager/Member)
- **Deep Analytics** — Multi-tab analytics with project trends, task velocity, priority distribution, budget analysis
- **Settings** — Profile management, theme switching (light/dark/system), notification preferences
- **Notifications** — Real-time notification feed with read/unread states

### Demo Credentials
```
Email: alex@nexusboard.app
Password: demo123
```

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Zustand │ │ TanStack│ │ shadcn/ui│ │   Recharts       │  │
│  │  Store   │ │  Query  │ │ Components│ │  Charts          │  │
│  └────┬────┘ └────┬────┘ └──────────┘ └──────────────────┘  │
│       │           │                                           │
│  ┌────┴───────────┴───────────────────────────────────────┐  │
│  │              Next.js App Router (SPA Mode)              │  │
│  │         Client-side view routing via Zustand            │  │
│  └─────────────────────────┬─────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP (REST)
┌────────────────────────────┼────────────────────────────────┐
│                      API Layer (Next.js Route Handlers)      │
│  ┌─────────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐   │
│  │ /api/auth   │ │/api/dash │ │/api/proj│ │ /api/team    │   │
│  └──────┬──────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘   │
│         └──────────────┴───────────┴──────────────┘          │
│                              │                               │
│  ┌───────────────────────────┴─────────────────────────┐   │
│  │                    Prisma ORM                         │   │
│  └───────────────────────────┬─────────────────────────┘   │
└────────────────────────────┼───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                     Database Layer                           │
│  ┌──────────────────────────┴─────────────────────────┐   │
│  │              SQLite (development)                     │   │
│  │         PostgreSQL (production — Vercel Postgres)      │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Architectural Patterns

1. **SPA-style Routing** — Uses Zustand-based client-side navigation with a single `/` route. All views are rendered in-place via the `AppShell` component, avoiding full-page reloads and enabling smooth Framer Motion transitions.

2. **API Route Handlers** — All backend logic is exposed through Next.js Route Handlers (`route.ts` files) under `/api/*`. These are stateless RESTful endpoints.

3. **State Management Split**:
   - **Zustand** (client state): Auth, navigation, workspace, notifications
   - **Server State** (API + React Query pattern): Data fetched on-demand from API routes

4. **Repository Pattern** — Database access is encapsulated through Prisma ORM, providing a clean abstraction over the data layer.

---

## 3. Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|----------|
| **Framework** | Next.js | 16.x | React framework with App Router |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Library** | shadcn/ui | latest | Radix-based component library |
| **Database ORM** | Prisma | 6.x | Type-safe database client |
| **Database** | SQLite / PostgreSQL | — | Data persistence (dev/prod) |
| **Client State** | Zustand | 5.x | Lightweight state management |
| **Server State** | TanStack Query | 5.x | Async data fetching (available) |
| **Charts** | Recharts | 2.x | Data visualization library |
| **Animations** | Framer Motion | 12.x | Page transitions and micro-interactions |
| **Forms** | React Hook Form | 7.x | Performant form management |
| **Validation** | Zod | 4.x | Schema validation |
| **Theming** | next-themes | 0.4.x | Dark/light/system theme support |
| **Toasts** | Sonner | 2.x | Toast notifications |
| **Icons** | Lucide React | latest | SVG icon library |
| **Date Utils** | date-fns | 4.x | Date formatting and manipulation |

---

## 4. Project Structure

```
nexusboard/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── seed.ts                # Demo data seeder
├── db/
│   └── custom.db              # SQLite database file (gitignored)
├── public/
│   ├── robots.txt             # SEO robots configuration
│   └── favicon.ico             # Favicon
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Single-page entry (renders AppShell)
│   │   ├── globals.css         # Global styles and CSS variables
│   │   └── api/                # API Route Handlers
│   │       ├── auth/route.ts       # Authentication (login/register/me)
│   │       ├── dashboard/route.ts  # Dashboard statistics and charts
│   │       ├── projects/route.ts   # Projects CRUD
│   │       ├── team/route.ts       # Team member management
│   │       ├── analytics/route.ts  # Analytics data
│   │       ├── settings/route.ts   # User settings
│   │       └── notifications/route.ts # Notification management
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── app-shell.tsx   # Main app shell with auth routing
│   │   │   ├── app-sidebar.tsx # Collapsible sidebar navigation
│   │   │   └── app-header.tsx  # Top header with breadcrumbs & controls
│   │   ├── views/              # Page view components
│   │   │   ├── dashboard-view.tsx   # Dashboard with KPIs & charts
│   │   │   ├── projects-view.tsx    # Project management
│   │   │   ├── team-view.tsx        # Team management
│   │   │   ├── analytics-view.tsx   # Deep analytics with tabs
│   │   │   ├── settings-view.tsx    # Settings & preferences
│   │   │   └── notifications-view.tsx # Notification center
│   │   ├── auth/               # Authentication views
│   │   │   ├── login-view.tsx       # Login form
│   │   │   └── register-view.tsx    # Registration form
│   │   ├── ui/                 # shadcn/ui components (40+ components)
│   │   └── providers.tsx       # ThemeProvider wrapper
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── store.ts            # Zustand stores (auth, nav, workspace, notifications)
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── constants.ts        # App constants (nav items, color maps)
│   │   └── utils.ts            # Utility functions (cn, etc.)
│   └── hooks/
│       ├── use-mobile.ts       # Mobile viewport detection
│       └── use-toast.ts        # Toast hook
├── .env                        # Environment variables
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── package.json                # Dependencies and scripts
└── TECHNICAL_DOCUMENTATION.md  # This file
```

---

## 5. Database Schema

### Entity Relationship Diagram

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  User    │────>│ WorkspaceMember  │<────│Workspace │
│          │     │  (role, joinedAt)│     │          │
└────┬─────┘     └──────────────────┘     └────┬─────┘
     │                                         │
     │           ┌──────────┐                 │
     └──────────>│  Task    │<────────────────┘
     │           │          │                 │
     │           └────┬─────┘                 │
     │                │                       │
     │     ┌──────────┴──────────┐            │
     │     │     Project         │<───────────┘
     │     │  (status, budget,   │
     │     │   progress, etc.)   │
     │     └─────────────────────┘
     │
     ├──── ActivityLog
     ├──── AppNotification
     └──── Invite

Workspace ──> AnalyticsEvent
```

### Models

#### User
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| email | String (unique) | Login email |
| passwordHash | String | Password (plain text in demo) |
| name | String | Display name |
| avatar | String? | Avatar URL |
| bio | String? | User biography |
| phone | String? | Phone number |
| timezone | String | User timezone (default: UTC) |
| isActive | Boolean | Account active status |
| lastLoginAt | DateTime? | Last login timestamp |

#### Workspace
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Workspace name |
| slug | String (unique) | URL-friendly identifier |
| description | String? | Workspace description |
| plan | String | FREE / PRO / ENTERPRISE |
| ownerId | String (FK) | Workspace owner reference |

#### Project
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| workspaceId | String (FK) | Parent workspace |
| name | String | Project name |
| key | String | Identifier (e.g. NEX-001) |
| status | String | ACTIVE / ARCHIVED / ON_HOLD / COMPLETED |
| priority | String | LOW / MEDIUM / HIGH / CRITICAL |
| budget | Float? | Total budget |
| spent | Float | Amount spent |
| progress | Int | Completion percentage (0-100) |

#### Task
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| projectId | String (FK) | Parent project |
| assigneeId | String? (FK) | Assigned user |
| title | String | Task title |
| status | String | TODO / IN_PROGRESS / IN_REVIEW / DONE / CANCELLED |
| priority | String | LOW / MEDIUM / HIGH / CRITICAL |
| dueDate | DateTime? | Due date |

---

## 6. State Management

### Zustand Stores

#### Auth Store (`useAuthStore`)
- `isAuthenticated` — Whether user is logged in
- `user` — Current user data (id, name, email, role, etc.)
- `token` — Session token (in-memory, demo purposes)
- `setAuth(user, token)` — Set authenticated state
- `clearAuth()` — Logout
- `updateUser(data)` — Update user profile in state

#### Navigation Store (`useNavStore`)
- `currentView` — Active view identifier (NavView type)
- `navigate(view)` — Change active view

#### Workspace Store (`useWorkspaceStore`)
- `workspace` — Current workspace data
- `setWorkspace(workspace)` — Set active workspace
- `clearWorkspace()` — Clear workspace

#### Notification Store (`useNotificationStore`)
- `notifications` — List of notifications
- `unreadCount` — Unread notification count
- `setNotifications(notifications)` — Load notifications from API
- `markAsRead(id)` / `markAllAsRead()` — Mark notifications as read

### Navigation Flow

```
LoginView ──(success)──> DashboardView
RegisterView ──(auto-login)──> DashboardView
DashboardView ──(sidebar click)──> ProjectsView / TeamView / AnalyticsView / SettingsView
Header (Notifications bell) ──> NotificationsView
```

---

## 7. API Routes

### POST /api/auth
**Body:** `{ action: 'login', email, password }` or `{ action: 'register', name, email, password }`

| Action | Description | Response |
|--------|-------------|----------|
| login | Authenticate user | `{ user, workspace, token }` |
| register | Create account + workspace | `{ user, message }` |

### GET /api/auth
**Headers:** `Authorization: Bearer <token>`
**Response:** `{ user, workspace }`

### GET /api/dashboard
**Response:**
```json
{
  "stats": { "totalProjects": 10, "activeProjects": 6, "totalTasks": 30, "completedTasks": 8, "totalMembers": 8, "completionRate": 27 },
  "monthlyData": [{ "name": "Jul", "projects": 4 }],
  "activities": [{ "id": "...", "action": "CREATED", "user": { "name": "..." }, "createdAt": "..." }],
  "statusDistribution": [{ "name": "Active", "value": 6 }],
  "taskDistribution": [{ "name": "To Do", "count": 12 }]
}
```

### GET /api/projects
**Response:** Array of project objects with `_count.tasks`

### POST /api/projects
**Body:** `{ name, description?, priority?, budget? }`
**Response:** Created project object

### PUT /api/projects
**Body:** `{ id, status }`
**Response:** Updated project

### DELETE /api/projects?id=<id>
**Response:** `{ success: true }`

### GET /api/team
**Response:** Array of workspace members with user data and task counts

### POST /api/team
**Body:** `{ email, role }`
**Response:** Created workspace member

### PUT /api/team
**Body:** `{ userId, role }`
**Response:** Updated workspace member

### DELETE /api/team?userId=<id>
**Response:** `{ success: true }`

### GET /api/analytics
**Response:** `{ projectTrend, priorityDist, budgetData, taskVelocity }`

### PUT /api/settings
**Body:** `{ userId?, name?, bio?, phone?, timezone? }`
**Response:** Updated user data

### GET /api/notifications
**Response:** Array of notification objects

### PUT /api/notifications
**Body:** `{ action: 'markRead', id }` or `{ action: 'markAllRead' }`
**Response:** `{ success: true }`

---

## 8. Component Architecture

### Layout Components

#### AppShell (`src/components/layout/app-shell.tsx`)
The root component that manages the entire application layout:
- **Unauthenticated**: Renders Login/Register views with gradient background
- **Authenticated**: Renders Sidebar + Header + Content area
- Uses Framer Motion `AnimatePresence` for page transitions
- Client-side view routing via `useNavStore`

#### AppSidebar (`src/components/layout/app-sidebar.tsx`)
- Collapsible sidebar using shadcn `Sidebar` component
- Dynamic icon mapping from `NAV_ITEMS` constant
- NexusBoard branding with workspace name
- User profile dropdown at footer with logout

#### AppHeader (`src/components/layout/app-header.tsx`)
- Breadcrumb navigation (NexusBoard > Current View)
- Decorative search input (desktop only)
- Theme toggle (light/dark) via next-themes
- Notification bell with unread badge
- User avatar dropdown menu

### View Components

Each view is a self-contained `'use client'` component that:
1. Fetches its own data from API routes
2. Manages local loading/error states
3. Handles user interactions (CRUD, filtering, navigation)
4. Uses shadcn/ui components for consistent UI

---

## 9. Authentication Flow

### Login Flow
```
1. User enters email + password on LoginView
2. Form validated with Zod schema (email required, password min 6 chars)
3. POST /api/auth with { action: 'login', email, password }
4. Server: Find user by email, compare password, update lastLoginAt
5. Server: Generate UUID token, store in in-memory Map
6. Server: Return { user, workspace, token }
7. Client: setAuth(user, token), setWorkspace(workspace)
8. Navigate to 'dashboard'
```

### Registration Flow
```
1. User fills name + email + password + confirm password
2. Form validated with Zod (all fields required, passwords must match)
3. POST /api/auth with { action: 'register', name, email, password }
4. Server: Create User + Workspace + WorkspaceMember(OWNER) in transaction
5. Client: Auto-login with POST /api/auth { action: 'login' }
6. Navigate to 'dashboard'
```

### Session Management
- Tokens stored in Zustand state (in-memory, lost on refresh in demo)
- For production: Use NextAuth.js v4 with database sessions or JWT with httpOnly cookies

---

## 10. Views & Features

### Dashboard
- **4 KPI Cards**: Total Projects, Active Tasks, Team Members, Completion Rate
- **Area Chart**: Monthly project trend (6 months)
- **Donut Chart**: Project status distribution
- **Activity Feed**: Recent workspace activity with relative timestamps
- **Bar Chart**: Tasks by status distribution
- Loading skeletons for all data sections

### Projects
- **Card Grid**: Responsive project cards (1/2/3 columns)
- **CRUD**: Create, delete, and status change via dialog/dropdown
- **Search**: Full-text search by name and description
- **Filter**: Status-based filtering (All, Active, On Hold, Completed, Archived)
- **Project Cards**: Key badge, progress bar, budget info, task count

### Team
- **Member List**: Card-based member display
- **Search & Filter**: By name/email and role
- **Invite Dialog**: Email + role selection
- **Role Management**: Change roles, remove members
- **Avatar Initials**: Generated from user names

### Analytics
- **4 Tabs**: Overview, Projects, Tasks, Budget
- **Charts**: Bar, Line, Area, Pie charts with recharts
- **Real Data**: Fetched from /api/analytics (falls back to sample data)

### Settings
- **4 Tabs**: Profile, Appearance, Notifications, Security
- **Profile**: Name, phone, bio, timezone editing
- **Appearance**: Theme picker (Light/Dark/System) with visual preview
- **Notifications**: Toggle switches for notification preferences
- **Security**: Email display, danger zone

### Notifications
- **Feed**: Chronological notification list
- **Unread State**: Visual distinction with left border
- **Bulk Actions**: Mark all as read
- **Click to Read**: Individual notification marking

---

## 11. Deployment Guide

### Deploying to Vercel

#### Prerequisites
- Vercel account (free tier works)
- GitHub repository

#### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NexusBoard SaaS Platform"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" → Import from GitHub
   - Select your repository

3. **Configure Environment Variables**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```
   - Use Vercel Postgres (free tier) or any PostgreSQL provider

4. **Update Prisma for PostgreSQL**
   In `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

5. **Deploy**
   - Vercel auto-detects Next.js and configures the build
   - Add a post-install script:
     ```json
     { "scripts": { "postinstall": "prisma generate" } }
     ```
   - Run `npx prisma db push` after first deploy to sync the schema

#### Production Considerations
- Replace in-memory token store with NextAuth.js or JWT cookies
- Use bcrypt for password hashing (already available in the auth route)
- Add rate limiting to API routes
- Set up proper CORS headers
- Configure CDN caching for static assets

---

## 12. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./db/custom.db` | Prisma database connection string |

For Vercel deployment:
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Vercel Postgres) |
| `NEXTAUTH_SECRET` | Random string for session encryption (if using NextAuth) |
| `NEXTAUTH_URL` | Your Vercel deployment URL |

---

## 13. Development Workflow

### Setup

```bash
# Install dependencies
bun install

# Set up database (SQLite for development)
bun run db:push

# Generate Prisma client
bun run db:generate

# Seed demo data
DATABASE_URL="file:./db/custom.db" npx tsx prisma/seed.ts

# Start development server
bun run dev
```

### Available Scripts

```bash
bun run dev        # Start development server (port 3000)
bun run lint       # Run ESLint
bun run db:push    # Push Prisma schema to database
bun run db:generate # Generate Prisma client
bun run db:migrate  # Run Prisma migrations
bun run seed       # Seed database with demo data
```

### Adding a New View

1. Create component in `src/components/views/<name>-view.tsx`
2. Add `NavView` type in `src/lib/types.ts`
3. Add nav item in `src/lib/constants.ts` `NAV_ITEMS` array
4. Import and map in `src/components/layout/app-shell.tsx`
5. Create API route in `src/app/api/<name>/route.ts`
6. Add lucide icon to `iconMap` in `app-sidebar.tsx`

---

## 14. Scalability Considerations

### Current Architecture (Demo)
- **SQLite**: File-based, single-writer (perfect for development)
- **In-memory tokens**: Fast but lost on restart
- **Single workspace**: Simplified for demo

### Production Scaling Path

1. **Database**: Migrate to PostgreSQL via Prisma (change 1 line in schema.prisma)
2. **Authentication**: Integrate NextAuth.js v4 with database adapter
3. **Multi-tenancy**: Add workspace slug to all queries for data isolation
4. **Caching**: Add Redis or Vercel KV for session store and frequently accessed data
5. **File Uploads**: Integrate Vercel Blob or S3 for avatars and attachments
6. **Real-time**: Add WebSocket/Socket.io for live notifications and task updates
7. **API Rate Limiting**: Add middleware-based rate limiting
8. **Background Jobs**: Use Vercel Cron or external job queue for reports/exports
9. **CDN**: Vercel Edge Network for static assets
10. **Monitoring**: Add Sentry for error tracking, Vercel Analytics for performance

### Horizontal Scaling
- Stateless API routes (ready for serverless scaling)
- Database connection pooling (Prisma supports PgBouncer)
- Each API route is independently deployable

---

## 15. Security Considerations

### Current (Demo)
- Plain-text password storage (simplified for demonstration)
- In-memory session tokens
- No CSRF protection
- No rate limiting

### Production Checklist
- [ ] Hash passwords with bcrypt (replace `passwordHash` comparison)
- [ ] Use NextAuth.js with httpOnly cookies for sessions
- [ ] Add CSRF tokens to forms
- [ ] Implement API rate limiting
- [ ] Add Content Security Policy headers
- [ ] Enable CORS with specific origins
- [ ] Add input sanitization for user-generated content
- [ ] Implement proper RBAC (Role-Based Access Control) middleware
- [ ] Add audit logging for sensitive operations
- [ ] Enable HTTPS-only cookies
- [ ] Set up regular database backups

---

## License

MIT License — Free for personal and commercial use.

---

Built with ❤️ using Next.js, TypeScript, Prisma, Tailwind CSS, and shadcn/ui.
