import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/announcements?status=...&audience=...&competitionId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const audience = searchParams.get('audience');
    const competitionId = searchParams.get('competitionId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (audience) where.audience = audience;
    if (competitionId) where.competitionId = competitionId;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        include: {
          competition: { select: { id: true, name: true } },
          _count: {
            select: { userNotifications: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.announcement.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: announcements,
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

// POST /api/announcements — Create announcement
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: string;
      message?: string;
      audience?: string;
      competitionId?: string;
      scheduledAt?: string;
      status?: string;
      createdBy?: string;
    };

    const {
      title,
      message,
      audience = 'ALL',
      competitionId,
      scheduledAt,
      status = 'DRAFT',
      createdBy,
    } = body;

    if (!title || !message) {
      return Response.json({ success: false, error: 'title and message are required' }, { status: 400 });
    }

    const validAudiences = ['ALL', 'STUDENTS', 'TEACHERS', 'EXAMINERS', 'SPECIFIC_USERS'];
    if (!validAudiences.includes(audience)) {
      return Response.json({ success: false, error: `Invalid audience. Must be one of: ${validAudiences.join(', ')}` }, { status: 400 });
    }

    const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return Response.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        message,
        audience,
        competitionId: competitionId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status,
        createdBy: createdBy || null,
      },
      include: {
        competition: { select: { id: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: createdBy || undefined,
        action: 'ANNOUNCEMENT_CREATE',
        entityType: 'Announcement',
        entityId: announcement.id,
        newValue: JSON.stringify({ title, audience, status, competitionId }),
      },
    });

    // If published and not SPECIFIC_USERS, create UserNotification for all matching users
    if (status === 'PUBLISHED' && audience !== 'SPECIFIC_USERS') {
      await createUserNotificationsForAnnouncement(announcement.id, audience, competitionId, title, message);
    }

    return Response.json({ success: true, data: announcement, message: 'Announcement created successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/announcements?action=publish
// PUT /api/announcements?action=cancel
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'publish':
        return handlePublish(request);
      case 'cancel':
        return handleCancel(request);
      default:
        return Response.json({ success: false, error: 'Invalid action. Use: publish, cancel' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handlePublish(request: NextRequest) {
  const body = (await request.json()) as { id?: string };
  const { id } = body;

  if (!id) {
    return Response.json({ success: false, error: 'Announcement ID is required' }, { status: 400 });
  }

  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return Response.json({ success: false, error: 'Announcement not found' }, { status: 404 });
  }

  if (announcement.status === 'PUBLISHED') {
    return Response.json({ success: false, error: 'Announcement is already published' }, { status: 400 });
  }

  if (announcement.status === 'CANCELLED') {
    return Response.json({ success: false, error: 'Cannot publish a cancelled announcement' }, { status: 400 });
  }

  const updated = await db.announcement.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: {
      competition: { select: { id: true, name: true } },
    },
  });

  await db.auditLog.create({
    data: {
      action: 'ANNOUNCEMENT_PUBLISH',
      entityType: 'Announcement',
      entityId: id,
      previousValue: JSON.stringify({ status: announcement.status }),
      newValue: JSON.stringify({ status: 'PUBLISHED' }),
    },
  });

  // Create user notifications if not SPECIFIC_USERS
  if (updated.audience !== 'SPECIFIC_USERS') {
    await createUserNotificationsForAnnouncement(updated.id, updated.audience, updated.competitionId, updated.title, updated.message);
  }

  return Response.json({ success: true, data: updated, message: 'Announcement published' });
}

async function handleCancel(request: NextRequest) {
  const body = (await request.json()) as { id?: string; reason?: string };
  const { id, reason } = body;

  if (!id) {
    return Response.json({ success: false, error: 'Announcement ID is required' }, { status: 400 });
  }

  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return Response.json({ success: false, error: 'Announcement not found' }, { status: 404 });
  }

  if (announcement.status === 'CANCELLED') {
    return Response.json({ success: false, error: 'Announcement is already cancelled' }, { status: 400 });
  }

  const updated = await db.announcement.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: {
      competition: { select: { id: true, name: true } },
    },
  });

  await db.auditLog.create({
    data: {
      action: 'ANNOUNCEMENT_CANCEL',
      entityType: 'Announcement',
      entityId: id,
      previousValue: JSON.stringify({ status: announcement.status }),
      newValue: JSON.stringify({ status: 'CANCELLED', reason }),
    },
  });

  return Response.json({ success: true, data: updated, message: 'Announcement cancelled' });
}

async function createUserNotificationsForAnnouncement(
  announcementId: string,
  audience: string,
  competitionId: string | null,
  title: string,
  message: string,
) {
  // Determine which users to notify based on audience
  let userIds: string[] = [];

  if (audience === 'ALL') {
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  } else if (audience === 'STUDENTS') {
    const students = await db.studentProfile.findMany({
      include: { user: { select: { id: true, isActive: true } } },
    });
    userIds = students.filter((s) => s.user.isActive).map((s) => s.user.id);
  } else if (audience === 'TEACHERS') {
    const teachers = await db.teacherProfile.findMany({
      include: { user: { select: { id: true, isActive: true } } },
    });
    userIds = teachers.filter((t) => t.user.isActive).map((t) => t.user.id);
  } else if (audience === 'EXAMINERS') {
    const examiners = await db.examinerProfile.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, isActive: true } } },
    });
    userIds = examiners.filter((e) => e.user.isActive).map((e) => e.user.id);
  }

  if (userIds.length === 0) return;

  // Create UserNotification records in batch
  await db.userNotification.createMany({
    data: userIds.map((userId) => ({
      userId,
      announcementId,
    })),
  });
}
