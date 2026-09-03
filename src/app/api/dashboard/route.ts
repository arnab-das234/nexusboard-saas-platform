import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dashboard?action=stats
// GET /api/dashboard?action=registration-trend
// GET /api/dashboard?action=recent-registrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return handleGetStats();
      case 'registration-trend':
        return handleGetRegistrationTrend();
      case 'recent-registrations':
        return handleGetRecentRegistrations();
      default:
        return Response.json({ success: false, error: 'Invalid action. Use: stats, registration-trend, recent-registrations' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleGetStats() {
  const activeStatuses = ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'SUBMISSION_OPEN', 'SUBMISSION_CLOSED', 'EVALUATION_IN_PROGRESS', 'RESULT_PENDING'];

  const [
    totalStudents,
    totalTeachers,
    totalExaminers,
    activeCompetitions,
    totalRegistrations,
    paidRegistrations,
    pendingPayments,
    totalRevenue,
    essaysSubmitted,
    essaysPendingEval,
    completedEvaluations,
    resultsPending,
    resultsPublished,
  ] = await Promise.all([
    db.studentProfile.count(),
    db.teacherProfile.count(),
    db.examinerProfile.count({ where: { isActive: true } }),
    db.competition.count({ where: { status: { in: activeStatuses } } }),
    db.registration.count(),
    db.registration.count({ where: { status: 'PAID' } }),
    db.payment.count({ where: { status: 'CREATED' } }),
    db.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    db.essaySubmission.count({ where: { status: { in: ['SUBMITTED', 'VALID', 'LOCKED', 'UNDER_EVALUATION', 'EVALUATED'] } } }),
    db.essaySubmission.count({ where: { status: { in: ['VALID', 'LOCKED', 'UNDER_EVALUATION'] } } }),
    db.examinerEvaluation.count({ where: { status: 'SUBMITTED' } }),
    db.result.count({ where: { status: 'PENDING' } }),
    db.result.count({ where: { status: 'PUBLISHED' } }),
  ]);

  return Response.json({
    success: true,
    data: {
      totalStudents,
      totalTeachers,
      totalExaminers,
      activeCompetitions,
      totalRegistrations,
      paidRegistrations,
      pendingPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      essaysSubmitted,
      essaysPendingEval,
      completedEvaluations,
      resultsPending,
      resultsPublished,
    },
  });
}

async function handleGetRegistrationTrend() {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Use Prisma ORM instead of raw SQL for cross-database compatibility
  const registrations = await db.registration.findMany({
    where: { registeredAt: { gte: twelveMonthsAgo } },
    select: { registeredAt: true },
  });

  // Fill in months with counts
  const trend: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const count = registrations.filter(r => r.registeredAt.toISOString().slice(0, 7) === monthStr).length;
    trend.push({ month: monthStr, count });
  }

  return Response.json({ success: true, data: trend });
}

async function handleGetRecentRegistrations() {
  const recentRegistrations = await db.registration.findMany({
    take: 10,
    orderBy: { registeredAt: 'desc' },
    include: {
      student: {
        include: { user: { select: { name: true, email: true } } },
      },
      competition: { select: { id: true, name: true } },
    },
  });

  const data = recentRegistrations.map((r) => ({
    id: r.id,
    registrationNo: r.registrationNo,
    studentName: r.student.user.name || r.student.user.email,
    competitionName: r.competition.name,
    status: r.status,
    registeredAt: r.registeredAt,
  }));

  return Response.json({ success: true, data });
}
