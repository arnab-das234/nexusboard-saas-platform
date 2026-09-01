# NexusBoard - Payment Integration Guide

> **Provider:** Razorpay | **Currencies:** INR (default)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Payment Flow](#2-payment-flow)
3. [API Endpoints](#3-api-endpoints)
4. [Order Creation](#4-order-creation)
5. [Client-Side Checkout](#5-client-side-checkout)
6. [Signature Verification](#6-signature-verification)
7. [Webhook Handling](#7-webhook-handling)
8. [Refund Processing](#8-refund-processing)
9. [Test Mode](#9-test-mode)
10. [Security Considerations](#10-security-considerations)

---

## 1. Overview

NexusBoard integrates Razorpay for online payment processing. Students pay registration fees when signing up for competitions.

### Payment Lifecycle

```
CREATED --> PENDING --> SUCCESS / FAILED / CANCELLED / REFUNDED / PARTIALLY_REFUNDED
```

---

## 2. Payment Flow

```
Student                    Server                    Razorpay
  │                          │                          │
  │  1. Register for comp    │                          │
  │─────────────────────────>│                          │
  │  Registration created    │                          │
  │<─────────────────────────│                          │
  │                          │                          │
  │  2. Request order        │                          │
  │─────────────────────────>│  3. Create order          │
  │                          │─────────────────────────>│
  │                          │  Order created           │
  │                          │<─────────────────────────│
  │  Order ID + Amount      │                          │
  │<─────────────────────────│                          │
  │                          │                          │
  │  4. Open checkout        │                          │
  │──────────────────────────────────────────────────>│
  │  5. Payment success      │                          │
  │<──────────────────────────────────────────────────│
  │                          │                          │
  │  6. Verify signature     │                          │
  │─────────────────────────>│                          │
  │  7. Verify with Razorpay │                          │
  │                          │─────────────────────────>│
  │  Payment confirmed       │                          │
  │                          │<─────────────────────────│
  │  Registration confirmed  │                          │
  │<─────────────────────────│                          │
```

---

## 3. API Endpoints

### Create Payment Order

```
POST /api/payments
Content-Type: application/json

{
  "action": "create-order",
  "registrationId": "clx..."
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 10000,
    "currency": "INR",
    "key": "rzp_xxx"
  }
}
```

### Verify Payment

```
POST /api/payments
Content-Type: application/json

{
  "action": "verify",
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "xxx"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully"
}
```

---

## 4. Order Creation

The server creates a Razorpay order using the competition's registration fee:

```typescript
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const order = await razorpay.orders.create({
  amount: registrationFee * 100, // Convert to paise
  currency: 'INR',
  receipt: registration.registrationNo,
});
```

---

## 5. Client-Side Checkout

The frontend opens the Razorpay checkout modal:

```javascript
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  name: 'NexusBoard',
  description: `Registration: ${competition.name}`,
  order_id: order.id,
  handler: function (response) {
    // Send response.razorpay_payment_id and signature to server
    verifyPayment(response);
  },
  prefill: {
    name: user.name,
    email: user.email,
  },
  theme: { color: '#10b981' },
};

const rzp = new Razorpay(options);
rzp.open();
```

---

## 6. Signature Verification

Server-side HMAC-SHA256 verification:

```typescript
import crypto from 'crypto';

const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

const isValid = expectedSignature === receivedSignature;
```

---

## 7. Webhook Handling

Configure webhook URL in Razorpay dashboard pointing to:
```
https://your-domain.com/api/payments?action=webhook
```

Events to handle:
- `payment.captured` - Mark payment as SUCCESS
- `payment.failed` - Mark payment as FAILED
- `refund.processed` - Mark payment as REFUNDED

---

## 8. Refund Processing

Admins can process refunds via the Finance view. The server calls:

```typescript
await razorpay.payments.refund(paymentId, {
  amount: refundAmount * 100,
});
```

---

## 9. Test Mode

Razorpay provides a test mode with:
- Test cards: `4111 1111 1111 1111` (success), `4000 0000 0000 0002` (fail)
- No real money is charged
- Test webhooks are sent to the configured URL

---

## 10. Security Considerations

1. **Never expose** `RAZORPAY_KEY_SECRET` to the client
2. **Always verify** payment signatures server-side
3. **Use webhooks** as the source of truth for payment status
4. **Log all** payment events in the PaymentEvent table
5. **Idempotency**: Use Razorpay order IDs to prevent duplicate processing

---

*For the full API reference, see the main [README.md](../README.md).*
