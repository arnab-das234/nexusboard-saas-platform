# Payment System Documentation

> Essay Writing Competition Management System — Payment Module
> Version: 0.2.1 | Last Updated: 2025

---

## Table of Contents

1. [Payment Architecture Overview](#payment-architecture-overview)
2. [Razorpay Integration Flow](#razorpay-integration-flow)
3. [Order Creation](#order-creation)
4. [Payment Verification](#payment-verification)
5. [Webhook Handling](#webhook-handling)
6. [Payment State Machine](#payment-state-machine)
7. [Edge Cases](#edge-cases)
8. [Financial Immutability](#financial-immutability)
9. [Refund Flow](#refund-flow)
10. [Admin Financial Dashboard](#admin-financial-dashboard)
11. [Fee Configuration](#fee-configuration)
12. [Production Deployment Notes](#production-deployment-notes)

---

## Payment Architecture Overview

The payment system handles registration fee collection for essay writing competitions. It is built on **Razorpay** as the payment gateway and supports the full lifecycle from order creation through verification, webhook processing, and refunds.

### Key Design Principles

- **Server-side verification**: All payment confirmations are verified server-side using cryptographic signatures — never trust client-side data alone.
- **Idempotent processing**: Webhooks and verification endpoints are safe to call multiple times without side effects.
- **Audit trail**: Every state transition is recorded in `PaymentEvent` and `AuditLog` tables.
- **No silent modifications**: Financial records are never updated without a corresponding audit entry.

### Data Model Summary

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Payment` | Core payment record | `razorpayOrderId` (unique), `razorpayPaymentId` (unique), `amount`, `status`, `verifiedAt` |
| `PaymentEvent` | Immutable event log | `paymentId`, `eventType`, `eventData`, `ipAddress`, `userAgent` |
| `Registration` | Links payment to student/competition | `status` transitions to `PAID` on success |
| `Competition` | Source of fee amount | `registrationFee` (default: ₹100) |
| `AuditLog` | System-wide audit trail | `action`, `entityType`, `entityId`, `previousValue`, `newValue` |

### Currency

All payments are processed in **Indian Rupees (INR)**. The Razorpay API expects amounts in **paise** (₹100 = 10000 paise), while the system stores amounts in **rupees** as `Float` values. Conversion happens at the API boundary:

```typescript
// Sending to Razorpay (rupees → paise)
const amountInPaise = Math.round(amount * 100);

// Storing in database (paise → rupees)
const amountInRupees = amountInPaise / 100;
```

---

## Razorpay Integration Flow

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌───────────┐
│ Student  │       │  Next.js API │       │   Database   │       │  Razorpay │
│  Browser │       │  /api/payments│       │              │       │   Server  │
└────┬─────┘       └──────┬───────┘       └──────┬───────┘       └─────┬─────┘
     │                    │                      │                     │
     │ 1. POST create-order│                      │                     │
     │───────────────────>│                      │                     │
     │                    │ 2. Validate          │                     │
     │                    │    registration      │                     │
     │                    │─────────────────────>│                     │
     │                    │<─────────────────────│                     │
     │                    │ 3. Create Payment    │                     │
     │                    │    record (CREATED)  │                     │
     │                    │─────────────────────>│                     │
     │                    │                      │   4. Create order   │
     │                    │────────────────────────────────────────────>│
     │                    │<────────────────────────────────────────────│
     │                    │   5. Razorpay order  │                     │
     │<───────────────────│      object          │                     │
     │                    │                      │                     │
     │ 6. Open Razorpay    │                      │                     │
     │    Checkout modal   │                      │                     │
     │──────────────────────────────────────────────────────────────>│
     │<──────────────────────────────────────────────────────────────│
     │ 7. razorpay_payment_id + razorpay_signature                  │
     │                    │                      │                     │
     │ 8. POST verify      │                      │                     │
     │───────────────────>│                      │                     │
     │                    │ 9. Verify signature   │                     │
     │                    │    server-side       │                     │
     │                    │────────────────────────────────────────────>│
     │                    │<────────────────────────────────────────────│
     │                    │ 10. Update Payment   │                     │
     │                    │     (SUCCESS)        │                     │
     │                    │─────────────────────>│                     │
     │                    │ 11. Update Reg       │                     │
     │                    │     (PAID)           │                     │
     │                    │─────────────────────>│                     │
     │<───────────────────│ 12. Success response │                     │
     │                    │                      │                     │
     │    ─── ASYNC WEBHOOK PATH ───               │                     │
     │                    │                      │                     │
     │                    │ 13. POST webhook     │   14. Webhook       │
     │                    │     payment.captured │       event         │
     │                    │<────────────────────────────────────────────│
     │                    │ 15. Idempotent check  │                     │
     │                    │─────────────────────>│                     │
     │                    │ 16. Update if needed  │                     │
     │                    │─────────────────────>│                     │
```

---

## Order Creation

### Endpoint

```
POST /api/payments?action=create-order
```

### Purpose

Creates a Razorpay order and a corresponding `Payment` record in the database with status `CREATED`.

### Request Body

```json
{
  "registrationId": "clxyz123abc456",
  "userId": "cluser789def012"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `registrationId` | `string` | Yes | The registration record ID |
| `userId` | `string` | Yes | The user creating the order (must be the student) |

### Validation Rules

1. Both `registrationId` and `userId` must be present.
2. The registration must exist in the database.
3. The registration must not be `CANCELLED`.
4. No existing `SUCCESS` payment may exist for this registration (duplicate prevention).
5. The amount is read from `competition.registrationFee`, not from the request body.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "order_1719000000_a1b2c3d4",
    "amount": 10000,
    "currency": "INR",
    "paymentId": "clpay_xyz123",
    "mockPaymentId": "pay_1719000000_e5f6g7h8",
    "mockSignature": "mock_sig_i9j0k1l2m3n4o5p6"
  },
  "message": "Order created"
}
```

| Field | Description |
|-------|-------------|
| `id` | Razorpay order ID (or mock ID in development) |
| `amount` | Amount in **paise** (Razorpay format) |
| `currency` | Always `INR` |
| `paymentId` | Internal database Payment record ID |

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Registration ID and User ID are required` | Missing fields |
| 400 | `Registration is cancelled` | Registration status is `CANCELLED` |
| 400 | `Payment already completed for this registration` | Duplicate payment attempt |
| 404 | `Registration not found` | Invalid registration ID |

### Side Effects

- Creates a `Payment` record with status `CREATED`.
- Creates an `AuditLog` entry with action `PAYMENT_ORDER_CREATE`.
- Registration status is **not** changed at this point.

---

## Payment Verification

### Endpoint

```
POST /api/payments?action=verify
```

### Purpose

Verifies a payment after the student completes the Razorpay checkout. Uses server-side signature verification to ensure the payment was genuinely processed by Razorpay.

### Request Body

```json
{
  "paymentId": "clpay_xyz123",
  "razorpayOrderId": "order_1719000000_a1b2c3d4",
  "razorpayPaymentId": "pay_1719000000_e5f6g7h8",
  "razorpaySignature": "a1b2c3d4e5f6g7h8i9j0..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentId` | `string` | Yes | Internal database Payment record ID |
| `razorpayOrderId` | `string` | No | Razorpay order ID (for signature verification) |
| `razorpayPaymentId` | `string` | Yes | Razorpay payment ID returned by checkout |
| `razorpaySignature` | `string` | No | HMAC-SHA256 signature from Razorpay |

### Server-Side Signature Verification

In production, the server must verify the payment signature using Razorpay's HMAC-SHA256 scheme:

```typescript
import crypto from 'crypto';

// Construct the verification string
const expectedString = `${razorpayOrderId}|${razorpayPaymentId}`;

// Generate HMAC-SHA256 using the Razorpay key secret
const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
  .update(expectedString)
  .digest('hex');

// Compare signatures (use timing-safe comparison)
const isValid = crypto.timingSafeEqual(
  Buffer.from(generatedSignature, 'hex'),
  Buffer.from(razorpaySignature, 'hex')
);

if (!isValid) {
  return Response.json(
    { success: false, error: 'Invalid payment signature' },
    { status: 400 }
  );
}
```

> **Development Mode**: In development, signature verification is skipped and a mock signature is stored. This MUST be replaced with real verification in production.

### Transaction Flow

The verification runs inside a Prisma `$transaction` to ensure atomicity:

1. **Update Payment**: Set `razorpayPaymentId`, `razorpaySignature`, `status = SUCCESS`, `verifiedAt = now()`.
2. **Update Registration**: Set `status = PAID`, `confirmedAt = now()`.
3. **Create PaymentEvent**: Record `PAYMENT_SUCCESS` event with `razorpayPaymentId`.

### Post-Verification

After the transaction commits:

- A `Notification` is created for the student: _"Payment of ₹X for [Competition Name] has been confirmed."_
- An `AuditLog` entry is created with action `PAYMENT_VERIFY`.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clpay_xyz123",
    "registrationId": "clreg_abc456",
    "razorpayOrderId": "order_1719000000_a1b2c3d4",
    "razorpayPaymentId": "pay_1719000000_e5f6g7h8",
    "amount": 100,
    "currency": "INR",
    "status": "SUCCESS",
    "verifiedAt": "2025-06-21T10:30:00.000Z",
    "registration": {
      "registrationNo": "REG-2025-001",
      "status": "PAID",
      "student": { "user": { "name": "Jane Doe", "email": "jane@example.com" } },
      "competition": { "name": "National Essay Competition 2025" }
    }
  },
  "message": "Payment verified successfully"
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Payment ID and Razorpay Payment ID are required` | Missing fields |
| 400 | `Payment already verified` | Payment already has status `SUCCESS` |
| 404 | `Payment not found` | Invalid payment ID |

---

## Webhook Handling

### Endpoint

```
POST /api/payments?action=webhook
```

### Purpose

Receives asynchronous webhook events from Razorpay. Acts as a **reliability fallback** — if the client-side verification fails or the browser is closed before verification completes, the webhook ensures the payment is still recorded.

### Webhook Signature Verification (Production)

In production, every webhook must be verified using the `RAZORPAY_WEBHOOK_SECRET`:

```typescript
import crypto from 'crypto';

const webhookSignature = request.headers.get('x-razorpay-signature');
const rawBody = await request.text(); // Use raw body, not parsed JSON

const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest('hex');

if (webhookSignature !== expectedSignature) {
  return Response.json(
    { success: false, error: 'Invalid webhook signature' },
    { status: 401 }
  );
}

// Then parse the verified body
const body = JSON.parse(rawBody);
```

### Supported Event Types

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `payment.captured` | Payment successfully completed | Mark payment `SUCCESS`, confirm registration |
| `payment.failed` | Payment attempt failed | Mark payment `FAILED`, revert registration to `PAYMENT_PENDING` |

### Event: `payment.captured`

**Payload structure:**

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1719000000_e5f6g7h8",
        "order_id": "order_1719000000_a1b2c3d4",
        "amount": 10000,
        "status": "captured"
      }
    }
  }
}
```

**Processing logic:**

1. Look up the `Payment` record by `razorpayOrderId` (unique index ensures fast lookup).
2. If not found → return 404.
3. If already `SUCCESS` → return 200 with `{"message": "Webhook already processed"}` (**idempotent**).
4. Within a transaction:
   - Update `Payment.status = SUCCESS`, set `razorpayPaymentId` and `verifiedAt`.
   - Update `Registration.status = PAID`, set `confirmedAt`.
   - Create `PaymentEvent` with type `WEBHOOK_PAYMENT_CAPTURED`.

### Event: `payment.failed`

**Processing logic:**

1. Look up the `Payment` record by `razorpayOrderId`.
2. If not found or already `FAILED` → return 200 (idempotent).
3. Within a transaction:
   - Update `Payment.status = FAILED`.
   - Update `Registration.status = PAYMENT_PENDING`.
   - Create `PaymentEvent` with type `WEBHOOK_PAYMENT_FAILED`.

### Idempotency Guarantees

- The webhook handler is **safe to retry**. Razorpay may deliver the same webhook multiple times.
- The `razorpayOrderId` unique constraint on `Payment` ensures no duplicate payment records.
- Status checks (`status === 'SUCCESS'` / `status === 'FAILED'`) prevent reprocessing.
- All operations run within Prisma transactions for consistency.

---

## Payment State Machine

```
                    ┌───────────┐
                    │  CREATED  │  Order created, awaiting payment
                    └─────┬─────┘
                          │
                          │ Student opens checkout
                          ▼
                    ┌───────────┐
                    │  PENDING  │  Checkout opened, payment in progress
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           │           ▼
        ┌──────────┐      │     ┌──────────┐
        │ SUCCESS  │      │     │  FAILED  │
        └────┬─────┘      │     └────┬─────┘
             │            │          │
             │            │          │ Student may retry
             │            │          │ (new order created)
             │            │          ▼
             │            │    ┌───────────┐
             │            │    │ CANCELLED │
             │            │    └───────────┘
             │            │
        ┌────┼────┐       │
        │    │    │       │
        ▼    │    ▼       │
  ┌──────────┐  ┌────────────────────┐
  │ REFUNDED │  │ PARTIALLY_REFUNDED │
  └──────────┘  └────────────────────┘
```

### State Definitions

| State | Description | Database Value |
|-------|-------------|----------------|
| `CREATED` | Order created in Razorpay, payment not yet attempted | `"CREATED"` |
| `PENDING` | Payment gateway checkout opened, awaiting completion | `"PENDING"` |
| `SUCCESS` | Payment verified (via client verify or webhook) | `"SUCCESS"` |
| `FAILED` | Payment attempt failed or was rejected | `"FAILED"` |
| `REFUNDED` | Full refund processed | `"REFUNDED"` |
| `PARTIALLY_REFUNDED` | Partial refund processed | `"PARTIALLY_REFUNDED"` |
| `CANCELLED` | Order cancelled before payment | `"CANCELLED"` |

### Allowed Transitions

| From | To | Trigger |
|------|----|---------|
| `CREATED` | `PENDING` | Student opens Razorpay checkout |
| `CREATED` | `CANCELLED` | Student cancels or registration cancelled |
| `PENDING` | `SUCCESS` | Signature verified / webhook `payment.captured` |
| `PENDING` | `FAILED` | Payment rejected / webhook `payment.failed` |
| `SUCCESS` | `REFUNDED` | Admin initiates full refund |
| `SUCCESS` | `PARTIALLY_REFUNDED` | Admin initiates partial refund |
| `FAILED` | `CANCELLED` | Admin or system cancellation |

---

## Edge Cases

### Duplicate Prevention

The `razorpayOrderId` field on the `Payment` model has a `@unique` constraint:

```prisma
model Payment {
  razorpayOrderId  String   @unique
  razorpayPaymentId String?  @unique
  // ...
}
```

This means:
- **No two Payment records** can share the same Razorpay order ID.
- Attempting to create a duplicate results in a Prisma unique constraint violation, which is caught and returned as an error.
- Before creating an order, the system also checks for existing `SUCCESS` payments on the same registration.

### Race Conditions

**Scenario**: Student submits verification and Razorpay webhook arrives simultaneously.

**Mitigation**:
- Both the verify endpoint and webhook handler check `payment.status === 'SUCCESS'` before proceeding.
- The first request to succeed will commit the transaction; the second will find the payment already marked `SUCCESS` and return early (idempotent).
- Prisma transactions with SQLite (dev) and PostgreSQL (prod) provide row-level locking.

### Amount Mismatch

The amount is always read from `Competition.registrationFee` — **never from the client request**. This prevents a student from submitting a tampered amount:

```typescript
const amount = registration.competition.registrationFee;
// amount is NOT read from request.body
```

In production, the webhook payload also includes the captured amount. The server should compare:

```typescript
if (paymentData.amount !== Math.round(existingPayment.amount * 100)) {
  // Amount mismatch — log as critical, flag for admin review
  await db.auditLog.create({
    data: {
      action: 'AMOUNT_MISMATCH',
      entityType: 'Payment',
      entityId: existingPayment.id,
      newValue: JSON.stringify({
        expected: existingPayment.amount,
        received: paymentData.amount / 100,
      }),
    },
  });
}
```

### Replay Attacks

**Webhook replay**: An attacker could re-send an old webhook payload.

**Mitigations**:
1. **Webhook signature verification** using `RAZORPAY_WEBHOOK_SECRET` ensures the webhook came from Razorpay.
2. **Idempotency checks**: If a payment is already `SUCCESS`, re-processing is a no-op.
3. **Timestamp validation**: In production, verify the webhook `created_at` is within an acceptable window (e.g., 5 minutes).

**Client replay**: A student could replay a successful verification request.

**Mitigations**:
1. The `razorpayPaymentId` field is `@unique` — once stored, a second verification with the same payment ID fails.
2. Status check: if `status === 'SUCCESS'`, return `"Payment already verified"`.

---

## Financial Immutability

### Audit Trail

Every financial operation creates an `AuditLog` record:

| Action | When | Data Recorded |
|--------|------|---------------|
| `PAYMENT_ORDER_CREATE` | Order created | `razorpayOrderId`, `amount` |
| `PAYMENT_VERIFY` | Payment verified | `status`, `razorpayPaymentId` |
| `PAYMENT_REFUND` | Refund initiated | `refundAmount`, `reason` |
| `AMOUNT_MISMATCH` | Amount discrepancy detected | `expected`, `received` |

### No Silent Modifications

The system follows these rules:

1. **Never update a `Payment` record** without creating a corresponding `PaymentEvent`.
2. **Never change `amount`** after creation. The amount field is set once and never modified.
3. **Never delete payment records**. Cancellations and failures are represented by status changes.
4. **All status transitions** are recorded with timestamps (`createdAt`, `updatedAt`, `verifiedAt`).

### PaymentEvent Records

The `PaymentEvent` table serves as an append-only event log for each payment:

```prisma
model PaymentEvent {
  id              String   @id @default(cuid())
  paymentId       String
  eventType       String    // e.g. PAYMENT_SUCCESS, WEBHOOK_PAYMENT_CAPTURED
  eventData       String?   // JSON string of full event payload
  ipAddress       String?   // Client IP when applicable
  userAgent       String?   // Client user agent when applicable
  createdAt       DateTime  @default(now())

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
}
```

Event types recorded:

| Event Type | Source | Description |
|------------|--------|-------------|
| `PAYMENT_SUCCESS` | Client verify | Payment verified via client-side flow |
| `WEBHOOK_PAYMENT_CAPTURED` | Razorpay webhook | Payment confirmed via webhook |
| `WEBHOOK_PAYMENT_FAILED` | Razorpay webhook | Payment failure via webhook |
| `PAYMENT_REFUNDED` | Admin action | Full refund processed |
| `PAYMENT_PARTIALLY_REFUNDED` | Admin action | Partial refund processed |
| `PAYMENT_CANCELLED` | Admin action | Payment cancelled |

---

## Refund Flow

### Overview

Refunds are initiated by administrators through the Admin Financial Dashboard. The system supports both **full** and **partial** refunds.

### Refund Process

```
Admin clicks "Refund"
        │
        ▼
┌───────────────────────┐
│ 1. Validate payment   │  Payment must be in SUCCESS state
│    is refundable      │  and within refund window
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 2. Call Razorpay      │  POST /payments/{payment_id}/refund
│    Refund API         │  with amount (full or partial)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 3. Update Payment     │  status → REFUNDED or PARTIALLY_REFUNDED
│    status             │  Store refund ID
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 4. Update Registration│  status → CANCELLED
│                       │  (for full refunds)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 5. Create Records     │  PaymentEvent + AuditLog
│    (immutable)        │  Notification to student
└───────────────────────┘
```

### Creating Adjustment Records

When a refund is processed, the following records are created:

1. **PaymentEvent**: `eventType = 'PAYMENT_REFUNDED'` or `'PAYMENT_PARTIALLY_REFUNDED'` with the full refund payload.
2. **AuditLog**: `action = 'PAYMENT_REFUND'` with `previousValue` (old status) and `newValue` (new status + refund amount).
3. **Notification**: Inform the student of the refund with amount and reason.

### Refund Constraints

- Only payments with status `SUCCESS` can be refunded.
- Partial refunds must specify an amount less than the original payment.
- A fully refunded payment cannot be refunded again.
- Razorpay has a time limit for refunds (typically 7-14 days depending on the bank).

---

## Admin Financial Dashboard

The admin finance view (`admin-finance` / `FinanceView`) provides a comprehensive overview of all payment activity.

### Dashboard Components

#### Summary Cards

Five metric cards displayed at the top:

| Card | Data | Description |
|------|------|-------------|
| **Total Revenue** | Sum of `SUCCESS` payment amounts | Total confirmed revenue |
| **Successful** | Count of `SUCCESS` payments | Completed transactions |
| **Pending** | Count of `CREATED` + `PENDING` payments | Awaiting completion |
| **Failed** | Count of `FAILED` payments | Failed transactions |
| **Refunded** | Count of `REFUNDED` + `PARTIALLY_REFUNDED` | Refunded transactions |

#### Revenue Chart

A bar chart (via Recharts) showing revenue breakdown by competition:

- **X-axis**: Competition names
- **Y-axis**: Revenue in INR (formatted as ₹1.0K, ₹2.5L, etc.)
- **Bars**: Color-coded by status (Success, Pending, Failed)

#### Payments Table

A paginated, filterable table of all payments:

| Column | Source |
|--------|--------|
| Date | `payment.createdAt` |
| Order ID | `payment.razorpayOrderId` |
| Student | `registration.student.user.name` + `email` |
| Competition | `registration.competition.name` |
| Registration No. | `registration.registrationNo` |
| Amount | `payment.amount` (formatted as ₹) |
| Status | `payment.status` (with color-coded badge) |
| Actions | Refund button (for SUCCESS payments) |

### Filters

| Filter | Field | Options |
|--------|-------|---------|
| Competition | `competitionId` | Dropdown of all competitions |
| Status | `status` | All payment statuses |
| Search | `registrationNo` / name | Free text search |

### Permissions Required

- `PAYMENT_VIEW`: View the finance dashboard and payment list.
- `PAYMENT_MANAGE`: Initiate refunds and manage payment records.

---

## Fee Configuration

### Per-Competition Fee

Each competition has its own registration fee set via the `registrationFee` field on the `Competition` model:

```prisma
model Competition {
  registrationFee  Float  @default(100)  // In INR
}
```

The default fee is **₹100** (defined in both the Prisma schema default and the constant `DEFAULT_REGISTRATION_FEE` in `src/lib/constants.ts`).

### Admin Settings

Administrators can configure payment-related settings through the Settings page (`admin-settings`) under the `PAYMENT` category (`SettingCategory`):

| Setting Key | Type | Description |
|-------------|------|-------------|
| `default_registration_fee` | NUMBER | Default fee for new competitions |
| `payment_currency` | STRING | Currency code (always `INR`) |
| `refund_policy_days` | NUMBER | Number of days allowed for refunds |
| `razorpay_mode` | STRING | `test` or `live` |

Settings are stored in the `SystemSetting` table:

```prisma
model SystemSetting {
  key       String   @unique
  value     String
  category  String   // "PAYMENT"
  type      String   // "STRING", "NUMBER", etc.
}
```

### Fee Application

When a student registers for a competition, the fee is determined at **order creation time**:

```typescript
// Amount is sourced from the competition record, never from the client
const amount = registration.competition.registrationFee;
```

This ensures that even if the competition fee is changed after registration, the student pays the fee that was set at the time of their registration.

---

## Production Deployment Notes

### Test vs Live Mode

| Aspect | Test Mode | Live Mode |
|--------|-----------|-----------|
| Key prefix | `rzp_test_...` | `rzp_live_...` |
| Payments | Simulated (no real money) | Real bank transfers |
| Webhook URL | Test webhook endpoint | Production webhook endpoint |
| Dashboard | Test dashboard | Live dashboard |

**Always test thoroughly in test mode before switching to live.**

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API key | `rzp_live_abc123xyz` |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | `your-32-char-secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | `your-webhook-secret` |

> **CRITICAL**: These values must be set in the Vercel environment variables (not in code). Never commit secrets to version control.

### Webhook URL Setup

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings → Webhooks**.
3. Add a new webhook endpoint:
   - **URL**: `https://your-domain.vercel.app/api/payments?action=webhook`
   - **Events to capture**: `payment.captured`, `payment.failed`
4. Copy the **Webhook Secret** and set it as `RAZORPAY_WEBHOOK_SECRET`.

### Production Checklist

- [ ] Switch `RAZORPAY_KEY_ID` from `rzp_test_*` to `rzp_live_*`.
- [ ] Set `RAZORPAY_KEY_SECRET` to the live secret.
- [ ] Configure webhook URL in Razorpay dashboard.
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` to the webhook secret.
- [ ] Enable server-side signature verification in the verify endpoint.
- [ ] Enable webhook signature verification in the webhook endpoint.
- [ ] Enable amount mismatch detection in webhook handler.
- [ ] Set `NODE_ENV=production`.
- [ ] Remove all mock/dev payment code paths.
- [ ] Test with a small live payment first.
- [ ] Verify webhook delivery in Razorpay dashboard.
- [ ] Monitor `AuditLog` for any `AMOUNT_MISMATCH` events.

---

*This document is part of the Essay Writing Competition Management System documentation set. See also: [DATABASE.md](./DATABASE.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md).*
