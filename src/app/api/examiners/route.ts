import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/examiners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const specialization = searchParams.get('specialization');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (specialization) {
      where.specialization = { contains: specialization };
    }

    const [examiners, total] = await Promise.all([
      db.examinerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
          assignments: {
            include: {
              essay: {
                include: {
                  competition: { select: { name: true } },
                },
              },
              evaluation: { select: { status: true, totalMarks: true } },
            },
          },
          competitions: { include: { competition: { select: { name: true, status: true } } } },
          _count: {
            select: {
              assignments: true,
              evaluations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.examinerProfile.count({ where }),
    ]);

    // Add computed counts
    const data = examiners.map((ex) => ({
      ...ex,
      assignedCount: ex.assignments.filter((a) => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS').length,
      completedCount: ex.assignments.filter((a) => a.status === 'SUBMITTED').length,
    }));

    return Response.json({
      success: true,
      data,
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

// POST /api/examiners?action=assign | create examiner (no action param)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'assign') {
      return handleAssignExaminers(request);
    }

    return handleCreateExaminer(request);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleCreateExaminer(request: NextRequest) {
  const body = await request.json() as {
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
    specialization?: string;
    qualification?: string;
  };

  const { email, name, phone, password, specialization, qualification } = body;

  if (!email || !name) {
    return Response.json({ success: false, error: 'Email and name are required' }, { status: 400 });
  }

  // Check duplicate
  const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return Response.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
  }

  const roleRecord = await db.role.findUnique({ where: { name: 'EXAMINER' } });
  if (!roleRecord) {
    return Response.json({ success: false, error: 'EXAMINER role not found. Please seed the database first.' }, { status: 400 });
  }

  const examiner = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: password || 'examiner123',
        name,
        phone,
        roles: { create: { roleId: roleRecord.id } },
      },
    });

    const profile = await tx.examinerProfile.create({
      data: {
        userId: user.id,
        specialization,
        qualification,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    return profile;
  });

  await db.auditLog.create({
    data: {
      userId: examiner.user.id,
      userRole: 'EXAMINER',
      action: 'EXAMINER_CREATE',
      entityType: 'ExaminerProfile',
      entityId: examiner.id,
      newValue: JSON.stringify({ name, email }),
    },
  });

  return Response.json({ success: true, data: examiner, message: 'Examiner created successfully' }, { status: 201 });
}

async function handleAssignExaminers(request: NextRequest) {
  const body = await request.json() as {
    essayIds?: string[];
    examinerIds?: string[];
    assignedBy?: string;
    deadline?: string;
  };

  const { essayIds, examinerIds, assignedBy, deadline } = body;

  if (!essayIds?.length || !examinerIds?.length) {
    return Response.json({ success: false, error: 'Essay IDs and Examiner IDs are required' }, { status: 400 });
  }

  if (!assignedBy) {
    return Response.json({ success: false, error: 'Assigned by (admin user ID) is required' }, { status: 400 });
  }

  // Verify essays exist and are eligible
  const essays = await db.essaySubmission.findMany({
    where: { id: { in: essayIds } },
    include: { competition: { select: { id: true, name: true, scoringConfig: true } } },
  });

  if (essays.length !== essayIds.length) {
    return Response.json({ success: false, error: 'One or more essays not found' }, { status: 404 });
  }

  // Verify examiners are active
  const examiners = await db.examinerProfile.findMany({
    where: { id: { in: examinerIds }, isActive: true },
  });

  if (examiners.length !== examinerIds.length) {
    return Response.json({ success: false, error: 'One or more examiners not found or inactive' }, { status: 400 });
  }

  const deadlineDate = deadline ? new Date(deadline) : null;
  let assignmentsCreated = 0;

  await db.$transaction(async (tx) => {
    for (const essay of essays) {
      // Determine examiner count (use competition config or default to 2)
      const examinerCount = essay.competition.scoringConfig?.examinerCount || 2;
      const examinersToAssign = examiners.slice(0, examinerCount);

      for (const examiner of examinersToAssign) {
        // Check if assignment already exists
        const existing = await tx.examinerAssignment.findUnique({
          where: { essayId_examinerId: { essayId: essay.id, examinerId: examiner.id } },
        });

        if (!existing) {
          await tx.examinerAssignment.create({
            data: {
              essayId: essay.id,
              examinerId: examiner.id,
              assignedBy,
              deadline: deadlineDate,
              status: 'ASSIGNED',
            },
          });
          assignmentsCreated++;
        }
      }

      // Update essay status
      await tx.essaySubmission.update({
        where: { id: essay.id },
        data: { status: 'UNDER_EVALUATION' },
      });
    }
  });

  await db.auditLog.create({
    data: {
      userId: assignedBy,
      action: 'EXAMINER_ASSIGN',
      entityType: 'ExaminerAssignment',
      newValue: JSON.stringify({ essayIds, examinerIds, deadline, assignmentsCreated }),
    },
  });

  // Notify examiners
  for (const examiner of examiners) {
    const user = await db.user.findFirst({
      where: { examinerProfile: { id: examiner.id } },
      select: { id: true },
    });
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'New Essay Assignment',
          message: `You have been assigned ${essays.length} new essay(s) for evaluation. Deadline: ${deadlineDate ? deadlineDate.toLocaleDateString() : 'Not set'}.`,
          type: 'INFO',
        },
      });
    }
  }

  return Response.json({
    success: true,
    data: { assignmentsCreated },
    message: `${assignmentsCreated} examiner assignments created`,
  });
}

// PUT /api/examiners?action=toggle-active
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'toggle-active') {
      return handleToggleActive(request);
    }

    return Response.json({ success: false, error: 'Invalid action. Use: toggle-active' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleToggleActive(request: NextRequest) {
  const body = await request.json() as { id?: string };
  const { id } = body;

  if (!id) {
    return Response.json({ success: false, error: 'Examiner profile ID is required' }, { status: 400 });
  }

  const examiner = await db.examinerProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });

  if (!examiner) {
    return Response.json({ success: false, error: 'Examiner not found' }, { status: 404 });
  }

  const updated = await db.examinerProfile.update({
    where: { id },
    data: { isActive: !examiner.isActive },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });

  await db.auditLog.create({
    data: {
      action: 'EXAMINER_TOGGLE_ACTIVE',
      entityType: 'ExaminerProfile',
      entityId: id,
      previousValue: JSON.stringify({ isActive: examiner.isActive }),
      newValue: JSON.stringify({ isActive: updated.isActive }),
    },
  });

  return Response.json({
    success: true,
    data: updated,
    message: `Examiner ${updated.isActive ? 'activated' : 'deactivated'}`,
  });
}
