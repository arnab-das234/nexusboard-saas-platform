import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users?role=...&search=...&page=...&pageSize=...
// GET /api/users?action=me&userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'me') {
      return handleGetMe(searchParams);
    }

    return handleListUsers(searchParams);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleGetMe(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId');
  if (!userId) {
    return Response.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      emailVerified: true,
      isActive: true,
      createdAt: true,
      roles: {
        include: { role: true },
      },
      permissions: { select: { permission: true } },
      studentProfile: true,
      teacherProfile: true,
      examinerProfile: true,
    },
  });

  if (!user) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      ...user,
      roleNames: user.roles.map((ur) => ur.role.name),
      permissionList: user.permissions.map((p) => p.permission),
    },
  });
}

async function handleListUsers(searchParams: URLSearchParams) {
  const role = searchParams.get('role');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const where: Record<string, unknown> = {};

  // Build OR conditions for search
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // Filter by role
  if (role) {
    const roleName = role.toUpperCase();
    // Map role names to profile relations
    if (roleName === 'STUDENT') {
      where.studentProfile = { isNot: null };
    } else if (roleName === 'TEACHER') {
      where.teacherProfile = { isNot: null };
    } else if (roleName === 'EXAMINER') {
      where.examinerProfile = { isNot: null };
    } else {
      // For ADMIN or other roles, check UserRole
      where.roles = {
        some: {
          role: { name: roleName },
        },
      };
    }
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        roles: {
          include: { role: { select: { id: true, name: true } } },
        },
        studentProfile: {
          select: {
            id: true,
            schoolName: true,
            classGrade: true,
            dateOfBirth: true,
          },
        },
        teacherProfile: {
          select: {
            id: true,
            schoolName: true,
            designation: true,
          },
        },
        examinerProfile: {
          select: {
            id: true,
            specialization: true,
            qualification: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            auditLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);

  const data = users.map((user) => ({
    ...user,
    roleNames: user.roles.map((ur) => ur.role.name),
  }));

  return Response.json({
    success: true,
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// PUT /api/users?action=toggle-active
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
  const body = (await request.json()) as { userId?: string; isActive?: boolean };
  const { userId, isActive } = body;

  if (!userId || isActive === undefined) {
    return Response.json({ success: false, error: 'userId and isActive are required' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  if (user.isActive === isActive) {
    return Response.json({ success: false, error: `User is already ${isActive ? 'active' : 'inactive'}` }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      entityType: 'User',
      entityId: userId,
      previousValue: JSON.stringify({ isActive: user.isActive }),
      newValue: JSON.stringify({ isActive }),
    },
  });

  return Response.json({
    success: true,
    data: updated,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
  });
}

// DELETE /api/users — Soft delete (set isActive=false)
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string };
    const { userId } = body;

    if (!userId) {
      return Response.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return Response.json({ success: false, error: 'User is already deactivated' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'USER_SOFT_DELETE',
        entityType: 'User',
        entityId: userId,
        previousValue: JSON.stringify({ isActive: true }),
        newValue: JSON.stringify({ isActive: false }),
      },
    });

    return Response.json({ success: true, data: updated, message: 'User deactivated (soft deleted) successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
