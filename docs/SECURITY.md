# NexusBoard - Security Documentation

> **Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Authorization (RBAC)](#2-authorization-rbac)
3. [Input Validation](#3-input-validation)
4. [Data Protection](#4-data-protection)
5. [API Security](#5-api-security)
6. [File Upload Security](#6-file-upload-security)
7. [Payment Security](#7-payment-security)
8. [Audit Logging](#8-audit-logging)
9. [Environment Security](#9-environment-security)
10. [Security Checklist](#10-security-checklist)

---

## 1. Authentication

### Session Management

- Sessions managed via **NextAuth.js v4** with JWT tokens
- Tokens are signed with `AUTH_SECRET` and stored in HTTP-only cookies
- Session expiry is configurable (default: 30 days)

### Password Security

- Passwords are hashed using **bcrypt** (salt rounds: 12)
- Plain-text passwords are never stored or logged
- Password reset tokens expire after 1 hour

### Email Verification

- Users must verify their email before accessing certain features
- Verification tokens are single-use and expire after 24 hours

---

## 2. Authorization (RBAC)

### Role Hierarchy

```
SUPER_ADMIN > ADMIN > TEACHER = EXAMINER = STUDENT
```

### Permission Checks

Every API route enforces role-based access:

```typescript
// Example from an admin-only endpoint
if (!user.roles.includes('SUPER_ADMIN') && !user.roles.includes('ADMIN')) {
  return NextResponse.json(
    { success: false, error: 'Access denied' },
    { status: 403 }
  );
}
```

### Named Permissions

Admin users have granular permissions (14 total) checked individually for sensitive operations.

---

## 3. Input Validation

### Zod Schemas

All API inputs are validated using Zod:

```typescript
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### SQL Injection Prevention

- All database queries use **Prisma ORM** with parameterized queries
- Raw SQL is never used
- User input is never interpolated into queries

### XSS Prevention

- React automatically escapes rendered content
- No use of `dangerouslySetInnerHTML` without sanitization
- File uploads are validated for type and size

---

## 4. Data Protection

### File Integrity

- Essay PDFs are hashed using **SHA-256** before storage
- Hash is stored in the database for integrity verification

### Sensitive Data

- Passwords: bcrypt hashed
- API keys: environment variables only
- Payment signatures: verified server-side
- User PII: minimal collection principle

---

## 5. API Security

### Rate Limiting

- Vercel provides built-in rate limiting
- Custom rate limiting can be added via middleware

### CORS

- Same-origin policy by default (SPA architecture)
- API routes only accept requests from the same origin

### HTTP Headers

Security headers configured in `next.config.ts`:

```typescript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

---

## 6. File Upload Security

### Validation Rules

- **File type**: Only PDF (`application/pdf`)
- **File size**: Max 5 MB (configurable per competition)
- **File name**: Original name is stored but file is renamed on Cloudinary
- **File hash**: SHA-256 computed for integrity

---

## 7. Payment Security

- **Key management**: `RAZORPAY_KEY_SECRET` never exposed to client
- **Signature verification**: HMAC-SHA256 verification on every payment callback
- **Webhook authentication**: Webhooks verified using `RAZORPAY_WEBHOOK_SECRET`
- **Idempotency**: Razorpay order IDs prevent duplicate processing

---

## 8. Audit Logging

### What is Logged

- User authentication events (login, logout, failed attempts)
- Data modifications (create, update, delete)
- Payment events (order creation, verification, refund)
- Admin actions (role changes, settings updates)

### Audit Log Fields

```typescript
interface AuditLog {
  userId: string;        // Who performed the action
  userRole: string;      // Role at time of action
  action: string;        // What was done (e.g., 'COMPETITION_CREATE')
  entityType: string;    // What was affected (e.g., 'Competition')
  entityId: string;      // ID of affected entity
  previousValue: string; // Before state (JSON)
  newValue: string;      // After state (JSON)
  ipAddress: string;     // Client IP
  userAgent: string;     // Browser user agent
  requestId: string;     // For tracing
}
```

### Audit Log Access

- Only SUPER_ADMIN role can view audit logs
- Logs are immutable (no update/delete operations)
- Logs are indexed for fast querying

---

## 9. Environment Security

### Environment Variables

- All secrets stored in `.env.local` (never committed to git)
- `.env*` patterns are in `.gitignore`
- Production secrets configured in Vercel dashboard

### Dependency Security

- Run `bun audit` regularly to check for vulnerabilities
- Dependencies are pinned in `bun.lock`

---

## 10. Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT-based session management
- [x] Role-based access control on all endpoints
- [x] Input validation with Zod schemas
- [x] SQL injection prevention via Prisma ORM
- [x] XSS prevention via React auto-escaping
- [x] File upload validation (type, size, hash)
- [x] Payment signature verification
- [x] Audit logging for all critical operations
- [x] Environment variables not committed to git
- [x] Security HTTP headers configured
- [x] HTTPS enforced on Vercel
- [ ] Rate limiting (enhancement)
- [ ] CSP headers (enhancement)
- [ ] Two-factor authentication (enhancement)

---

*For the full architecture, see [docs/ARCHITECTURE.md](ARCHITECTURE.md).*
