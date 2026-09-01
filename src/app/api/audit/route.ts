import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/audit?userId=...&action=...&entityType=...&startDate=...&endDate=...&page=...&pageSize=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    if (startDate || endDate) {
      const createdAtFilter: Record<string, unknown> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate);
      if (endDate) createdAtFilter.lte = new Date(endDate);
      where.createdAt = createdAtFilter;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    const data = logs.map((log) => ({
      ...log,
      userName: log.user?.name || log.user?.email || null,
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
