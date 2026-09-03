import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/registrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const competitionId = searchParams.get('competitionId');
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (competitionId) where.competitionId = competitionId;
    if (studentId) where.studentId = studentId;

    const [registrations, total] = await Promise.all([
      db.registration.findMany({
        where,
        include: {
          student: { include: { user: { select: { name: true, email: true, phone: true } } } },
          competition: { select: { id: true, name: true, academicYear: true, status: true } },
          category: true,
          payments: {
            select: { id: true, amount: true, status: true, createdAt: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          essays: {
            select: { id: true, status: true, submittedAt: true, fileName: true, fileSize: true },
            take: 1,
          },
        },
        orderBy: { registeredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.registration.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: registrations,
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

// POST /api/registrations — Create registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      studentId?: string;
      competitionId?: string;
      categoryId?: string;
    };

    const { studentId, competitionId, categoryId } = body;

    if (!studentId || !competitionId) {
      return Response.json({ success: false, error: 'Student ID and Competition ID are required' }, { status: 400 });
    }

    // Check student profile exists
    const student = await db.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) {
      return Response.json({ success: false, error: 'Student profile not found' }, { status: 404 });
    }

    // Check competition exists and is open for registration
    const competition = await db.competition.findUnique({
      where: { id: competitionId },
      include: { categories: true },
    });
    if (!competition) {
      return Response.json({ success: false, error: 'Competition not found' }, { status: 404 });
    }

    if (competition.status !== 'REGISTRATION_OPEN') {
      return Response.json({ success: false, error: 'Competition is not open for registration' }, { status: 400 });
    }

    // Check eligibility (age)
    const ageCalcDate = new Date(competition.ageCalculationDate);
    const dob = new Date(student.dateOfBirth);
    let age = ageCalcDate.getFullYear() - dob.getFullYear();
    const monthDiff = ageCalcDate.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ageCalcDate.getDate() < dob.getDate())) {
      age--;
    }

    if (age < competition.minAge || age > competition.maxAge) {
      return Response.json({
        success: false,
        error: `Student age (${age}) is not within the eligible range (${competition.minAge}-${competition.maxAge})`,
      }, { status: 400 });
    }

    // Check for duplicate registration
    const existingRegistration = await db.registration.findFirst({
      where: { studentId, competitionId, status: { not: 'CANCELLED' } },
    });
    if (existingRegistration) {
      return Response.json({ success: false, error: 'Student is already registered for this competition' }, { status: 409 });
    }

    // Determine category if not specified
    let targetCategoryId: string | null | undefined = categoryId;
    if (!targetCategoryId) {
      const matchingCategory = competition.categories.find(
        (c) => age >= c.minAge && age <= c.maxAge
      );
      targetCategoryId = matchingCategory?.id ?? null;
    }

    // Generate registration number
    const count = await db.registration.count();
    const registrationNo = `EC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const registration = await db.registration.create({
      data: {
        registrationNo,
        studentId,
        competitionId,
        categoryId: targetCategoryId,
        status: 'PENDING',
      },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        competition: { select: { id: true, name: true } },
        category: true,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'REGISTRATION_CREATE',
        entityType: 'Registration',
        entityId: registration.id,
        newValue: JSON.stringify({ registrationNo, studentId, competitionId }),
      },
    });

    // Create notification for student
    const user = await db.user.findFirst({
      where: { studentProfile: { id: studentId } },
      select: { id: true },
    });
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Registration Successful',
          message: `You have been registered for ${competition.name}. Registration No: ${registrationNo}. Please complete the payment to confirm your registration.`,
          type: 'SUCCESS',
        },
      });
    }

    return Response.json({ success: true, data: registration, message: 'Registration created successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/registrations?action=cancel
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cancel') {
      return handleCancelRegistration(request);
    }

    return Response.json({ success: false, error: 'Invalid action. Use: cancel' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleCancelRegistration(request: NextRequest) {
  const body = await request.json() as { id?: string; reason?: string };
  const { id, reason } = body;

  if (!id) {
    return Response.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
  }

  const registration = await db.registration.findUnique({
    where: { id },
    include: {
      payments: { where: { status: 'SUCCESS' } },
      student: { include: { user: { select: { id: true } } } },
      competition: { select: { name: true } },
    },
  });

  if (!registration) {
    return Response.json({ success: false, error: 'Registration not found' }, { status: 404 });
  }

  if (registration.status === 'CANCELLED') {
    return Response.json({ success: false, error: 'Registration is already cancelled' }, { status: 400 });
  }

  // Check if there's a successful payment - would need refund in production
  if (registration.payments.length > 0) {
    return Response.json({
      success: false,
      error: 'Cannot cancel registration with successful payment. Please contact support for a refund.',
    }, { status: 400 });
  }

  const updated = await db.registration.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason || 'Cancelled by user',
    },
  });

  await db.auditLog.create({
    data: {
      action: 'REGISTRATION_CANCEL',
      entityType: 'Registration',
      entityId: id,
      previousValue: JSON.stringify({ status: registration.status }),
      newValue: JSON.stringify({ status: 'CANCELLED', reason }),
    },
  });

  // Notify student
  if (registration.student.user?.id) {
    await db.notification.create({
      data: {
        userId: registration.student.user.id,
        title: 'Registration Cancelled',
        message: `Your registration (${registration.registrationNo}) for ${registration.competition.name} has been cancelled. Reason: ${reason || 'User requested'}.`,
        type: 'WARNING',
      },
    });
  }

  return Response.json({ success: true, data: updated, message: 'Registration cancelled' });
}
