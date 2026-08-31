import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payments?status=...&competitionId=...&registrationId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const competitionId = searchParams.get('competitionId');
    const registrationId = searchParams.get('registrationId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (registrationId) where.registrationId = registrationId;
    if (competitionId) {
      where.registration = {
        competitionId,
      };
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          registration: {
            include: {
              student: { include: { user: { select: { name: true, email: true } } } },
              competition: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
          events: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.payment.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: payments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/payments?action=create-order|verify|webhook
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'create-order':
        return handleCreateOrder(request);
      case 'verify':
        return handleVerifyPayment(request);
      case 'webhook':
        return handleWebhook(request);
      default:
        return Response.json({ success: false, error: 'Invalid action. Use: create-order, verify, webhook' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleCreateOrder(request: NextRequest) {
  const body = await request.json() as {
    registrationId?: string;
    userId?: string;
  };

  const { registrationId, userId } = body;

  if (!registrationId || !userId) {
    return Response.json({ success: false, error: 'Registration ID and User ID are required' }, { status: 400 });
  }

  // Check registration
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    include: { competition: true },
  });

  if (!registration) {
    return Response.json({ success: false, error: 'Registration not found' }, { status: 404 });
  }

  if (registration.status === 'CANCELLED') {
    return Response.json({ success: false, error: 'Registration is cancelled' }, { status: 400 });
  }

  // Check for existing successful payment
  const existingPayment = await db.payment.findFirst({
    where: { registrationId, status: 'SUCCESS' },
  });
  if (existingPayment) {
    return Response.json({ success: false, error: 'Payment already completed for this registration' }, { status: 400 });
  }

  const amount = registration.competition.registrationFee;

  // Mock Razorpay order creation for dev
  const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const payment = await db.payment.create({
    data: {
      registrationId,
      createdById: userId,
      razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'CREATED',
    },
    include: {
      registration: {
        include: {
          student: { include: { user: { select: { name: true, email: true } } } },
          competition: { select: { name: true } },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: 'PAYMENT_ORDER_CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      newValue: JSON.stringify({ razorpayOrderId, amount }),
    },
  });

  // Mock Razorpay response for dev
  return Response.json({
    success: true,
    data: {
      id: razorpayOrderId,
      amount: Math.round(amount * 100), // Razorpay uses paise
      currency: 'INR',
      paymentId: payment.id,
      // Dev mock: simulate instant success
      mockPaymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      mockSignature: `mock_sig_${Math.random().toString(36).substring(2, 20)}`,
    },
    message: 'Order created',
  });
}

async function handleVerifyPayment(request: NextRequest) {
  const body = await request.json() as {
    paymentId?: string;       // our DB payment id
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };

  const { paymentId, razorpayPaymentId, razorpaySignature } = body;

  if (!paymentId || !razorpayPaymentId) {
    return Response.json({ success: false, error: 'Payment ID and Razorpay Payment ID are required' }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      registration: {
        include: {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
          competition: { select: { name: true } },
        },
      },
    },
  });

  if (!payment) {
    return Response.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  if (payment.status === 'SUCCESS') {
    return Response.json({ success: false, error: 'Payment already verified' }, { status: 400 });
  }

  // Dev mode: skip real signature verification
  // In production: use razorpay.verifyPaymentSignature({
  //   order_id: payment.razorpayOrderId,
  //   payment_id: razorpayPaymentId,
  //   signature: razorpaySignature,
  // })

  const updated = await db.$transaction(async (tx) => {
    const upd = await tx.payment.update({
      where: { id: paymentId },
      data: {
        razorpayPaymentId,
        razorpaySignature: razorpaySignature || 'dev_mock',
        status: 'SUCCESS',
        verifiedAt: new Date(),
      },
      include: {
        registration: {
          include: {
            student: { include: { user: { select: { id: true, name: true, email: true } } } },
            competition: { select: { name: true } },
          },
        },
      },
    });

    // Update registration status
    await tx.registration.update({
      where: { id: payment.registrationId },
      data: { status: 'PAID', confirmedAt: new Date() },
    });

    // Create payment event
    await tx.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'PAYMENT_SUCCESS',
        eventData: JSON.stringify({ razorpayPaymentId }),
      },
    });

    return upd;
  });

  // Notify student
  if (updated.registration.student.user?.id) {
    await db.notification.create({
      data: {
        userId: updated.registration.student.user.id,
        title: 'Payment Successful',
        message: `Payment of ₹${updated.amount} for ${updated.registration.competition.name} has been confirmed. Your registration is now confirmed.`,
        type: 'SUCCESS',
      },
    });
  }

  await db.auditLog.create({
    data: {
      action: 'PAYMENT_VERIFY',
      entityType: 'Payment',
      entityId: paymentId,
      newValue: JSON.stringify({ status: 'SUCCESS', razorpayPaymentId }),
    },
  });

  return Response.json({ success: true, data: updated, message: 'Payment verified successfully' });
}

async function handleWebhook(request: NextRequest) {
  const body = await request.json() as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;          // razorpay payment id
          order_id?: string;
          amount?: number;
          status?: string;
        };
      };
    };
  };

  const { event, payload } = body;

  // Webhook secret verification would go here in production
  // const signature = request.headers.get('x-razorpay-signature');

  if (event === 'payment.captured') {
    const paymentData = payload?.payment?.entity;
    if (!paymentData?.order_id || !paymentData?.id) {
      return Response.json({ success: false, error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Idempotent: find by order id
    const existingPayment = await db.payment.findUnique({
      where: { razorpayOrderId: paymentData.order_id },
    });

    if (!existingPayment) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Already processed (idempotent)
    if (existingPayment.status === 'SUCCESS') {
      return Response.json({ success: true, message: 'Webhook already processed' });
    }

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          razorpayPaymentId: paymentData.id,
          status: 'SUCCESS',
          verifiedAt: new Date(),
        },
      });

      await tx.registration.update({
        where: { id: existingPayment.registrationId },
        data: { status: 'PAID', confirmedAt: new Date() },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: existingPayment.id,
          eventType: 'WEBHOOK_PAYMENT_CAPTURED',
          eventData: JSON.stringify(payload),
        },
      });
    });

    return Response.json({ success: true, message: 'Webhook processed' });
  }

  if (event === 'payment.failed') {
    const paymentData = payload?.payment?.entity;
    if (!paymentData?.order_id) {
      return Response.json({ success: false, error: 'Invalid webhook payload' }, { status: 400 });
    }

    const existingPayment = await db.payment.findUnique({
      where: { razorpayOrderId: paymentData.order_id },
    });

    if (!existingPayment || existingPayment.status === 'FAILED') {
      return Response.json({ success: true, message: 'Already processed' });
    }

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: { status: 'FAILED' },
      });

      await tx.registration.update({
        where: { id: existingPayment.registrationId },
        data: { status: 'PAYMENT_PENDING' },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: existingPayment.id,
          eventType: 'WEBHOOK_PAYMENT_FAILED',
          eventData: JSON.stringify(payload),
        },
      });
    });

    return Response.json({ success: true, message: 'Payment failure processed' });
  }

  return Response.json({ success: true, message: `Event ${event} received` });
}
