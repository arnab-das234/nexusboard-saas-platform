# Essay Writing Competition Management System — Security Architecture

> **Classification:** Internal | **Last Updated:** 2025 | **Threat Model:** Web Application

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Authentication Security](#authentication-security)
3. [Authorization Model](#authorization-model)
4. [Input Validation](#input-validation)
5. [File Upload Security](#file-upload-security)
6. [Payment Security](#payment-security)
7. [API Security](#api-security)
8. [Data Privacy](#data-privacy)
9. [Content Security Policy](#content-security-policy)
10. [Audit Logging](#audit-logging)
11. [Known Limitations & Production Hardening](#known-limitations--production-hardening)

---

## Security Principles

### Core Tenets

| Principle | Implementation |
-----------|---------------|
| **Least Privilege** | ADMIN users have only the permissions explicitly granted via `AdminPermission`. Students and examiners see only their own data. |
| **Defense in Depth** | Input validation at both client (Zod) and server (manual checks). Prisma parameterized queries prevent SQL injection. |
| **Never Trust the Client** | All business logic, authorization checks, and data transformations happen server-side. Client state is for UI only. |
| **Fail Securely** | Default-deny on role checks. Missing permissions mean access denied. Unhandled errors return 500 without data leakage. |
| **Immutable Audit Trail** | AuditLog entries are append-only with no update/delete operations. |

---

## Authentication Security

### Password Storage

| Aspect | Development | Production (Required) |
--------|------------|----------------------|
| Algorithm | Plain text | bcrypt (cost factor 12) |
| Library | — | `bcryptjs` or `bcrypt` |
| Storage | `User.passwordHash` | `User.passwordHash` |

**Current state (dev):**
```typescript
const passwordHash = password; // Dev: plain text
```

**Required for production:**
```typescript
import bcrypt from 'bcryptjs';
const passwordHash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### Session Management

| Aspect | Current | Production (Required) |
--------|---------|----------------------|
| Storage | `localStorage` (Zustand persist) | HTTP-only secure cookie |
| Token | None (session object) | JWT (access + refresh) or NextAuth.js session |
| Expiration | None (persists until logout) | Access: 15min, Refresh: 7 days |
| Rotation | None | Refresh token rotation on use |
| Revocation | Clear localStorage | Token blacklist or DB-backed sessions |

**Risk:** Client-side `localStorage` is accessible to any JavaScript running on the page (XSS vulnerability). Production must migrate to HTTP-only cookies.

### CSRF Protection

| Aspect | Current | Production (Required) |
--------|---------|----------------------|
| Protection | None | SameSite cookies + CSRF token |
| Implementation | — | Next.js middleware + `next-auth` built-in CSRF |

With JWT-in-cookie approach:
- Set `SameSite=Lax` on cookies
- Use `Secure` flag in production
- Add double-submit CSRF token for state-changing requests

### Login Brute Force Protection

| Aspect | Current | Production (Required) |
--------|---------|----------------------|
| Rate limiting | None | Per-IP and per-email rate limiting |
| Account lockout | None | Progressive delays, temporary lockout |
| CAPTCHA | None | After N failed attempts |

**Recommended:** Implement rate limiting via Vercel Edge Middleware or a dedicated middleware layer.

---

## Authorization Model

### Role-Based Access Control (RBAC)

The system implements a hybrid RBAC model:

```
SUPER_ADMIN ──→ Full access (all permissions implied)
    │
ADMIN ──────→ Permission-based access (AdminPermission table)
    │            Each action checks specific permission
    │
TEACHER ────→ Own data only (referred students, own profile)
STUDENT ────→ Own data only (registrations, essays, results)
EXAMINER ──→ Assigned essays only (workspace, evaluations)
```

### Permission Enforcement Points

| Layer | Mechanism | Strength |
-------|-----------|----------|
| **Sidebar rendering** | Conditional `hasRole()` / permission check | UI-level only, bypassable |
| **API routes** | Manual role checks in handlers | Server-side, but inconsistent |
| **Database queries** | Filter by userId where applicable | Data-level isolation |

### Current Gaps

1. **No middleware-based auth:** Each API route must manually check authentication
2. **No permission middleware:** Admin permission checks are not enforced at route level
3. **No data-scoping:** Admin sees all data; no tenant/isolation enforcement
4. **No route protection:** API routes don't reject unauthenticated requests

### Recommended Middleware Pattern

```typescript
// src/middleware.ts
export function withAuth(
  handler: Function,
  options: { roles?: UserRole[]; permissions?: AdminPermission[] }
) {
  return async (request: NextRequest) => {
    const session = getSession(request);
    if (!session) return error(401, 'Unauthorized');
    if (options.roles && !options.roles.some(r => session.roles.includes(r))) {
      return error(403, 'Insufficient role');
    }
    if (options.permissions) {
      const perms = await getUserPermissions(session.id);
      if (!options.permissions.every(p => perms.includes(p))) {
        return error(403, 'Insufficient permissions');
      }
    }
    return handler(request, session);
  };
}
```

---

## Input Validation

### Client-Side Validation

| Technology | Usage |
-----------|-------|
| Zod schemas | Form field validation (react-hook-form resolver) |
| HTML5 attributes | `required`, `min`, `max`, `type="email"` |
| React Hook Form | Real-time validation, error display |

### Server-Side Validation

All API routes perform manual validation:

```typescript
// Pattern used across all routes:
if (!email || !password) {
  return Response.json({ success: false, error: 'Email and password are required' }, { status: 400 });
}
if (password.length < 6) {
  return Response.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
}
```

### Validation Rules by Entity

| Entity | Rules | Location |
--------|-------|----------|
| User | Email format, password ≥ 6 chars, role in [STUDENT, TEACHER] | `/api/auth` register |
| Registration | Student/Competition exist, competition status, age eligibility, no duplicates | `/api/registrations` POST |
| Payment | Registration exists, not cancelled, no existing SUCCESS payment | `/api/payments` create-order |
| Essay | PDF only, file size ≤ max, registration valid, not locked | `/api/essays` POST |
| Evaluation | Assignment exists, not submitted, scores 0 ≤ marks ≤ maxMarks | `/api/evaluations` POST |
| Competition | Dates chronological, categories valid, criteria marks > 0 | `/api/competitions` POST |

### Production Hardening

- **Centralize Zod schemas** in a `src/lib/validations/` directory
- **Validate all query params** (searchParams) with Zod
- **Sanitize string inputs** to prevent XSS in stored content
- **Add request body size limits** via Next.js config

---

## File Upload Security

### Current Implementation

| Aspect | Status |
--------|--------|
| MIME type check | ✅ `file.type !== 'application/pdf'` |
| File size check | ✅ `fileSize > competition.maxEssayFileSize` |
| Magic bytes validation | ❌ Not implemented |
| Cloudinary upload | ⚠️ Mocked (no real upload) |
| Signed URLs | ⚠️ Planned |

### Required Production Implementation

#### 1. Magic Bytes Validation

PDF files start with `%PDF-` (bytes: `25 50 44 46 2D`). Validate before accepting:

```typescript
async function validatePdfMagicBytes(file: File): Promise<boolean> {
  const buffer = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 &&
         buffer[3] === 0x46 && buffer[4] === 0x2D;
}
```

#### 2. Cloudinary Signed Uploads

- Use **unsigned upload presets** only for development
- Production must use **signed uploads** with backend-generated signatures
- Set upload constraints in Cloudinary: `resource_type: raw`, `allowed_formats: pdf`

```typescript
// Server-side: generate signed upload params
import { v2 as cloudinary } from 'cloudinary';

const signature = cloudinary.utils.api_sign_request(
  { timestamp: Math.floor(Date.now() / 1000), ...params },
  process.env.CLOUDINARY_API_SECRET
);
```

#### 3. Upload Constraints

| Constraint | Value | Enforcement |
-----------|-------|-------------|
| Max file size | 5 MB (configurable per competition) | Server check + Cloudinary setting |
| Allowed types | `application/pdf` only | MIME check + magic bytes + Cloudinary setting |
| Filename sanitization | Strip special characters, limit length | Server-side transform |
| Virus scanning | Not implemented | Consider Cloudinary addon or external scanner |

---

## Payment Security

### Razorpay Integration Security

| Aspect | Status | Notes |
--------|--------|-------|
| Order creation | ✅ Server-side only | Client never creates orders directly |
| Signature verification | ⚠️ Mocked in dev | Must verify HMAC-SHA256 in production |
| Webhook signature | ⚠️ Not verified | Must verify `X-Razorpay-Signature` header |
| Amount validation | ✅ Server reads from DB | Amount comes from competition.registrationFee, not client |
| Idempotency | ✅ Webhook checks existing status | Prevents double-processing |

### Signature Verification (Production Required)

```typescript
import crypto from 'crypto';

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

### Webhook Verification (Production Required)

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

### Financial Safeguards

| Safeguard | Implementation |
-----------|---------------|
| Amount from DB | Fee read from `Competition.registrationFee`, not request body |
| No silent modification | Payment records are append-only via PaymentEvent |
| No delete | Payment records are never deleted |
| Idempotent webhooks | Status check before processing prevents double-credit |
| Refund requires admin | No self-service refunds |

---

## API Security

### Rate Limiting

| Aspect | Current | Production (Required) |
--------|---------|----------------------|
| Rate limiting | ❌ None | Per-IP, per-route, per-user rate limits |
| DDoS protection | ⚠️ Vercel built-in | Vercel + Cloudflare recommended |

**Recommended implementation:**
- Vercel Edge Middleware for global rate limiting
- Per-route limits: auth endpoints (10/min), payments (5/min), general (100/min)
- Use `@upstash/ratelimit` with Upstash Redis for serverless

### SQL Injection Prevention

**Status: ✅ Protected via Prisma ORM**

All database queries use Prisma's parameterized query builder. Raw SQL is never used. The `where` clauses use typed objects, making SQL injection impossible through the ORM layer.

```typescript
// Safe — Prisma parameterizes this
const users = await db.user.findMany({
  where: { email: userInput }, // Parameterized, not interpolated
});
```

### Input Sanitization

| Input Type | Sanitization | Location |
-----------|-------------|----------|
| JSON body | Type assertion (`as Type`) | All POST handlers |
| URL params | `searchParams.get()` (auto-decoded) | All handlers |
| File uploads | Filename sanitized, type checked | Essay upload |
| Stored content | No sanitization | ⚠️ XSS risk for markdown fields |

### Request Size Limits

| Request Type | Current Limit | Recommended |
-------------|---------------|------------|
| JSON body | Next.js default (varies) | 1 MB |
| File upload | None explicit | 10 MB (max essay + metadata) |

Configure in `next.config.ts`:
```typescript
export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    bodySizeLimit: '10mb',
  },
};
```

---

## Data Privacy

### Student PII Protection

| Data Element | Classification | Protection |
-------------|---------------|------------|
| Email | PII | Unique, used for login |
| Name | PII | Displayed in admin views |
| Date of Birth | PII | Required for age eligibility |
| Phone | PII | Optional contact field |
| Guardian info | PII | Parent/guardian details |
| School name | Non-PII | Organizational, not personal |
| Address | PII | Optional field |

### Blind Evaluation Privacy

When `ScoringConfig.blindEvaluation = true`:

- Examiner workspace **must not display** student name, email, or school
- Essay PDF metadata should be stripped before displaying
- Evaluation results are aggregated; individual examiner scores are not exposed to students
- Admin can see all data (audit requirement)

### Data Access by Role

| Data | SUPER_ADMIN | ADMIN | TEACHER | STUDENT | EXAMINER |
|------|:-----------:|:----:|:-------:|:-------:|:--------:|
| All user profiles | ✅ | ⚠️ perm | ❌ | ❌ | ❌ |
| Own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Referred students | ✅ | ✅ | ✅ | ❌ | ❌ |
| All registrations | ✅ | ⚠️ perm | ❌ | ❌ | ❌ |
| Own registrations | ✅ | ✅ | ❌ | ✅ | ❌ |
| Payment details | ✅ | ⚠️ perm | ❌ | Own only | ❌ |
| Essay files | ✅ | ✅ | ❌ | Own only | Assigned only |
| Evaluation scores | ✅ | ✅ | ❌ | ❌ | Own only |
| Final results | ✅ | ✅ | ❌ | Own only | ❌ |
| Audit logs | ✅ | ⚠️ perm | ❌ | ❌ | ❌ |

### GDPR Considerations

| Right | Implementation |
|-------|---------------|
| Right to access | Student can view own data via profile and results views |
| Right to rectification | Profile edit API (partially implemented) |
| Right to erasure | ⚠️ Not implemented — requires cascade delete with anonymization |
| Right to data portability | ⚠️ Not implemented — requires export endpoint |
| Right to withdraw consent | Account deactivation (`isActive = false`) |
| Data retention | No automatic retention policy — manual admin action |

---

## Content Security Policy

### Required CSP Directives

The application loads resources from multiple origins. A CSP header must allow:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com;
  frame-src https://checkout.razorpay.com;
  connect-src 'self' https://api.razorpay.com https://api.cloudinary.com;
  img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  object-src 'none';
```

### External Service Origins

| Service | Origin | Purpose |
---------|--------|---------|
| Razorpay Checkout | `https://checkout.razorpay.com` | Payment modal (iframe) |
| Razorpay API | `https://api.razorpay.com` | Order creation (server-side only) |
| Cloudinary | `https://res.cloudinary.com` | Essay PDF hosting |
| Cloudinary API | `https://api.cloudinary.com` | File upload (server-side only) |

### Implementation

Configure CSP via Next.js middleware:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com;
    frame-src https://checkout.razorpay.com;
    connect-src 'self' https://api.razorpay.com https://api.cloudinary.com;
    img-src 'self' data: https://res.cloudinary.com;
    style-src 'self' 'unsafe-inline';
  `);
  return response;
}
```

---

## Audit Logging

### What is Logged

| Action | Actor | Entity | Details |
--------|-------|--------|---------|
| `USER_LOGIN` | User | User | Login event |
| `USER_REGISTER` | User | User | Email, name, role |
| `EMAIL_VERIFIED` | User | User | Verification event |
| `REGISTRATION_CREATE` | Student/Admin | Registration | RegistrationNo, student, competition |
| `REGISTRATION_CANCEL` | Admin/Student | Registration | Previous + new status, reason |
| `PAYMENT_ORDER_CREATE` | Student | Payment | OrderId, amount |
| `PAYMENT_VERIFY` | System | Payment | Status, razorpay payment ID |
| `ESSAY_UPLOAD` | Student | EssaySubmission | File name, size, registration |
| `ESSAY_VALIDATE` | Admin | EssaySubmission | Valid/invalid, notes |
| `EVALUATION_SAVE_DRAFT` | Examiner | ExaminerEvaluation | Total marks, score count |
| `EVALUATION_SUBMIT` | Examiner | ExaminerEvaluation | Total marks, score count |
| `RESULT_CALCULATE` | Admin | Result | Scores, method, evaluation count |

### Audit Log Properties

| Field | Description | Immutability |
------|-------------|--------------|
| `userId` | Actor's user ID | Set at creation |
| `userRole` | Actor's role at time of action | Set at creation |
| `action` | Action identifier string | Set at creation |
| `entityType` | Type of entity affected | Set at creation |
| `entityId` | ID of entity affected | Set at creation |
| `previousValue` | JSON of before-state | Set at creation (update actions) |
| `newValue` | JSON of after-state | Set at creation |
| `ipAddress` | Actor's IP | Set at creation |
| `userAgent` | Actor's browser | Set at creation |
| `requestId` | Correlation ID | Set at creation |
| `createdAt` | Timestamp | Set at creation |

### Immutability

AuditLog entries are **never updated or deleted**. There are no `update` or `delete` operations on the AuditLog model in the codebase. The `createdAt` field provides temporal ordering. The `userId` foreign key is optional (nullable) to support system actions without a user actor.

### Gaps

| Gap | Risk | Mitigation |
|-----|------|-----------|
| No `requestId` populated | Cannot correlate logs across micro-requests | Generate UUID per request in middleware |
| No `ipAddress` populated | Cannot trace actions to source | Extract from `request.headers.get('x-forwarded-for')` |
| No `userAgent` populated | Cannot detect automated attacks | Extract from `request.headers.get('user-agent')` |
| No log retention policy | Unlimited growth | Add TTL or archival policy |

---

## Known Limitations & Production Hardening

### Critical (Must Fix Before Production)

| # | Issue | Severity | Fix |
---|-------|----------|-----|
| 1 | **Plain text passwords** | 🔴 Critical | Implement bcrypt hashing |
| 2 | **No server-side auth middleware** | 🔴 Critical | Add JWT/session verification to all API routes |
| 3 | **No CSRF protection** | 🔴 Critical | Implement SameSite cookies + CSRF tokens |
| 4 | **Session in localStorage** | 🔴 Critical | Migrate to HTTP-only secure cookies |
| 5 | **No rate limiting** | 🔴 Critical | Add per-IP and per-user rate limits |
| 6 | **No Razorpay signature verification** | 🔴 Critical | Implement HMAC-SHA256 verification |
| 7 | **No webhook signature verification** | 🔴 Critical | Verify `X-Razorpay-Signature` |
| 8 | **No file magic bytes validation** | 🟠 High | Validate PDF header bytes |
| 9 | **No input sanitization for stored content** | 🟠 High | Sanitize markdown/HTML fields |
| 10 | **No CSP headers** | 🟠 High | Add Content-Security-Policy middleware |

### High Priority

| # | Issue | Severity | Fix |
---|-------|----------|-----|
| 11 | No permission enforcement middleware | 🟠 High | Create `withAuth` wrapper for API routes |
| 12 | No HTTPS enforcement | 🟠 High | Vercel provides this; ensure no HTTP fallbacks |
| 13 | No password complexity requirements | 🟡 Medium | Add Zod password schema (min 8, mixed case, numbers) |
| 14 | No account lockout after failed logins | 🟡 Medium | Implement progressive delays |
| 15 | No CORS configuration | 🟡 Medium | Restrict allowed origins in production |
| 16 | Audit logs missing IP/UA/requestId | 🟡 Medium | Populate all audit log fields |
| 17 | No data encryption at rest | 🟡 Medium | Neon PostgreSQL provides encryption by default |

### Medium Priority

| # | Issue | Severity | Fix |
---|-------|----------|-----|
| 18 | No HSTS header | 🟡 Medium | Add via middleware or Vercel headers config |
| 19 | No X-Frame-Options / X-Content-Type-Options | 🟡 Medium | Add security headers middleware |
| 20 | No password reset flow | 🟡 Medium | Implement token-based reset (model exists) |
| 21 | No email verification enforcement | 🟡 Medium | Block login/registration if not verified |
| 22 | No session timeout | 🟡 Medium | Implement JWT expiry and refresh |
| 23 | No API key rotation for external services | 🟡 Medium | Document key rotation procedures |
| 24 | No dependency vulnerability scanning | 🟡 Medium | Add `npm audit` to CI pipeline |

### Security Headers Checklist (Production)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: (see CSP section above)
```
