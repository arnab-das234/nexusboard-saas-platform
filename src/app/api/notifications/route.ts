import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?userId=...&page=...&pageSize=...
// GET /api/notifications?action=unread-count&userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    if (action === 'unread-count') {
      return handleGetUnreadCount(userId);
    }

    return handleGetNotifications(userId, searchParams);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleGetNotifications(userId: string, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const where = { userId };

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ]);

  return Response.json({
    success: true,
    data: notifications,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

async function handleGetUnreadCount(userId: string) {
  const count = await db.notification.count({
    where: { userId, isRead: false },
  });

  return Response.json({ success: true, data: { count } });
}

// PUT /api/notifications?action=mark-read
// PUT /api/notifications?action=mark-all-read
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'mark-read':
        return handleMarkRead(request);
      case 'mark-all-read':
        return handleMarkAllRead(request);
      default:
        return Response.json({ success: false, error: 'Invalid action. Use: mark-read, mark-all-read' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleMarkRead(request: NextRequest) {
  const body = await request.json() as { id?: string; userId?: string };
  const { id, userId } = body;

  if (!id || !userId) {
    return Response.json({ success: false, error: 'Notification ID and userId are required' }, { status: 400 });
  }

  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) {
    return Response.json({ success: false, error: 'Notification not found' }, { status: 404 });
  }

  if (notification.userId !== userId) {
    return Response.json({ success: false, error: 'Notification does not belong to this user' }, { status: 403 });
  }

  const updated = await db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  return Response.json({ success: true, data: updated });
}

async function handleMarkAllRead(request: NextRequest) {
  const body = await request.json() as { userId?: string };
  const { userId } = body;

  if (!userId) {
    return Response.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return Response.json({ success: true, data: { markedCount: result.count }, message: `${result.count} notifications marked as read` });
}
